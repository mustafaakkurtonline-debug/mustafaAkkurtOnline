import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

const getSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

import { useAuth, SESSION_CHECK_TIMEOUT_MS } from './useAuth'

type AuthState = ReturnType<typeof useAuth>

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

function renderUseAuth(): { current: AuthState | null } {
  const result: { current: AuthState | null } = { current: null }
  function Probe() {
    result.current = useAuth()
    return null
  }
  root = createRoot(document.createElement('div'))
  act(() => { root?.render(createElement(Probe)) })
  return result
}

async function flushPromises(): Promise<void> {
  await act(async () => { await Promise.resolve() })
}

beforeEach(() => {
  getSession.mockReset()
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  vi.useRealTimers()
})

describe('useAuth', () => {
  it('oturum kontrolü hiç bitmezse zaman aşımında yüklemeyi bırakır', () => {
    // iOS'ta takılan oturum kilidi / ağda asılı kalan token yenilemesi
    vi.useFakeTimers()
    getSession.mockReturnValue(new Promise(() => {}))

    const result = renderUseAuth()
    expect(result.current?.isLoading).toBe(true)

    act(() => { vi.advanceTimersByTime(SESSION_CHECK_TIMEOUT_MS) })

    expect(result.current?.isLoading).toBe(false)
    expect(result.current?.isAuthenticated).toBe(false)
  })

  it('oturum kontrolü hata verirse yüklemeyi bırakır', async () => {
    getSession.mockRejectedValue(new Error('depolama erişilemez'))

    const result = renderUseAuth()
    await flushPromises()

    expect(result.current?.isLoading).toBe(false)
    expect(result.current?.isAuthenticated).toBe(false)
  })

  it('geçerli oturumu yükler', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'x' } } })

    const result = renderUseAuth()
    await flushPromises()

    expect(result.current?.isLoading).toBe(false)
    expect(result.current?.isAuthenticated).toBe(true)
  })
})
