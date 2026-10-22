import { describe, it, expect } from 'vitest'
import { isOutdatedAddress, CANONICAL_HOST } from './site'

describe('isOutdatedAddress', () => {
  it('güncel adreste uyarı göstermez', () => {
    expect(isOutdatedAddress(CANONICAL_HOST)).toBe(false)
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
