import { formatDateLong, formatTime, addDays } from './dateUtils'

function normalizeToE164(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return '90' + digits.slice(1)
  return '90' + digits
}

export function buildWhatsAppUrl(rawPhone: string, message: string): string {
  const phone = normalizeToE164(rawPhone)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

interface ConfirmParams {
  customerName: string
  date: string
  time: string
  serviceName: string
}

export function buildConfirmationMessage({ customerName, date, time, serviceName }: ConfirmParams): string {
  return [
    `Merhaba ${customerName} 👋`,
    '',
    'Randevunuz başarıyla oluşturuldu.',
    '',
    `📅 Tarih: ${formatDateLong(date)}`,
    `⏰ Saat: ${formatTime(time)}`,
    `✂️ Hizmet: ${serviceName}`,
    '',
    "Mustafa Akkurt Berberi'nde görüşmek üzere!",
  ].join('\n')
}

interface NoShowParams {
  customerName: string
  date: string
  time: string
}

export function buildNoShowMessage({ customerName, date, time }: NoShowParams): string {
  const banUntil = formatDateLong(addDays(date, 14))
  return [
    `Merhaba ${customerName},`,
    '',
    `${formatDateLong(date)} tarihli ${formatTime(time)} saatindeki randevunuza gelmediniz.`,
    '',
    `Bu nedenle ${banUntil} tarihine kadar yeni randevu alamayacaksınız.`,
    '',
    'Anlayışınız için teşekkür ederiz.',
    'Mustafa Akkurt Berberi',
  ].join('\n')
}
