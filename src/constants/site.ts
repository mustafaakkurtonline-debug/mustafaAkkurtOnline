// Uygulamanın güncel adresi. Başka bir adreste çalışıldığı tespit edilirse
// kullanıcıya taşınma uyarısı gösterilir.
export const CANONICAL_HOST = 'mustafaakkurt.net'
export const CANONICAL_URL = `https://${CANONICAL_HOST}`
const CANONICAL_WWW_HOST = `www.${CANONICAL_HOST}`

// Alan adından önceki Cloudflare adresi. Aynı Worker'ı sunduğu için aracı
// burada da çalışır; kullanıcılar taşınma uyarısıyla yeni adrese yönlendirilir.
const LEGACY_WORKER_HOST = 'mustafaakkurtonline.mustafaakkurtonline.workers.dev'

// Bazı internet bağlantıları supabase.co ve sentry.io adreslerine ulaşamıyor.
// Cloudflare'deki adreslerde bu istekler sitenin kendi adresi üzerinden Worker'a
// gider (worker/index.ts) ve oradan asıl servise iletilir.
export const SUPABASE_PROXY_PATH = '/sb'
export const SENTRY_TUNNEL_PATH = '/sentry-tunnel'
export const API_PROXY_HOSTS = [CANONICAL_HOST, CANONICAL_WWW_HOST, LEGACY_WORKER_HOST]

// Geliştirme ortamında uyarı gösterilmez
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

export function isOutdatedAddress(host: string): boolean {
  if (host === CANONICAL_HOST || host === CANONICAL_WWW_HOST) return false
  return !LOCAL_HOSTS.includes(host.split(':')[0] ?? '')
}

// Aracı Worker yalnızca Cloudflare'deki adreslerde vardır
export function hasApiProxy(host: string): boolean {
  return API_PROXY_HOSTS.includes(host)
}
