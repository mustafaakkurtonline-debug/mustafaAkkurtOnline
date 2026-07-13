// Convert JS day (0=Sun…6=Sat) to DB day (0=Mon…6=Sun)
export function jsToDbDayOfWeek(jsDay: number): number {
  return (jsDay + 6) % 7
}

// "09:30" → 570
export function timeToMinutes(time: string): number {
  const parts = time.split(':')
  const hours = Number(parts[0])
  const minutes = Number(parts[1])
  return hours * 60 + minutes
}

// 570 → "09:30"
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

// Generate "HH:mm" slots from openTime to closeTime with durationMinutes step
// Last slot must finish by or at closeTime
export function generateTimeSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
): string[] {
  const openMins = timeToMinutes(openTime)
  const closeMins = timeToMinutes(closeTime)
  const slots: string[] = []

  for (let t = openMins; t + durationMinutes <= closeMins; t += durationMinutes) {
    slots.push(minutesToTime(t))
  }

  return slots
}

// "2026-05-02" → Date object at local midnight
function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

// Get today as "YYYY-MM-DD"
export function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = (now.getMonth() + 1).toString().padStart(2, '0')
  const d = now.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Add offsetDays to "YYYY-MM-DD" and return "YYYY-MM-DD"
export function addDays(dateStr: string, offsetDays: number): string {
  const date = parseDateString(dateStr)
  date.setDate(date.getDate() + offsetDays)
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "2026-05-02" → JS day of week (0=Sun)
export function getJsDayOfWeek(dateStr: string): number {
  return parseDateString(dateStr).getDay()
}

// Next date (today included) matching a DB day of week (0=Mon…6=Sun)
export function getNextDateForDbDay(dbDay: number, fromDate: string = getTodayString()): string {
  const fromDbDay = jsToDbDayOfWeek(getJsDayOfWeek(fromDate))
  const offset = (dbDay - fromDbDay + 7) % 7
  return addDays(fromDate, offset)
}

// Short Turkish day names indexed by JS day (0=Sun)
const SHORT_DAY_NAMES = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']

export function getShortDayName(dateStr: string): string {
  return SHORT_DAY_NAMES[parseDateString(dateStr).getDay()] ?? ''
}

// "2026-05-02" → 2
export function getDayNumber(dateStr: string): number {
  return parseDateString(dateStr).getDate()
}

// "2026-05-02" → "Cumartesi, 2 Mayıs 2026"
export function formatDateLong(dateStr: string): string {
  return parseDateString(dateStr).toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// "09:30:00" or "09:30" → "09:30"
export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

// Normalize phone: keep only digits
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

// Format phone input in Turkish format: 05XX XXX XX XX (max 11 digits)
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
}

// Validate Turkish mobile phone: 11 digits starting with 05
export function isValidTurkishPhone(phone: string): boolean {
  const digits = normalizePhone(phone)
  return digits.length === 11 && digits.startsWith('05')
}

// 30 → "30 dk", 60 → "1 sa", 90 → "1 sa 30 dk"
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} dk`
  if (m === 0) return `${h} sa`
  return `${h} sa ${m} dk`
}
