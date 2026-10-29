import { describe, it, expect } from 'vitest'
import { isOutdatedAddress, hasApiProxy, CANONICAL_HOST } from './site'

const LEGACY_WORKER_HOST = 'mustafaakkurtonline.mustafaakkurtonline.workers.dev'

describe('hasApiProxy', () => {
  it('Cloudflare\'deki adreslerde aracı kullanılır', () => {
    expect(hasApiProxy(CANONICAL_HOST)).toBe(true)
    expect(hasApiProxy(`www.${CANONICAL_HOST}`)).toBe(true)
    expect(hasApiProxy(LEGACY_WORKER_HOST)).toBe(true)
  })

  it('Cloudflare dışındaki adreslerde aracı kullanılmaz', () => {
    expect(hasApiProxy('mustafa-akkurt-online.vercel.app')).toBe(false)
    expect(hasApiProxy('localhost:5173')).toBe(false)
  })
})

describe('isOutdatedAddress', () => {
  it('güncel adreste uyarı göstermez', () => {
    expect(isOutdatedAddress(CANONICAL_HOST)).toBe(false)
    expect(isOutdatedAddress(`www.${CANONICAL_HOST}`)).toBe(false)
  })

  it('eski Cloudflare adresinde uyarı gösterir', () => {
    expect(isOutdatedAddress(LEGACY_WORKER_HOST)).toBe(true)
  })

  it('eski Vercel adresinde uyarı gösterir', () => {
    expect(isOutdatedAddress('mustafa-akkurt-online.vercel.app')).toBe(true)
  })

  it('geliştirme ortamında uyarı göstermez', () => {
    expect(isOutdatedAddress('localhost:5173')).toBe(false)
    expect(isOutdatedAddress('localhost')).toBe(false)
    expect(isOutdatedAddress('127.0.0.1:4173')).toBe(false)
  })

  it('bilinmeyen başka bir adreste uyarı gösterir', () => {
    expect(isOutdatedAddress('eski-adres.example.com')).toBe(true)
  })
})
