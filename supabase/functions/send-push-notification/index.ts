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
// HKDF (Web Crypto API): Extract + Expand tek adımda
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

  // Gönderen tarafı için geçici ECDH anahtar çifti
  const senderPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  )
  const senderPub = new Uint8Array(await crypto.subtle.exportKey('raw', senderPair.publicKey))

  // ECDH paylaşımlı sırrı türet
  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderPair.privateKey, 256),
  )

  // RFC 8291 §3.3: IKM türetimi
  const prk = await hkdf(
    authSecret,
    sharedSecret,
    concat(enc.encode('WebPush: info\x00'), receiverPub, senderPub),
    32,
  )

  // İçerik şifreleme anahtarı (CEK) ve nonce türetimi
  const cek   = await hkdf(salt, prk, enc.encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdf(salt, prk, enc.encode('Content-Encoding: nonce\x00'), 12)

  // AES-128-GCM şifreleme (padding delimiter 0x02 = son kayıt)
  const padded = concat(enc.encode(plaintext), new Uint8Array([0x02]))
  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded),
  )

  // RFC 8188 başlık: salt (16) + rs (4) + idlen (1) + senderPub (65)
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
      'TTL': '86400',
    },
    body,
  })
}

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

  const notificationPayload = JSON.stringify({
    title: 'Yeni Randevu 🗓',
    body: `${appointment.customer_name} · ${(appointment.appointment_time ?? '').slice(0, 5)}`,
    tag: `appt-${appointment.id}`,
  })

  const expiredEndpoints: string[] = []
  let sent = 0

  await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        const res = await sendWebPush({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          payload: notificationPayload,
          vapidPublicKey: VAPID_PUBLIC_KEY,
          vapidPrivateKey: VAPID_PRIVATE_KEY,
        })
        // 410 Gone veya 404: abonelik artık geçersiz → sil
        if (res.status === 410 || res.status === 404) {
          expiredEndpoints.push(sub.endpoint)
        } else {
          sent++
        }
      } catch {
        // Ağ hatası — sessizce geç
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
