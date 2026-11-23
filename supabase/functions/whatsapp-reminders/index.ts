import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  istanbulDate,
  tomorrowInIstanbul,
  revisitWindowStart,
  pickRevisitTargets,
  toE164,
  toLocalPhone,
  ACTIVE_STATUSES,
  VISIT_STATUSES,
} from '../_shared/whatsappMessages.ts'
import type { VisitRow } from '../_shared/whatsappMessages.ts'
import { reminderPushPayload, revisitPushPayload } from '../_shared/pushMessages.ts'
import type { PushPayload, ReminderAppointment } from '../_shared/pushMessages.ts'
import { pushToSubscriptions } from '../_shared/webPush.ts'
import type { PushDelivery, PushSubscriptionKeys } from '../_shared/webPush.ts'
import { logMessage, isAuthorized, json } from '../_shared/whatsappClient.ts'
import type { MessageKind, SendResult } from '../_shared/whatsappClient.ts'

// 21:00'de gönderilen bildirim, telefon o an kapalıysa ertesi sabaha kadar teslim edilebilir
const PUSH_TTL_SECONDS = 43_200

// Test modunda gönderilen örnekler (veritabanına dokunulmaz)
const TEST_NAME = 'Test'
const TEST_TIME = '10:00:00'

interface ReminderRow extends ReminderAppointment {
  customer_phone: string
}

interface SubscriptionRow extends PushSubscriptionKeys {
  customer_phone: string
}

interface Tally {
  // Bildirimi en az bir cihazına ulaşan müşteri
  push: number
  // Cihazı var ama bildirim hiçbirine ulaşmadı
  failed: number
  // Bildirimleri açık değil (kayıtlı cihazı yok)
  skipped: number
}

// Bir randevu için gönderilecek bildirim
interface PushJob {
  appointmentId: string
  customerPhone: string
  kind: MessageKind
  payload: PushPayload
}

// ---------------------------------------------------------------------------
// Supabase Cron her gün 21:00 (Europe/Istanbul) çağırır (migration 020).
// Yalnızca bildirimi açmış müşterilere (customer_push_subscriptions) gider:
// 1. Yarınki aktif randevulara hatırlatma bildirimi
// 2. Son randevusunun üzerinden 20 gün geçen müşterilere davet bildirimi
// Gönderilenler işaretlenir; iş tekrar çalışırsa aynı bildirim ikinci kez gitmez.
// (Fonksiyon adı WhatsApp döneminden kalma; WhatsApp iptal edildi.)
//
// Test: ?test_phone=05XXXXXXXXX → yalnızca o numaranın cihazlarına örnek
//       hatırlatma ve davet bildirimi; hiçbir kayıt yazılmaz.
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  const now = new Date()
  const testPhone = new URL(req.url).searchParams.get('test_phone')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    if (testPhone) return await sendTestPushes(supabase, testPhone, now)

    const reminders = await sendReminders(supabase, now)
    const revisits = await sendRevisits(supabase, now)
    return json({ reminders, revisits })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

// Süresi dolmuş abonelik de silinmez: test hiçbir kayda dokunmaz
async function sendTestPushes(supabase: SupabaseClient, phone: string, now: Date): Promise<Response> {
  const devicesByPhone = await loadPushSubscriptions(supabase, [phone])
  const devices = devicesByPhone.get(toE164(phone)) ?? []
  if (devices.length === 0) {
    return json({ test: true, push: 'Bu numaraya kayıtlı bildirim aboneliği yok' }, 404)
  }

  const sample: ReminderAppointment = {
    id: 'test',
    customer_name: TEST_NAME,
    appointment_date: tomorrowInIstanbul(now),
    appointment_time: TEST_TIME,
  }
  const reminder = await pushToSubscriptions(devices, JSON.stringify(reminderPushPayload(sample)), PUSH_TTL_SECONDS)
  const revisit = await pushToSubscriptions(devices, JSON.stringify(revisitPushPayload(TEST_NAME)), PUSH_TTL_SECONDS)
  const ok = reminder.delivered > 0 && revisit.delivered > 0
  return json({ test: true, devices: devices.length, reminder, revisit }, ok ? 200 : 502)
}

async function sendReminders(supabase: SupabaseClient, now: Date): Promise<Tally> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, customer_name, customer_phone, appointment_date, appointment_time')
    .eq('appointment_date', tomorrowInIstanbul(now))
    .in('status', [...ACTIVE_STATUSES])
    .is('whatsapp_reminder_sent_at', null)
    .order('appointment_time')
  if (error) throw new Error(`Hatırlatma listesi okunamadı: ${error.message}`)

  const jobs = ((data ?? []) as ReminderRow[]).map((row): PushJob => ({
    appointmentId: row.id,
    customerPhone: row.customer_phone,
    kind: 'reminder',
    payload: reminderPushPayload(row),
  }))
  // Sütun adı WhatsApp döneminden kalma: "hatırlatma gönderildi"
  return sendPushJobs(supabase, jobs, 'whatsapp_reminder_sent_at')
}

