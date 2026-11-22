import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  istanbulDate,
  tomorrowInIstanbul,
  revisitWindowStart,
  pickRevisitTargets,
  reminderParams,
  revisitParams,
  toE164,
  toLocalPhone,
  ACTIVE_STATUSES,
  VISIT_STATUSES,
  TEMPLATES,
} from '../_shared/whatsappMessages.ts'
import type { VisitRow } from '../_shared/whatsappMessages.ts'
import { revisitPushPayload } from '../_shared/pushMessages.ts'
import { pushToSubscriptions } from '../_shared/webPush.ts'
import type { PushDelivery, PushSubscriptionKeys } from '../_shared/webPush.ts'
import { sendTemplate, logMessage, isAuthorized, isWhatsAppConfigured, json } from '../_shared/whatsappClient.ts'
import type { SendResult } from '../_shared/whatsappClient.ts'

// Bildirim aboneliği olmayan müşterilere bakım davetinin WhatsApp ile gitmesi:
// "bakim_hatirlatma" şablonu Meta'da onaylanınca bu secret "true" yapılarak açılır.
// Bildirimle (web push, ücretsiz) giden davet bu secret'tan bağımsızdır.
const REVISIT_ENABLED_SECRET = 'WHATSAPP_REVISIT_ENABLED'

// 21:00'de gönderilen davet, telefon o an kapalıysa ertesi sabaha kadar teslim edilebilir
const REVISIT_PUSH_TTL_SECONDS = 43_200

// Test modunda gönderilen örnekler (veritabanına dokunulmaz)
const TEST_NAME = 'Test'
const TEST_TIME = '10:00:00'
// ?channel=push: yalnızca örnek davet bildirimi (WhatsApp gönderilmez)
const TEST_CHANNEL_PUSH = 'push'

const PUSH_SENT: SendResult = { ok: true, messageId: null, error: null }

interface ReminderRow {
  id: string
  customer_name: string
  customer_phone: string
  appointment_date: string
  appointment_time: string
}

interface SubscriptionRow extends PushSubscriptionKeys {
  customer_phone: string
}

interface Tally {
  sent: number
  failed: number
}

interface RevisitTally {
  // Ücretsiz bildirimle gönderilen
  push: number
  // WhatsApp şablonuyla gönderilen
  whatsapp: number
  failed: number
  // Bildirim aboneliği yok ve WhatsApp daveti kapalı
  skipped: number
}

// ---------------------------------------------------------------------------
// cron-job.org her gün 21:00 (Europe/Istanbul) tetikler:
// 1. Yarınki aktif randevulara WhatsApp "randevu_hatirlatma"
// 2. Son randevusunun üzerinden 20 gün geçen müşterilere bakım daveti:
//    bildirim aboneliği varsa web push (ücretsiz); yoksa, WHATSAPP_REVISIT_ENABLED=true
//    ise WhatsApp "bakim_hatirlatma"
// Gönderilenler işaretlenir; iş tekrar çalışırsa aynı mesaj ikinci kez gitmez.
// WhatsApp hesabı bağlı değilse (WHATSAPP_TOKEN yok) WhatsApp adımları atlanır.
//
// Test: ?test_phone=05XXXXXXXXX → yalnızca o numaraya örnek WhatsApp mesaj(lar)ı.
//       ?test_phone=05XXXXXXXXX&channel=push → yalnızca o numaranın cihazlarına
//       örnek davet bildirimi.
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  const now = new Date()
  const whatsappConfigured = isWhatsAppConfigured()
  const whatsappRevisitEnabled = whatsappConfigured && Deno.env.get(REVISIT_ENABLED_SECRET) === 'true'
  const params = new URL(req.url).searchParams
  const testPhone = params.get('test_phone')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    if (testPhone) {
      return params.get('channel') === TEST_CHANNEL_PUSH
        ? await sendTestPush(supabase, testPhone)
        : await sendTestMessages(testPhone, now, whatsappRevisitEnabled)
    }

    const reminders = whatsappConfigured ? await sendReminders(supabase, now) : 'whatsapp_not_configured'
    const revisits = await sendRevisits(supabase, now, whatsappRevisitEnabled)
    return json({ reminders, revisits })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

async function sendTestMessages(phone: string, now: Date, revisitEnabled: boolean): Promise<Response> {
  const reminder = await sendTemplate(phone, TEMPLATES.reminder, reminderParams({
    customer_name: TEST_NAME,
    appointment_date: tomorrowInIstanbul(now),
    appointment_time: TEST_TIME,
  }))
  if (!revisitEnabled) {
    return json({ test: true, reminder: summarize(reminder), revisit: 'disabled' }, reminder.ok ? 200 : 502)
  }

  const revisit = await sendTemplate(phone, TEMPLATES.revisit, revisitParams(TEST_NAME))
  const ok = reminder.ok && revisit.ok
  return json({ test: true, reminder: summarize(reminder), revisit: summarize(revisit) }, ok ? 200 : 502)
}

