import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendWebPush } from '../_shared/webPush.ts'

// "1 saat kaldı" bildirimi 1 saatten sonra anlamını yitirir
const REMINDER_PUSH_TTL_SECONDS = 3600

// ---------------------------------------------------------------------------
// Edge Function giriş noktası — cron-job.org her 5 dakikada tetikler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Türkiye UTC+3 — randevu saatleri Turkey time olarak saklanır.
  // Hedefe 55-65 dakika kalan randevuları bul:
  //   Turkey appointment time = UTC appointment time + 3h
  //   UTC appointment time ∈ [now + 55min, now + 65min]
  //   → Turkey appointment time ∈ [now_UTC + 3h + 55min, now_UTC + 3h + 65min]
  const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000
  const nowMs = Date.now()
  const windowStartTR = new Date(nowMs + TURKEY_OFFSET_MS + 55 * 60 * 1000)
  const windowEndTR   = new Date(nowMs + TURKEY_OFFSET_MS + 65 * 60 * 1000)

  const startDate = windowStartTR.toISOString().slice(0, 10)
  const startTime = windowStartTR.toISOString().slice(11, 19)
  const endDate   = windowEndTR.toISOString().slice(0, 10)
  const endTime   = windowEndTR.toISOString().slice(11, 19)

  // Henüz gönderilmemiş hatırlatmaları ve randevu bilgilerini çek
  const { data: reminders } = await supabaseClient
    .from('appointment_reminders')
    .select('id, endpoint, p256dh, auth, appointments!inner(appointment_date, appointment_time)')
    .eq('reminder_sent', false)

  if (!reminders?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Zaman penceresine uyan hatırlatmaları filtrele (JS tarafında)
  type ReminderRow = {
    id: string
    endpoint: string
    p256dh: string
    auth: string
    appointments: { appointment_date: string; appointment_time: string }
  }

  const toSend = (reminders as ReminderRow[]).filter((r) => {
    const apptDate = r.appointments.appointment_date
    const apptTime = r.appointments.appointment_time.slice(0, 8)

    if (startDate === endDate) {
      return apptDate === startDate && apptTime >= startTime && apptTime <= endTime
    }
    // Gece yarısı geçişi (son derece nadir)
    return (apptDate === startDate && apptTime >= startTime) ||
           (apptDate === endDate && apptTime <= endTime)
  })

  if (!toSend.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

  const sentIds: string[] = []

  await Promise.allSettled(
    toSend.map(async (reminder) => {
      const timeDisplay = reminder.appointments.appointment_time.slice(0, 5)

      const notificationPayload = JSON.stringify({
        title: 'Randevunuza 1 Saat Kaldı! ✂️',
        body: `Saat ${timeDisplay}'daki randevunuzu unutmayın.`,
        tag: `reminder-${reminder.id}`,
        // Müşteri bildirimi: dokununca admin paneli değil randevu sayfası açılır (src/sw.ts)
        url: '/',
        requireInteraction: false,
      })

      try {
        const res = await sendWebPush({
          endpoint: reminder.endpoint,
          p256dh: reminder.p256dh,
          auth: reminder.auth,
          payload: notificationPayload,
          vapidPublicKey: VAPID_PUBLIC_KEY,
          vapidPrivateKey: VAPID_PRIVATE_KEY,
          ttlSeconds: REMINDER_PUSH_TTL_SECONDS,
        })
        // Başarılı veya süresi dolmuş (410/404) → her ikisinde de sent olarak işaretle
        if (res.status < 400 || res.status === 410 || res.status === 404) {
          sentIds.push(reminder.id)
        }
      } catch {
        // Ağ hatası — bir sonraki cron çalışmasında tekrar denenecek
      }
    }),
  )

  if (sentIds.length) {
    await supabaseClient
      .from('appointment_reminders')
      .update({ reminder_sent: true })
      .in('id', sentIds)
  }

  return new Response(
    JSON.stringify({ sent: sentIds.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
