import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { readSavedPhone, savePhone } from './savedPhone'

describe('savedPhone', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  it('kaydedilen numarayı geri okur', () => {
    savePhone('0532 123 45 67')
    expect(readSavedPhone()).toBe('0532 123 45 67')
  })

  it('kayıt yoksa boş döner', () => {
    expect(readSavedPhone()).toBe('')
  })

  it('depolama hata verirse akışı bozmaz', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    expect(() => { savePhone('0532 123 45 67') }).not.toThrow()
    expect(readSavedPhone()).toBe('')
  })
})