// Davet: son randevudan 20 gün sonra. Gönderilemeyen davet işaretlenmez;
// telafi süresi içinde ertesi gün yeniden denenir.
async function sendRevisits(supabase: SupabaseClient, now: Date): Promise<Tally> {
  const today = istanbulDate(now)

  const [visits, bans] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, customer_name, customer_phone, appointment_date, status, whatsapp_revisit_sent_at')
      .gte('appointment_date', revisitWindowStart(today))
      .in('status', [...VISIT_STATUSES]),
    supabase
      .from('banned_customers')
      .select('customer_phone')
      .gte('banned_until', today),
  ])
  if (visits.error) throw new Error(`Davet listesi okunamadı: ${visits.error.message}`)
  if (bans.error) throw new Error(`Yasaklı listesi okunamadı: ${bans.error.message}`)

  const bannedPhones = (bans.data ?? []).map((ban: { customer_phone: string }) => ban.customer_phone)
  const jobs = pickRevisitTargets((visits.data ?? []) as VisitRow[], bannedPhones, today).map((row): PushJob => ({
    appointmentId: row.id,
    customerPhone: row.customer_phone,
    kind: 'revisit',
    payload: revisitPushPayload(row.customer_name),
  }))
  // Sütun adı WhatsApp döneminden kalma: "davet gönderildi"
  return sendPushJobs(supabase, jobs, 'whatsapp_revisit_sent_at')
}

// Her bildirimi müşterinin bütün cihazlarına gönderir, kaydeder ve en az bir
// cihaza ulaştıysa randevuyu işaretler. Cihazı olmayan müşteri atlanır.
async function sendPushJobs(
  supabase: SupabaseClient,
  jobs: PushJob[],
  sentColumn: 'whatsapp_reminder_sent_at' | 'whatsapp_revisit_sent_at',
): Promise<Tally> {
  const devicesByPhone = await loadPushSubscriptions(supabase, jobs.map(job => job.customerPhone))
  const tally: Tally = { push: 0, failed: 0, skipped: 0 }
  const expiredEndpoints: string[] = []

  for (const job of jobs) {
    const devices = devicesByPhone.get(toE164(job.customerPhone)) ?? []
    if (devices.length === 0) {
      tally.skipped++
      continue
    }

    const delivery = await pushToSubscriptions(devices, JSON.stringify(job.payload), PUSH_TTL_SECONDS)
    expiredEndpoints.push(...delivery.expiredEndpoints)
    await logMessage(supabase, {
      appointmentId: job.appointmentId,
      kind: job.kind,
      customerPhone: job.customerPhone,
      result: toSendResult(delivery),
    })

    if (delivery.delivered > 0) {
      tally.push++
      await supabase.from('appointments').update({ [sentColumn]: new Date().toISOString() }).eq('id', job.appointmentId)
    } else {
      tally.failed++
    }
  }

  await deleteExpiredSubscriptions(supabase, expiredEndpoints)
  return tally
}

// Numaraların bildirim abonelikleri, uluslararası numaraya (toE164) göre gruplu
async function loadPushSubscriptions(
  supabase: SupabaseClient,
  phones: string[],
): Promise<Map<string, PushSubscriptionKeys[]>> {
  const byPhone = new Map<string, PushSubscriptionKeys[]>()
  if (phones.length === 0) return byPhone

  const { data, error } = await supabase
    .from('customer_push_subscriptions')
    .select('customer_phone, endpoint, p256dh, auth')
    .in('customer_phone', [...new Set(phones.map(toLocalPhone))])
  if (error) throw new Error(`Bildirim abonelikleri okunamadı: ${error.message}`)

  for (const { customer_phone, endpoint, p256dh, auth } of (data ?? []) as SubscriptionRow[]) {
    const phone = toE164(customer_phone)
    byPhone.set(phone, [...(byPhone.get(phone) ?? []), { endpoint, p256dh, auth }])
  }
  return byPhone
}

function toSendResult({ delivered, failed, expiredEndpoints }: PushDelivery): SendResult {
  if (delivered > 0) return { ok: true, error: null }
  return {
    ok: false,
    error: `Bildirim hiçbir cihaza ulaşmadı (hata: ${failed}, süresi dolmuş: ${expiredEndpoints.length})`,
  }
}

// Push servisinin geçersiz dediği cihaz, bağlı olduğu bütün numaralardan silinir
async function deleteExpiredSubscriptions(supabase: SupabaseClient, endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return
  await supabase.from('customer_push_subscriptions').delete().in('endpoint', [...new Set(endpoints)])
}
