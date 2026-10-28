// Uygulamanın güncel adresi. Başka bir adreste çalışıldığı tespit edilirse
// kullanıcıya taşınma uyarısı gösterilir.
export const CANONICAL_HOST = 'mustafaakkurtonline.mustafaakkurtonline.workers.dev'
export const CANONICAL_URL = `https://${CANONICAL_HOST}`

// Bazı internet bağlantıları supabase.co ve sentry.io adreslerine ulaşamıyor.
// Güncel adreste bu istekler sitenin kendi adresi üzerinden Cloudflare Worker'a
// gider (worker/index.ts) ve oradan asıl servise iletilir.
export const SUPABASE_PROXY_PATH = '/sb'
export const SENTRY_TUNNEL_PATH = '/sentry-tunnel'

// Geliştirme ortamında uyarı gösterilmez
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

export function isOutdatedAddress(host: string): boolean {
  if (host === CANONICAL_HOST) return false
  return !LOCAL_HOSTS.includes(host.split(':')[0] ?? '')
}

// Aracı Worker yalnızca Cloudflare'deki güncel adreste vardır
export function hasApiProxy(host: string): boolean {
  return host === CANONICAL_HOST
}
