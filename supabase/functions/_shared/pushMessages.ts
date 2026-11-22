// Müşteriye giden web push bildirimlerinin saf (yan etkisiz) içerikleri.
// Deno'ya özgü hiçbir şey kullanmaz; vitest ile test edilir (pushMessages.test.ts).
// Gönderme işi webPush.ts'te, gösterme işi src/sw.ts'te.
import { firstName, REVISIT_AFTER_DAYS } from './whatsappMessages.ts'

// src/sw.ts'in okuduğu bildirim içeriği
export interface PushPayload {
  title: string
  body: string
  // Aynı tag'li yeni bildirim öncekinin yerine geçer
  tag: string
  // Bildirime dokununca açılacak sayfa
  url: string
  requireInteraction: boolean
}

// Bildirime dokunan müşteri randevu sayfasına gider
export const BOOKING_URL = '/'
const REVISIT_TAG = 'revisit'

// Bakım daveti (whatsapp-reminders): son randevudan 20 gün sonra.
// Kibar dil (siz) ve "bakım" yerine yeniden ağırlama vurgusu (berberin isteği).
export function revisitPushPayload(customerName: string): PushPayload {
  const greeting = customerName.trim() ? `Merhaba ${firstName(customerName)}` : 'Merhaba'
  return {
    title: 'Sizi yeniden ağırlamak isteriz ✂️',
    body: `${greeting}, son randevunuzun üzerinden ${REVISIT_AFTER_DAYS} gün geçti. Yeni randevunuzu almak için dokunabilirsiniz.`,
    tag: REVISIT_TAG,
    url: BOOKING_URL,
    requireInteraction: false,
  }
}
