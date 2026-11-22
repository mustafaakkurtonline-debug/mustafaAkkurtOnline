import { describe, it, expect } from 'vitest'
import { revisitPushPayload, BOOKING_URL } from './pushMessages'
import { REVISIT_AFTER_DAYS } from './whatsappMessages'

describe('revisitPushPayload (bakım daveti bildirimi)', () => {
  it('müşteriye ilk adıyla, kibar dille ve gün sayısıyla seslenir', () => {
    const payload = revisitPushPayload('ahmet YILMAZ')
    expect(payload.title).toBe('Sizi yeniden ağırlamak isteriz ✂️')
    expect(payload.body).toBe(
      `Merhaba Ahmet, son randevunuzun üzerinden ${REVISIT_AFTER_DAYS} gün geçti. Yeni randevunuzu almak için dokunabilirsiniz.`,
    )
  })

  it('"bakım" kelimesini kullanmaz', () => {
    const { title, body } = revisitPushPayload('Ahmet')
    expect(`${title} ${body}`.toLocaleLowerCase('tr-TR')).not.toContain('bakım')
  })

  it('ad yoksa adsız selamlar', () => {
    expect(revisitPushPayload('   ').body).toMatch(/^Merhaba, son randevunuzun üzerinden/)
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
