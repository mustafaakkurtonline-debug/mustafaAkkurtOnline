import { describe, it, expect, vi, afterEach } from 'vitest'
import { showSystemNotification } from './serviceWorker'

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function stubServiceWorker(ready: Promise<ServiceWorkerRegistration>): void {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready } })
}

afterEach(() => {
  if (originalServiceWorker) Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker)
  else Reflect.deleteProperty(navigator, 'serviceWorker')
  vi.useRealTimers()
})

describe('showSystemNotification', () => {
  it('bildirimi service worker kaydı üzerinden gösterir', async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined)
    stubServiceWorker(Promise.resolve({ showNotification } as unknown as ServiceWorkerRegistration))

    await showSystemNotification('Randevunuz Alındı! ✓', { body: 'Saç kesimi' })

    expect(showNotification).toHaveBeenCalledWith('Randevunuz Alındı! ✓', { body: 'Saç kesimi' })
  })

  it('service worker hiç hazır olmazsa sonsuza kadar beklemez', async () => {
    vi.useFakeTimers()
    stubServiceWorker(new Promise(() => {}))

    const result = showSystemNotification('Başlık', {})
    const assertion = expect(result).rejects.toThrow('zaman aşımı')
    await vi.runAllTimersAsync()

    await assertion
  })
})
