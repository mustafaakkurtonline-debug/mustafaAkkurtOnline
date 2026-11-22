import { waitForServiceWorker } from '@/utils/serviceWorker'

// Bir cihazın web push aboneliği; Edge Function'lar bu bilgilerle bildirim gönderir
export interface PushKeys {
  endpoint: string
  p256dh: string
  auth: string
}

// Ortam değişkenindeki base64url VAPID anahtarı → subscribe() için bayt dizisi
export function vapidKeyToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf
}

export function readVapidPublicKey(): string | undefined {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
}

// iOS'ta web push yalnızca ana ekrana eklenmiş (standalone) uygulamada çalışır;
// Safari sekmesinde PushManager hiç tanımlı olmaz. iPadOS kendini Mac gibi tanıtır.
export function isIosBrowserTab(): boolean {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIos) return false
  return !window.matchMedia('(display-mode: standalone)').matches
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keysEqual(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (a === null) return false
  const av = new Uint8Array(a)
  if (av.length !== b.length) return false
  return av.every((v, i) => v === b[i])
}

// Bu cihazın aboneliğini döndürür; yoksa ya da farklı (eski) VAPID anahtarıyla
// yapılmışsa (o abonelik push alamaz) yenisini oluşturur. Bildirim izni
// verilmiş olmalıdır; kendi içinde izin istemez.
export async function getOrCreatePushSubscription(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await waitForServiceWorker()
  const applicationServerKey = vapidKeyToUint8Array(vapidPublicKey)
  const existing = await registration.pushManager.getSubscription()

  if (existing) {
    if (keysEqual(existing.options.applicationServerKey, applicationServerKey)) return existing
    await existing.unsubscribe()
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
  })
}

// Abonelikten kaydedilecek alanlar; tarayıcı eksik verirse null
export function toPushKeys(subscription: PushSubscription): PushKeys | null {
  const json = subscription.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return null
  return { endpoint, p256dh, auth }
}
