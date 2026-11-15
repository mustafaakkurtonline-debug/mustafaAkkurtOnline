import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { WelcomeStep } from './WelcomeStep'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const PHONE = '0532 123 45 67'

let root: Root | null = null
let container: HTMLDivElement

function findButton(label: RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find(b => label.test(b.textContent ?? ''))
  if (!button) throw new Error(`Buton yok: ${label}`)
  return button
}

function render(firstName: string): void {
  act(() => {
    root?.render(createElement(WelcomeStep, { firstName, phone: PHONE, onContinue, onChangePhone }))
  })
}

const onContinue = vi.fn<() => void>()
const onChangePhone = vi.fn<() => void>()

describe('WelcomeStep', () => {
  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root?.unmount() })
    container.remove()
    vi.clearAllMocks()
  })

  it('müşteriyi adıyla karşılar', () => {
    render('Ahmet')
    expect(container.textContent).toContain('Hoş geldin,')
    expect(container.querySelector('h2')?.textContent).toBe('Ahmet')
  })

  it('ad yoksa yalnızca "Hoş geldin" yazar', () => {
    render('')
    expect(container.textContent).toContain('Hoş geldin')
    expect(container.textContent).not.toContain('Hoş geldin,')
    expect(container.querySelector('h2')).toBeNull()
  })

  it('Randevu Al ile devam eder, numarayı değiştirmeye izin verir', () => {
    render('Ahmet')
    act(() => { findButton(/Randevu Al/).click() })
    expect(onContinue).toHaveBeenCalledTimes(1)
    act(() => { findButton(/Numarayı değiştir/).click() })
    expect(onChangePhone).toHaveBeenCalledTimes(1)
  })
})
