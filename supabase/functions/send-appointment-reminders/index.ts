import { createClient } from 'jsr:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Yardımcı: Base64url ↔ Uint8Array dönüşümleri
// ---------------------------------------------------------------------------
function b64uDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + (4 - (s.length % 4)) % 4, '=')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function b64uEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) { out.set(p, offset); offset += p.length }
  return out
}

const enc = new TextEncoder()

// ---------------------------------------------------------------------------
// HKDF (Web Crypto API)
// ---------------------------------------------------------------------------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const km = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, km, len * 8),
  )
}

// ---------------------------------------------------------------------------
// VAPID JWT imzalama (ES256 / ECDSA P-256)
// ---------------------------------------------------------------------------
async function signVapidJwt(audience: string, pubKeyB64u: string, privKeyB64u: string): Promise<string> {
  const pub = b64uDecode(pubKeyB64u)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: privKeyB64u,
    x: b64uEncode(pub.slice(1, 33)),
    y: b64uEncode(pub.slice(33, 65)),
  }
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  )

  const header  = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = b64uEncode(enc.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: 'mailto:ilkayremedya@gmail.com',
  })))

  const sigInput = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(sigInput),
  )
  return `${sigInput}.${b64uEncode(new Uint8Array(sig))}`
}

// ---------------------------------------------------------------------------
// RFC 8291: Web Push payload şifreleme (aes128gcm content-encoding)
// ---------------------------------------------------------------------------
async function encryptPayload(
  plaintext: string,
  p256dhB64u: string,
  authB64u: string,
): Promise<{ body: Uint8Array }> {
  const receiverPub = b64uDecode(p256dhB64u)
  const authSecret  = b64uDecode(authB64u)
  const salt        = crypto.getRandomValues(new Uint8Array(16))

  const senderPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  )
  const senderPub = new Uint8Array(await crypto.subtle.exportKey('raw', senderPair.publicKey))

  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderPair.privateKey, 256),
  )

  const prk = await hkdf(
    authSecret,
    sharedSecret,
    concat(enc.encode('WebPush: info\x00'), receiverPub, senderPub),
    32,
  )

  const cek   = await hkdf(salt, prk, enc.encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdf(salt, prk, enc.encode('Content-Encoding: nonce\x00'), 12)

  const padded = concat(enc.encode(plaintext), new Uint8Array([0x02]))
  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded),
  )

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096, false)

  const body = concat(salt, rs, new Uint8Array([senderPub.length]), senderPub, ciphertext)
  return { body }
}

// ---------------------------------------------------------------------------
// Web Push HTTP isteği gönder
// ---------------------------------------------------------------------------
async function sendWebPush(opts: {
  endpoint: string
  p256dh: string
  auth: string
  payload: string
  vapidPublicKey: string
  vapidPrivateKey: string
}): Promise<Response> {
  const { endpoint, p256dh, auth, payload, vapidPublicKey, vapidPrivateKey } = opts

  const audience = new URL(endpoint).origin
  const jwt = await signVapidJwt(audience, vapidPublicKey, vapidPrivateKey)
  const { body } = await encryptPayload(payload, p256dh, auth)

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '3600',
    },
    body,
  })
}

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
      })

      try {
        const res = await sendWebPush({
          endpoint: reminder.endpoint,
          p256dh: reminder.p256dh,
          auth: reminder.auth,
          payload: notificationPayload,
          vapidPublicKey: VAPID_PUBLIC_KEY,
          vapidPrivateKey: VAPID_PRIVATE_KEY,
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
