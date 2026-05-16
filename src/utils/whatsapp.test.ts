import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl, buildConfirmationMessage, buildNoShowMessage } from './whatsapp'

describe('buildWhatsAppUrl', () => {
  it('normalizes 0X to +90X format', () => {
    const url = buildWhatsAppUrl('05551234567', 'test')
    expect(url).toContain('wa.me/905551234567')
  })
  it('normalizes 5X (no leading 0) to +90X', () => {
    const url = buildWhatsAppUrl('5551234567', 'test')
    expect(url).toContain('wa.me/905551234567')
  })
  it('keeps already normalized 90X as-is', () => {
    const url = buildWhatsAppUrl('905551234567', 'test')
    expect(url).toContain('wa.me/905551234567')
  })
  it('URL-encodes the message', () => {
    const url = buildWhatsAppUrl('05551234567', 'Merhaba Dünya')
    expect(url).toContain('text=')
    expect(url).toContain('Merhaba')
  })
})

describe('buildConfirmationMessage', () => {
  const params = {
    customerName: 'Ahmet Yılmaz',
    date: '2026-05-10',
    time: '10:30:00',
    serviceName: 'Saç Kesimi',
  }

  it('includes customer name', () => {
    expect(buildConfirmationMessage(params)).toContain('Ahmet Yılmaz')
  })
  it('includes service name', () => {
    expect(buildConfirmationMessage(params)).toContain('Saç Kesimi')
  })
  it('includes formatted time', () => {
    expect(buildConfirmationMessage(params)).toContain('10:30')
  })
  it('includes barbershop sign-off', () => {
    expect(buildConfirmationMessage(params)).toContain('Mustafa Akkurt Berberi')
  })
})

describe('buildNoShowMessage', () => {
  const params = {
    customerName: 'Mehmet Demir',
    date: '2026-05-03',
    time: '14:00:00',
  }

  it('includes customer name', () => {
    expect(buildNoShowMessage(params)).toContain('Mehmet Demir')
  })
  it('includes ban date 14 days later', () => {
    // 2026-05-03 + 14 = 2026-05-17 → "17 Mayıs 2026"
    expect(buildNoShowMessage(params)).toContain('17 Mayıs 2026')
  })
  it('includes barbershop sign-off', () => {
    expect(buildNoShowMessage(params)).toContain('Mustafa Akkurt Berberi')
  })
})
