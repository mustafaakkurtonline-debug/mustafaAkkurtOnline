import { describe, it, expect } from 'vitest'
import type { Breadcrumb } from '@sentry/react'
import { scrubPhoneNumbers, scrubEvent } from './sentry'

describe('scrubPhoneNumbers', () => {
  it('farklı yazımlardaki telefon numaralarını gizler', () => {
    expect(scrubPhoneNumbers('05307284006')).toBe('[telefon]')
    expect(scrubPhoneNumbers('5307284006')).toBe('[telefon]')
    expect(scrubPhoneNumbers('+905307284006')).toBe('[telefon]')
    expect(scrubPhoneNumbers('905307284006')).toBe('[telefon]')
  })

  it('telefon olmayan sayılara dokunmaz', () => {
    expect(scrubPhoneNumbers('timestamp 1761200000.123')).toBe('timestamp 1761200000.123')
    expect(scrubPhoneNumbers('saat 14:30, fiyat 250')).toBe('saat 14:30, fiyat 250')
  })
})

describe('scrubEvent', () => {
  it('Supabase sorgu adresindeki telefonu gizler', () => {
    const breadcrumb: Breadcrumb = {
      category: 'fetch',
      data: { url: 'https://x.supabase.co/rest/v1/banned_customers?customer_phone=eq.05307284006', status_code: 200 },
      timestamp: 1761200000.123,
    }

    const scrubbed = scrubEvent(breadcrumb)

    expect(scrubbed.data?.url).toBe('https://x.supabase.co/rest/v1/banned_customers?customer_phone=eq.[telefon]')
    expect(scrubbed.data?.status_code).toBe(200)
    expect(scrubbed.timestamp).toBe(1761200000.123)
  })
})
