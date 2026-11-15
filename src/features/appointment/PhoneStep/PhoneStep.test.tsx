import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

interface QueryResult<T> { data: T; error: { message: string; code?: string } | null }

const rpc = vi.fn<(name: string, args: { p_phone: string }) => Promise<QueryResult<string | boolean | null>>>()
const bannedResult = vi.fn<() => Promise<QueryResult<{ banned_until: string }[]>>>()

vi.mock('@/lib/supabase', () => {
  const bannedQuery = {
    select: () => bannedQuery,
    eq: () => bannedQuery,
    gt: () => bannedQuery,
    limit: () => bannedResult(),
  }
  return {
    supabase: {
      rpc: (name: string, args: { p_phone: string }) => rpc(name, args),
      from: () => bannedQuery,
    },
  }
})

import { PhoneStep } from './PhoneStep'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const VALID_PHONE = '0532 123 45 67'

let root: Root | null = null
let container: HTMLDivElement

function findButton(label: RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(b => label.test(b.textContent ?? ''))
  if (!button) throw new Error(`Buton yok: ${label}`)
  return button
}

// React kontrollü input'u, kullanıcının yazması gibi değiştirilir
function typePhone(value: string): void {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Telefon numarası"]')
  if (!input) throw new Error('Telefon alanı yok')
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setValue?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function submitPhone(phone: string): Promise<void> {
  await act(async () => {
    typePhone(phone)
  })
  await act(async () => {
    findButton(/Devam Et/).click()
  })
}

describe('PhoneStep', () => {
  const onVerified = vi.fn<(phone: string, firstName: string) => void>()

  beforeEach(() => {
    rpc.mockResolvedValue({ data: 'AHMET', error: null })
    bannedResult.mockResolvedValue({ data: [], error: null })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => { root?.render(createElement(PhoneStep, { initialPhone: '', onVerified })) })
  })

  afterEach(() => {
    act(() => { root?.unmount() })
    container.remove()
    vi.clearAllMocks()
  })

  it('kayıtlı müşteri ilk adıyla devam eder', async () => {
    await submitPhone(VALID_PHONE)
    expect(rpc).toHaveBeenCalledWith('approved_customer_first_name', { p_phone: '05321234567' })
    expect(onVerified).toHaveBeenCalledWith(VALID_PHONE, 'Ahmet')
  })

  it('adı yazılmamış kayıtlı müşteri de devam eder', async () => {
    rpc.mockResolvedValue({ data: '', error: null })
    await submitPhone(VALID_PHONE)
    expect(onVerified).toHaveBeenCalledWith(VALID_PHONE, '')
  })

  it('kayıtlı olmayan numara devam edemez ve WhatsApp ile başvurabilir', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await submitPhone(VALID_PHONE)

    expect(container.textContent).toContain('Kayıtlı müşteri bulunamadı')
    expect(onVerified).not.toHaveBeenCalled()
    const href = container.querySelector('a')?.getAttribute('href') ?? ''
    expect(href).toMatch(/^https:\/\/wa\.me\/905078731910\?text=/)
    expect(decodeURIComponent(href)).toContain(VALID_PHONE)

    await act(async () => { findButton(/Başka numara dene/).click() })
    expect(container.querySelector('input[aria-label="Telefon numarası"]')).not.toBeNull()
  })

  it('yasaklı numara devam edemez', async () => {
    bannedResult.mockResolvedValue({ data: [{ banned_until: '2099-01-15' }], error: null })
    await submitPhone(VALID_PHONE)

    expect(container.textContent).toContain('tarihine kadar randevu alamaz')
    expect(onVerified).not.toHaveBeenCalled()
  })

  it('kontrol yapılamazsa müşteriyi kayıtsız saymaz, tekrar denemesini ister', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })
    await submitPhone(VALID_PHONE)

    expect(container.textContent).toContain('Numara kontrol edilemedi')
    expect(container.textContent).not.toContain('Kayıtlı müşteri bulunamadı')
    expect(onVerified).not.toHaveBeenCalled()
  })

  it('isim fonksiyonu veritabanında yoksa eski kontrole düşer', async () => {
    rpc.mockImplementation(name => Promise.resolve(name === 'approved_customer_first_name'
      ? { data: null, error: { message: 'not found', code: 'PGRST202' } }
      : { data: true, error: null }))
    await submitPhone(VALID_PHONE)
    expect(rpc).toHaveBeenCalledWith('is_approved_customer', { p_phone: '05321234567' })
    expect(onVerified).toHaveBeenCalledWith(VALID_PHONE, '')
  })

  it('eski kontrolde kayıtsız numara yine engellenir', async () => {
    rpc.mockImplementation(name => Promise.resolve(name === 'approved_customer_first_name'
      ? { data: null, error: { message: 'not found', code: 'PGRST202' } }
      : { data: false, error: null }))
    await submitPhone(VALID_PHONE)
    expect(container.textContent).toContain('Kayıtlı müşteri bulunamadı')
    expect(onVerified).not.toHaveBeenCalled()
  })

  it('geçersiz numarada sunucuya sormaz', async () => {
    await submitPhone('0212 123 45 67')
    expect(container.textContent).toContain('Geçerli bir telefon numarası girin')
    expect(rpc).not.toHaveBeenCalled()
  })
})
