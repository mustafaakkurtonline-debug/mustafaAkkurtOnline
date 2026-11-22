import { describe, it, expect, vi, afterEach } from 'vitest'
import { vapidKeyToUint8Array, toPushKeys, isIosBrowserTab } from './pushSubscription'

function fakeSubscription(json: PushSubscriptionJSON): PushSubscription {
  return { toJSON: () => json } as unknown as PushSubscription
}

function stubDevice(userAgent: string, { standalone = false, platform = '', maxTouchPoints = 0 } = {}): void {
  vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: standalone && query.includes('standalone') }))
}

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
const IPAD_DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('vapidKeyToUint8Array', () => {
  it('base64url anahtarı baytlara çevirir (eksik dolgu dahil)', () => {
    expect(Array.from(vapidKeyToUint8Array('AQID_w'))).toEqual([1, 2, 3, 255])
  })
})

describe('toPushKeys', () => {
  it('abonelikten kaydedilecek alanları çıkarır', () => {
    const subscription = fakeSubscription({ endpoint: 'https://push.example/1', keys: { p256dh: 'P', auth: 'A' } })
    expect(toPushKeys(subscription)).toEqual({ endpoint: 'https://push.example/1', p256dh: 'P', auth: 'A' })
  })

  it('tarayıcı anahtar vermediyse kaydetmez', () => {
    expect(toPushKeys(fakeSubscription({ endpoint: 'https://push.example/1' }))).toBeNull()
  })
})

describe('isIosBrowserTab', () => {
  it("iPhone Safari sekmesinde ana ekrana eklenmesi gerekir", () => {
    stubDevice(IPHONE_UA)
    expect(isIosBrowserTab()).toBe(true)
  })

  it('ana ekrandan açılan iPhone uygulamasında gerekmez', () => {
    stubDevice(IPHONE_UA, { standalone: true })
    expect(isIosBrowserTab()).toBe(false)
  })

  it('kendini Mac gibi tanıtan iPad de iOS sayılır', () => {
    stubDevice(IPAD_DESKTOP_UA, { platform: 'MacIntel', maxTouchPoints: 5 })
    expect(isIosBrowserTab()).toBe(true)
  })

  it('Android tarayıcısında gerekmez', () => {
    stubDevice(ANDROID_UA, { platform: 'Linux armv81', maxTouchPoints: 5 })
    expect(isIosBrowserTab()).toBe(false)
  })
})
