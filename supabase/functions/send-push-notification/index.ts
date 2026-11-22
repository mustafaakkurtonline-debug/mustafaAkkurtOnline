import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendWebPush } from '../_shared/webPush.ts'

// Telefon o an çevrim dışıysa push servisi bildirimi 1 gün saklar
const ADMIN_PUSH_TTL_SECONDS = 86400

// ---------------------------------------------------------------------------
// Edge Function giriş noktası
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // Supabase webhook secret doğrulaması
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${webhookSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const body = await req.json() as { record: Record<string, string> }
  const appointment = body.record

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

  // "2026-07-15" → "15 Temmuz Salı" (gün adı dahil)
  const dateLabel = appointment.appointment_date
    ? new Date(`${appointment.appointment_date}T00:00:00`).toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : ''
  const timeLabel = (appointment.appointment_time ?? '').slice(0, 5)

  const notificationPayload = JSON.stringify({
    title: 'Yeni Randevu 🗓',
    body: `${appointment.customer_name}\n${dateLabel} · saat ${timeLabel}`,
    tag: `appt-${appointment.id}`,
  })

  const expiredEndpoints: string[] = []
  let sent = 0

  await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      const tag = sub.endpoint.slice(-30)
      try {
        const res = await sendWebPush({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          payload: notificationPayload,
          vapidPublicKey: VAPID_PUBLIC_KEY,
          vapidPrivateKey: VAPID_PRIVATE_KEY,
          ttlSeconds: ADMIN_PUSH_TTL_SECONDS,
        })
        if (res.status === 410 || res.status === 404) {
          console.warn(`push expired [${tag}] status=${res.status}`)
          expiredEndpoints.push(sub.endpoint)
        } else if (res.status >= 400) {
          const body = await res.text().catch(() => '')
          console.error(`push failed [${tag}] status=${res.status} body=${body}`)
        } else {
          console.log(`push ok [${tag}] status=${res.status}`)
          sent++
        }
      } catch (err) {
        console.error(`push error [${tag}]`, err)
      }
    }),
  )

  if (expiredEndpoints.length) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  return new Response(
    JSON.stringify({ sent, expired: expiredEndpoints.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
