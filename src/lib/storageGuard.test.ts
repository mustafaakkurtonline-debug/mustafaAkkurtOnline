import { describe, it, expect, afterEach } from 'vitest'
import { createMemoryStorage, ensureStorage } from './storageGuard'

const originalSession = Object.getOwnPropertyDescriptor(window, 'sessionStorage')

function blockSessionStorage(): void {
  // iOS'ta "Tüm Çerezleri Engelle" açıkken olduğu gibi: erişmek bile hata fırlatır
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get() { throw new DOMException('The operation is insecure.', 'SecurityError') },
  })
}

afterEach(() => {
  if (originalSession) Object.defineProperty(window, 'sessionStorage', originalSession)
})

describe('ensureStorage', () => {
  it('erişilemeyen depoyu çalışan bellek içi depoyla değiştirir', () => {
    blockSessionStorage()
    expect(() => window.sessionStorage).toThrow()

    ensureStorage('sessionStorage')

    expect(() => window.sessionStorage).not.toThrow()
    window.sessionStorage.setItem('anahtar', 'deger')
    expect(window.sessionStorage.getItem('anahtar')).toBe('deger')
  })

  it('çalışan depoya dokunmaz', () => {
    const before = window.sessionStorage
    ensureStorage('sessionStorage')
    expect(window.sessionStorage).toBe(before)
  })
})

describe('createMemoryStorage', () => {
  it('Storage gibi davranır', () => {
    const storage = createMemoryStorage()
    expect(storage.getItem('yok')).toBeNull()

    storage.setItem('a', '1')
    storage.setItem('b', '2')
    expect(storage.length).toBe(2)
    expect(storage.key(0)).toBe('a')

    storage.removeItem('a')
    expect(storage.getItem('a')).toBeNull()
    expect(storage.length).toBe(1)

    storage.clear()
    expect(storage.length).toBe(0)
  })
})
