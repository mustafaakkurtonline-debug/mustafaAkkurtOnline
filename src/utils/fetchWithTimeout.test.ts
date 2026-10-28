import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from './fetchWithTimeout'

// Ağ hiç yanıt vermiyormuş gibi davranır; yalnızca iptal sinyaliyle sonlanır
function hangingFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    })
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchWithTimeout', () => {
  it('yanıt gelmeyen isteği süre dolunca iptal eder', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(hangingFetch))

    const request = fetchWithTimeout('https://example.com')
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS)

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('zamanında gelen yanıtı olduğu gibi döndürür', async () => {
    const response = new Response('{}', { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(fetchWithTimeout('https://example.com')).resolves.toBe(response)
  })

  it('çağıranın iptal sinyaline uyar', async () => {
    vi.stubGlobal('fetch', vi.fn(hangingFetch))
    const caller = new AbortController()

    const request = fetchWithTimeout('https://example.com', { signal: caller.signal })
    caller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })
})
