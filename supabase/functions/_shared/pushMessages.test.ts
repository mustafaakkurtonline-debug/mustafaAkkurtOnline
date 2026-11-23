import { describe, it, expect } from 'vitest'
import { revisitPushPayload, reminderPushPayload, BOOKING_URL, BRAND_TITLE } from './pushMessages'
import { REVISIT_AFTER_DAYS } from './whatsappMessages'

describe('reminderPushPayload (yarınki randevu bildirimi)', () => {
  const appointment = { id: 'a1', customer_name: 'işıl YILMAZ', appointment_date: '2026-11-22', appointment_time: '14:30:00' }

  it('kuaförün adıyla, ilk adla, tarih ve saatle hatırlatır', () => {
    const payload = reminderPushPayload(appointment)
    expect(payload.title).toBe('✂️ Mustafa Akkurt Kuaför')
    expect(payload.body).toBe([
      'Merhaba İşıl, randevunuzu hatırlatmak isteriz.',
      '📅 Yarın, 22 Kasım Pazar',
      '🕒 Saat 14:30',
      'Sizi ağırlamaktan mutluluk duyarız.',
    ].join('\n'))
  })

  it('ad yoksa adsız selamlar', () => {
    expect(reminderPushPayload({ ...appointment, customer_name: ' ' }).body).toMatch(/^Merhaba, randevunuzu/)
  })

  it('her randevunun bildirimi ayrı durur ve randevu sayfasını açar', () => {
    expect(reminderPushPayload(appointment).tag).not.toBe(reminderPushPayload({ ...appointment, id: 'a2' }).tag)
    expect(reminderPushPayload(appointment).url).toBe(BOOKING_URL)
  })
})

describe('revisitPushPayload (20 gün daveti)', () => {
  it('kuaförün adıyla, ilk adla, kibar dille ve gün sayısıyla seslenir', () => {
    const payload = revisitPushPayload('ahmet YILMAZ')
    expect(payload.title).toBe(BRAND_TITLE)
    expect(payload.body).toBe([
      'Merhaba Ahmet, tarzınızı her zaman özenli tutmak için küçük bir hatırlatma.',
      `Son randevunuzun üzerinden ${REVISIT_AFTER_DAYS} gün geçti; sizi yeniden ağırlamaktan mutluluk duyarız.`,
      '👉 Yeni randevunuz için dokunun.',
    ].join('\n'))
  })

  it('"bakım" kelimesini kullanmaz', () => {
    const { title, body } = revisitPushPayload('Ahmet')
    expect(`${title} ${body}`.toLocaleLowerCase('tr-TR')).not.toContain('bakım')
  })

  it('ad yoksa adsız selamlar', () => {
    expect(revisitPushPayload('   ').body).toMatch(/^Merhaba, tarzınızı/)
  })

  it('dokununca randevu sayfasını açar ve ekranda zorla tutulmaz', () => {
    const payload = revisitPushPayload('Ahmet')
    expect(payload.url).toBe(BOOKING_URL)
    expect(payload.url).not.toContain('/admin')
    expect(payload.requireInteraction).toBe(false)
  })

  it('aynı müşteriye ikinci davet öncekinin yerine geçer', () => {
    expect(revisitPushPayload('Ahmet').tag).toBe(revisitPushPayload('Mehmet').tag)
  })
})
