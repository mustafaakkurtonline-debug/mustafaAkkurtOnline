// Müşteriye giden web push bildirimlerinin saf (yan etkisiz) içerikleri.
// Deno'ya özgü hiçbir şey kullanmaz; vitest ile test edilir (pushMessages.test.ts).
// Gönderme işi webPush.ts'te, gösterme işi src/sw.ts'te (satır sonları korunur).
import { firstName, formatDateTr, formatTimeTr, REVISIT_AFTER_DAYS } from './whatsappMessages.ts'

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

// Bildirimin kimden geldiği başlıkta görünür
export const BRAND_TITLE = '✂️ Mustafa Akkurt Kuaför'

// Bildirime dokunan müşteri randevu sayfasına gider
export const BOOKING_URL = '/'
const REVISIT_TAG = 'revisit'
const REMINDER_TAG_PREFIX = 'reminder-'

export interface ReminderAppointment {
  id: string
  customer_name: string
  appointment_date: string
  appointment_time: string
}

function greeting(customerName: string): string {
  const name = firstName(customerName)
  return name ? `Merhaba ${name},` : 'Merhaba,'
}

// Yarınki randevunun hatırlatması (whatsapp-reminders, her akşam 21:00)
export function reminderPushPayload(appointment: ReminderAppointment): PushPayload {
  return {
    title: BRAND_TITLE,
    body: [
      `${greeting(appointment.customer_name)} randevunuzu hatırlatmak isteriz.`,
      `📅 Yarın, ${formatDateTr(appointment.appointment_date)}`,
      `🕒 Saat ${formatTimeTr(appointment.appointment_time)}`,
      'Sizi ağırlamaktan mutluluk duyarız.',
    ].join('\n'),
    // Aynı gün iki randevusu olan müşterinin bildirimleri birbirini silmesin
    tag: `${REMINDER_TAG_PREFIX}${appointment.id}`,
    url: BOOKING_URL,
    requireInteraction: false,
  }
}

// Davet (whatsapp-reminders): son randevudan 20 gün sonra.
// Kibar dil (siz); müşteriye "bakım" kelimesi geçmez (berberin isteği).
export function revisitPushPayload(customerName: string): PushPayload {
  return {
    title: BRAND_TITLE,
    body: [
      `${greeting(customerName)} tarzınızı her zaman özenli tutmak için küçük bir hatırlatma.`,
      `Son randevunuzun üzerinden ${REVISIT_AFTER_DAYS} gün geçti; sizi yeniden ağırlamaktan mutluluk duyarız.`,
      '👉 Yeni randevunuz için dokunun.',
    ].join('\n'),
    tag: REVISIT_TAG,
    url: BOOKING_URL,
    requireInteraction: false,
  }
}
