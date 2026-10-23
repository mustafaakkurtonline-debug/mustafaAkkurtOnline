// iOS Safari'de "Tüm Çerezleri Engelle" açıkken window.localStorage /
// window.sessionStorage'a erişmek bile SecurityError fırlatır. Supabase'in
// realtime istemcisi (Phoenix soketi) sessionStorage'a korumasız eriştiği için
// createClient() modül yüklenirken çöker ve uygulama beyaz ekranda kalır.
// Bu modül her şeyden önce yüklenir ve erişilemeyen depoların yerine bellek
// içi bir depo koyar; oturum o cihazda kalıcı olmaz ama uygulama çalışır.

type WebStorageName = 'localStorage' | 'sessionStorage'

const PROBE_KEY = '__storage_probe__'

export function createMemoryStorage() {
  const data = new Map<string, string>()
  return {
    get length(): number { return data.size },
    key(index: number): string | null { return Array.from(data.keys())[index] ?? null },
    getItem(key: string): string | null { return data.get(key) ?? null },
    setItem(key: string, value: string): void { data.set(key, String(value)) },
    removeItem(key: string): void { data.delete(key) },
    clear(): void { data.clear() },
  }
}

function isUsable(name: WebStorageName): boolean {
  try {
    const storage = window[name]
    storage.setItem(PROBE_KEY, PROBE_KEY)
    storage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

export function ensureStorage(name: WebStorageName): void {
  if (isUsable(name)) return
  try {
    Object.defineProperty(window, name, { configurable: true, value: createMemoryStorage() })
  } catch {
    // Tarayıcı özelliğin yeniden tanımlanmasına izin vermiyorsa yapılacak bir şey yok
  }
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')
