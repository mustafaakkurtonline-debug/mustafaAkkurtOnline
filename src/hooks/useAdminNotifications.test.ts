import { describe, it, expect } from 'vitest'
import { toFriendlyPushError } from './useAdminNotifications'

function errorWith(name: string, message: string): Error {
  const err = new Error(message)
  err.name = name
  return err
}

describe('toFriendlyPushError', () => {
  it('izin engeli AbortError ile geldiğinde izin yönlendirmesi verir', () => {
    // Chrome, izin engelliyken subscribe() çağrısını AbortError ile reddediyor.
    // Bu durumda Play Hizmetleri yönlendirmesi vermek berberi yanlış yola sokar.
    const msg = toFriendlyPushError(errorWith('AbortError', 'Registration failed - permission denied'))
    expect(msg).toContain('bildirim kaydını engelliyor')
    expect(msg).not.toContain('Play Store')
  })

  it('servise ulaşılamayan AbortError için Play Hizmetleri yönlendirmesi verir', () => {
    const msg = toFriendlyPushError(errorWith('AbortError', 'Registration failed - push service error'))
    expect(msg).toContain('Play Store')
  })

  it('NotAllowedError için tarayıcı izni yönlendirmesi verir', () => {
    const msg = toFriendlyPushError(errorWith('NotAllowedError', 'denied'))
    expect(msg).toContain('bildirim iznini engelliyor')
  })

  it('bilinmeyen hatada hata adını ve mesajını gösterir', () => {
    expect(toFriendlyPushError(errorWith('InvalidStateError', 'bir sorun'))).toBe('InvalidStateError: bir sorun')
  })

  it('düz Error mesajını olduğu gibi gösterir', () => {
    expect(toFriendlyPushError(new Error('VAPID anahtarı yapılandırılmamış')))
      .toBe('VAPID anahtarı yapılandırılmamış')
  })
})
