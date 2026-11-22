// WhatsApp otomatik mesajlarının saf (yan etkisiz) kuralları.
// Deno'ya özgü hiçbir şey kullanmaz; böylece vitest ile test edilebilir
// (whatsappMessages.test.ts). Gönderme işi whatsappClient.ts'te.

// Meta'da onaylatılan şablon adları (Türkçe)
export const TEMPLATES = {
  // Utility: yarınki randevunun hatırlatması
  reminder: 'randevu_hatirlatma',
  // Marketing: son randevudan 20 gün sonra bakım daveti
  revisit: 'bakim_hatirlatma',
} as const

export type TemplateName = typeof TEMPLATES[keyof typeof TEMPLATES]

export const TEMPLATE_LANGUAGE = 'tr'

// Bakım daveti, son randevunun üzerinden bu kadar gün geçince gider
export const REVISIT_AFTER_DAYS = 20
// 21:00 işi birkaç gün çalışmazsa kaçan davetler bu kadar gün içinde telafi edilir.
// Daha eski müşterilere gitmez (sistem açıldığında toplu mesaj atılmasın).
export const REVISIT_CATCHUP_DAYS = 3

// Hatırlatma yalnızca bu durumdaki randevulara gider
export const ACTIVE_STATUSES = ['pending', 'confirmed'] as const
// Müşterinin geldiği (ya da gelecek olduğu) randevular; "gelmedi" sayılmaz
export const VISIT_STATUSES = ['pending', 'confirmed', 'completed'] as const

const TIME_ZONE = 'Europe/Istanbul'
const LOCALE = 'tr-TR'
const TURKEY_COUNTRY_CODE = '90'
const HH_MM_LENGTH = 5
const MS_PER_DAY = 86_400_000
// Kayıtta ad yoksa (Meta boş değişken kabul etmez)
const FALLBACK_FIRST_NAME = 'Değerli müşterimiz'

export interface ReminderAppointment {
  customer_name: string
  appointment_date: string
  appointment_time: string
}

export interface VisitRow {
  id: string
  customer_name: string
  customer_phone: string
  appointment_date: string
  status: string
  whatsapp_revisit_sent_at: string | null
}

// "0532 123 45 67" / "05321234567" / "+90 532..." → "905321234567"
export function toE164(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.startsWith(TURKEY_COUNTRY_CODE)) return digits
  if (digits.startsWith('0')) return TURKEY_COUNTRY_CODE + digits.slice(1)
  return TURKEY_COUNTRY_CODE + digits
}

// "+90 532 123 45 67" / "5321234567" → "05321234567" (sitenin ve veritabanının
// numara biçimi; bildirim abonelikleri bu biçimle aranır)
export function toLocalPhone(rawPhone: string): string {
  return '0' + toE164(rawPhone).slice(TURKEY_COUNTRY_CODE.length)
}

// "  işıl  YILMAZ" → "İşıl" (src/utils/formatName.ts ile aynı kural;
// Edge Function src/ klasörünü içe aktaramadığı için burada da var)
export function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  if (!first) return FALLBACK_FIRST_NAME
  return first.charAt(0).toLocaleUpperCase(LOCALE) + first.slice(1).toLocaleLowerCase(LOCALE)
}

// "2026-11-20" → "20 Kasım Cuma" (tarih saat dilimine göre kaymasın diye UTC öğlen üzerinden)
export function formatDateTr(date: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

// "14:30:00" → "14:30"
export function formatTimeTr(time: string): string {
  return time.slice(0, HH_MM_LENGTH)
}

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00Z`).getTime()
  return new Date(base + days * MS_PER_DAY).toISOString().slice(0, 10)
}

// Verilen andaki İstanbul tarihi, "YYYY-MM-DD"
export function istanbulDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

export function tomorrowInIstanbul(now: Date): string {
  return addDays(istanbulDate(now), 1)
}

// Davet adayları için okunacak en eski randevu tarihi
export function revisitWindowStart(today: string): string {
  return addDays(today, -(REVISIT_AFTER_DAYS + REVISIT_CATCHUP_DAYS))
}

// Bakım daveti gidecek müşteriler (müşteri başına en son randevusu döner):
// - en son randevusu bugünden 20–23 gün önceyse (ileri tarihli randevusu olan hariç)
// - o randevu için davet daha önce gönderilmediyse
// - yasağı sürmüyorsa
// rows: appointment_date >= revisitWindowStart(today) olan randevular
export function pickRevisitTargets(rows: VisitRow[], bannedPhones: string[], today: string): VisitRow[] {
  const visitStatuses: readonly string[] = VISIT_STATUSES
  const banned = new Set(bannedPhones.map(toE164))
  const latestByPhone = new Map<string, VisitRow>()

  for (const row of rows) {
    if (!visitStatuses.includes(row.status)) continue
    const phone = toE164(row.customer_phone)
    const current = latestByPhone.get(phone)
    if (!current || row.appointment_date > current.appointment_date) latestByPhone.set(phone, row)
  }

  const newest = addDays(today, -REVISIT_AFTER_DAYS)
  const oldest = revisitWindowStart(today)

  return [...latestByPhone.entries()]
    .filter(([phone, row]) =>
      row.appointment_date <= newest &&
      row.appointment_date >= oldest &&
      row.whatsapp_revisit_sent_at === null &&
      !banned.has(phone),
    )
    .map(([, row]) => row)
}

// Meta, şablon değişkenlerinde satır sonu ve art arda çok boşluk kabul etmez
function cleanParam(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// {{1}} ilk ad, {{2}} tarih, {{3}} saat
export function reminderParams(appointment: ReminderAppointment): string[] {
  return [
    firstName(appointment.customer_name),
    formatDateTr(appointment.appointment_date),
    formatTimeTr(appointment.appointment_time),
  ].map(cleanParam)
}

// {{1}} ilk ad
export function revisitParams(customerName: string): string[] {
  return [firstName(customerName)].map(cleanParam)
}

// WhatsApp Cloud API "template" mesaj gövdesi
export function buildTemplateBody(rawPhone: string, template: TemplateName, params: string[]) {
  return {
    messaging_product: 'whatsapp',
    to: toE164(rawPhone),
    type: 'template',
    template: {
      name: template,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        { type: 'body', parameters: params.map(text => ({ type: 'text', text })) },
      ],
    },
  }
}
