import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hideSplash } from './splash'
import {
  SPLASH_ELEMENT_ID,
  SPLASH_MIN_VISIBLE_MS,
  SPLASH_EXIT_MS,
  SPLASH_SCROLL_LOCK_CLASS,
} from '@/constants/splash'

// jsdom animasyon desteklemez; bu testler eski tarayıcı yolunu (sabit süre) dener
function addSplash(): HTMLDivElement {
  const splash = document.createElement('div')
  splash.id = SPLASH_ELEMENT_ID
  document.body.appendChild(splash)
  document.documentElement.classList.add(SPLASH_SCROLL_LOCK_CLASS)
  return splash
}

describe('hideSplash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    document.getElementById(SPLASH_ELEMENT_ID)?.remove()
    document.documentElement.classList.remove(SPLASH_SCROLL_LOCK_CLASS)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('animasyon süresi dolmadan kesmez, sonra perdeleri açar ve kaydırmayı açar', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(200)
    const splash = addSplash()

    hideSplash()
    await vi.advanceTimersByTimeAsync(SPLASH_MIN_VISIBLE_MS - 200 - 1)
    expect(splash.classList.contains('is-exiting')).toBe(false)
    expect(document.documentElement.classList.contains(SPLASH_SCROLL_LOCK_CLASS)).toBe(true)

    await vi.advanceTimersByTimeAsync(1)
    expect(splash.classList.contains('is-exiting')).toBe(true)
    expect(splash.classList.contains('pointer-events-none')).toBe(true)

    await vi.advanceTimersByTimeAsync(SPLASH_EXIT_MS)
    expect(splash.isConnected).toBe(false)
    expect(document.documentElement.classList.contains(SPLASH_SCROLL_LOCK_CLASS)).toBe(false)
  })

  it('yavaş açılışta beklemeden kapanır', async () => {
    vi.spyOn(performance, 'now').mockReturnValue(SPLASH_MIN_VISIBLE_MS * 10)
    const splash = addSplash()

    hideSplash()
    await vi.advanceTimersByTimeAsync(0)
    expect(splash.classList.contains('is-exiting')).toBe(true)
  })

  it('gizli katman (oturumda gösterildi / hareket azaltma) hemen kaldırılır', () => {
    const splash = addSplash()
    splash.hidden = true

    hideSplash()
    expect(splash.isConnected).toBe(false)
    expect(document.documentElement.classList.contains(SPLASH_SCROLL_LOCK_CLASS)).toBe(false)
  })

  it('katman yoksa hata vermez', () => {
    expect(() => { hideSplash() }).not.toThrow()
  })
})
