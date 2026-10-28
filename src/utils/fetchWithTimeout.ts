// Zayıf veya takılan bağlantıda istek sonsuza kadar beklemez: bu süre dolunca iptal
// edilir ve ekran sonsuz yükleme yerine hata gösterebilir.
export const REQUEST_TIMEOUT_MS = 20000

export function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()

  // Zamanlayıcı yanıt başlıkları gelince temizlenmez: gövde okunurken takılan
  // istekler de iptal edilir. Tamamlanmış bir isteği iptal etmenin etkisi yoktur.
  setTimeout(() => { controller.abort() }, REQUEST_TIMEOUT_MS)

  // Çağıranın kendi iptal sinyali varsa o da geçerli kalır
  const callerSignal = init.signal
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort()
    else callerSignal.addEventListener('abort', () => { controller.abort() }, { once: true })
  }

  return fetch(input, { ...init, signal: controller.signal })
}