// Süresi dolmuş abonelik de silinmez: test hiçbir kayda dokunmaz
async function sendTestPush(supabase: SupabaseClient, phone: string): Promise<Response> {
  const devicesByPhone = await loadPushSubscriptions(supabase, [phone])
  const devices = devicesByPhone.get(toE164(phone)) ?? []
  if (devices.length === 0) {
    return json({ test: true, push: 'Bu numaraya kayıtlı bildirim aboneliği yok' }, 404)
  }

  const delivery = await pushToSubscriptions(devices, JSON.stringify(revisitPushPayload(TEST_NAME)), REVISIT_PUSH_TTL_SECONDS)
  return json({ test: true, devices: devices.length, push: delivery }, delivery.delivered > 0 ? 200 : 502)
}

function summarize({ ok, error }: SendResult): { ok: boolean; error: string | null } {
  return { ok, error }
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

  const tally: Tally = { sent: 0, failed: 0 }
  for (const row of (data ?? []) as ReminderRow[]) {
    const result = await sendTemplate(row.customer_phone, TEMPLATES.reminder, reminderParams(row))
    await logMessage(supabase, { appointmentId: row.id, kind: 'reminder', customerPhone: row.customer_phone, result })

    if (result.ok) {
      tally.sent++
      await supabase.from('appointments').update({ whatsapp_reminder_sent_at: new Date().toISOString() }).eq('id', row.id)
    } else {
      tally.failed++
    }
  }
  return tally
}

// Bakım daveti: bildirim aboneliği olana ücretsiz bildirim; aboneliği olmayana
// ya da bildirimi hiçbir cihazına ulaşmayana, WhatsApp açıksa şablon mesajı.
// Gönderilemeyen davet işaretlenmez; telafi süresi içinde ertesi gün yeniden denenir.
async function sendRevisits(supabase: SupabaseClient, now: Date, whatsappEnabled: boolean): Promise<RevisitTally> {
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
  const targets = pickRevisitTargets((visits.data ?? []) as VisitRow[], bannedPhones, today)
  const devicesByPhone = await loadPushSubscriptions(supabase, targets.map(row => row.customer_phone))

  const tally: RevisitTally = { push: 0, whatsapp: 0, failed: 0, skipped: 0 }
  const expiredEndpoints: string[] = []

  for (const row of targets) {
    const devices = devicesByPhone.get(toE164(row.customer_phone)) ?? []

    if (devices.length > 0) {
      const delivery = await pushToSubscriptions(
        devices,
        JSON.stringify(revisitPushPayload(row.customer_name)),
        REVISIT_PUSH_TTL_SECONDS,
      )
      expiredEndpoints.push(...delivery.expiredEndpoints)
      await logMessage(supabase, {
        appointmentId: row.id,
        kind: 'revisit',
        channel: 'push',
        customerPhone: row.customer_phone,
        result: toSendResult(delivery),
      })
      if (delivery.delivered > 0) {
        tally.push++
        await markRevisitSent(supabase, row.id)
        continue
      }
    }

    if (!whatsappEnabled) {
      if (devices.length > 0) tally.failed++
      else tally.skipped++
      continue
    }

    const result = await sendTemplate(row.customer_phone, TEMPLATES.revisit, revisitParams(row.customer_name))
    await logMessage(supabase, { appointmentId: row.id, kind: 'revisit', channel: 'whatsapp', customerPhone: row.customer_phone, result })

    if (result.ok) {
      tally.whatsapp++
      await markRevisitSent(supabase, row.id)
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
  if (delivered > 0) return PUSH_SENT
  return {
    ok: false,
    messageId: null,
    error: `Bildirim hiçbir cihaza ulaşmadı (hata: ${failed}, süresi dolmuş: ${expiredEndpoints.length})`,
  }
}

// Kanal fark etmeksizin "davet gönderildi" işareti (sütun adı WhatsApp döneminden kalma)
async function markRevisitSent(supabase: SupabaseClient, appointmentId: string): Promise<void> {
  await supabase.from('appointments').update({ whatsapp_revisit_sent_at: new Date().toISOString() }).eq('id', appointmentId)
}

// Push servisinin geçersiz dediği cihaz, bağlı olduğu bütün numaralardan silinir
async function deleteExpiredSubscriptions(supabase: SupabaseClient, endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return
  await supabase.from('customer_push_subscriptions').delete().in('endpoint', [...new Set(endpoints)])
}
