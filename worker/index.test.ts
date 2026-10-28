import { describe, it, expect } from 'vitest'
import { toSupabaseUrl, sentryEnvelopeUrl } from './index'

const SUPABASE_ORIGIN = 'https://proje.supabase.co'

describe('toSupabaseUrl', () => {
  it('önek kaldırılır, yol ve sorgu korunur', () => {
    const url = new URL('https://site.example/sb/rest/v1/services?select=id,name&is_active=eq.true')
    expect(toSupabaseUrl(url, SUPABASE_ORIGIN))
      .toBe('https://proje.supabase.co/rest/v1/services?select=id,name&is_active=eq.true')
  })

  it('oturum ve realtime yollarını da iletir', () => {
    expect(toSupabaseUrl(new URL('https://site.example/sb/auth/v1/token?grant_type=password'), SUPABASE_ORIGIN))
      .toBe('https://proje.supabase.co/auth/v1/token?grant_type=password')
    expect(toSupabaseUrl(new URL('wss://site.example/sb/realtime/v1/websocket?vsn=1.0.0'), SUPABASE_ORIGIN))
      .toBe('https://proje.supabase.co/realtime/v1/websocket?vsn=1.0.0')
  })
})

describe('sentryEnvelopeUrl', () => {
  it('DSN içinden gönderim adresini üretir', () => {
    expect(sentryEnvelopeUrl('https://abc123@o1.ingest.de.sentry.io/42'))
      .toBe('https://o1.ingest.de.sentry.io/api/42/envelope/?sentry_version=7&sentry_key=abc123')
  })
})
