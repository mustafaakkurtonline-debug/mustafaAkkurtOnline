import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import type { CustomerPushStatus } from '@/hooks/useCustomerPush'
import type { NotificationOptInVariant } from './NotificationOptIn'

const hookState: { status: CustomerPushStatus; error: string | null } = { status: 'ask', error: null }
const enable = vi.fn<() => Promise<void>>()

vi.mock('@/hooks/useCustomerPush', () => ({
  useCustomerPush: () => ({ ...hookState, enable }),
}))

import { NotificationOptIn } from './NotificationOptIn'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const PHONE = '05321234567'

let root: Root | null = null
let container: HTMLDivElement

function show(variant: NotificationOptInVariant): void {
  act(() => { root?.render(<NotificationOptIn phone={PHONE} variant={variant} />) })
}

function findButton(label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.trim() === label)
  if (!button) throw new Error(`Buton yok: ${label}`)
  return button
}

beforeEach(() => {
  hookState.status = 'ask'
  hookState.error = null
  enable.mockReset().mockResolvedValue()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  container.remove()
})

describe('NotificationOptIn', () => {
  it('başarı ekranında düğmeyle izin ister', () => {
    show('card')
    act(() => { findButton('Bildirimleri Aç').click() })
    expect(enable).toHaveBeenCalledTimes(1)
  })

  it('karşılama ekranında küçük düğmeyle izin ister', () => {
    show('inline')
    act(() => { findButton('Randevu hatırlatmalarını aç').click() })
    expect(enable).toHaveBeenCalledTimes(1)
  })

  it('kayıt sürerken düğme kilitlenir', () => {
    hookState.status = 'saving'
    show('card')
    expect(findButton('Açılıyor…')).toBeDisabled()
  })

  it('kayıt olmadıysa hatayı gösterir', () => {
    hookState.error = 'Bildirimler açılamadı. Lütfen tekrar deneyin.'
    show('card')
    expect(container.textContent).toContain('Bildirimler açılamadı. Lütfen tekrar deneyin.')
  })

  it('bildirimler açıksa düğme yerine bilgi gösterir', () => {
    hookState.status = 'enabled'
    show('inline')
    expect(container.textContent).toContain('Bildirimler açık')
    expect(container.querySelector('button')).toBeNull()
  })

  it('başarı ekranında iPhone için ana ekrana ekleme ipucu verir', () => {
    hookState.status = 'needs-install'
    show('card')
    expect(container.textContent).toContain('ana ekrana ekleyip')
  })

  it('karşılama ekranını izin reddi ve kurulum ipucuyla kalabalıklaştırmaz', () => {
    for (const status of ['denied', 'needs-install', 'unsupported'] as const) {
      hookState.status = status
      show('inline')
      expect(container).toBeEmptyDOMElement()
    }
  })
})
