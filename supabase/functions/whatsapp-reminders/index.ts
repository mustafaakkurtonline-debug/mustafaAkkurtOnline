import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  istanbulDate,
  tomorrowInIstanbul,
  revisitWindowStart,
  pickRevisitTargets,
  reminderParams,
  revisitParams,
  ACTIVE_STATUSES,
  VISIT_STATUSES,
  TEMPLATES,
} from '../_shared/whatsappMessages.ts'
import type { VisitRow } from '../_shared/whatsappMessages.ts'
import { sendTemplate, logMessage, isAuthorized, json } from '../_shared/whatsappClient.ts'
import type { SendResult } from '../_shared/whatsappClient.ts'

// Bakım daveti, "bakim_hatirlatma" şablonu Meta'da onaylanınca bu secret
// "true" yapılarak açılır; o zamana kadar yalnızca hatırlatma gider.
const REVISIT_ENABLED_SECRET = 'WHATSAPP_REVISIT_ENABLED'

// Test modunda gönderilen örnekler (veritabanına dokunulmaz)
const TEST_NAME = 'Test'
const TEST_TIME = '10:00:00'

interface ReminderRow {
  id: string
  customer_name: string
  customer_phone: string
  appointment_date: string
  appointment_time: string
}

interface Tally {
  sent: number
  failed: number
}

// ---------------------------------------------------------------------------
// cron-job.org her gün 21:00 (Europe/Istanbul) tetikler:
// 1. Yarınki aktif randevulara "randevu_hatirlatma"
// 2. Son randevusunun üzerinden 20 gün geçen müşterilere "bakim_hatirlatma"
//    (yalnızca WHATSAPP_REVISIT_ENABLED=true ise)
// Gönderilenler işaretlenir; iş tekrar çalışırsa aynı mesaj ikinci kez gitmez.
//
// Test: ?test_phone=05XXXXXXXXX → yalnızca o numaraya örnek mesaj(lar).
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 })

  const now = new Date()
  const revisitEnabled = Deno.env.get(REVISIT_ENABLED_SECRET) === 'true'
  const testPhone = new URL(req.url).searchParams.get('test_phone')
  if (testPhone) return sendTestMessages(testPhone, now, revisitEnabled)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const reminders = await sendReminders(supabase, now)
    const revisits = revisitEnabled ? await sendRevisits(supabase, now) : 'disabled'
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
  const targets = pickRevisitTargets((visits.data ?? []) as VisitRow[], bannedPhones, today)

  const tally: Tally = { sent: 0, failed: 0 }
  for (const row of targets) {
    const result = await sendTemplate(row.customer_phone, TEMPLATES.revisit, revisitParams(row.customer_name))
    await logMessage(supabase, { appointmentId: row.id, kind: 'revisit', customerPhone: row.customer_phone, result })

    if (result.ok) {
      tally.sent++
      await supabase.from('appointments').update({ whatsapp_revisit_sent_at: new Date().toISOString() }).eq('id', row.id)
    } else {
      tally.failed++
    }
  }
  return tally
}
