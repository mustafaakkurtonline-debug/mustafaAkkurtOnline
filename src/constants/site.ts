// Uygulamanın güncel adresi. Başka bir adreste çalışıldığı tespit edilirse
// kullanıcıya taşınma uyarısı gösterilir.
export const CANONICAL_HOST = 'mustafaakkurtonline.mustafaakkurtonline.workers.dev'
export const CANONICAL_URL = `https://${CANONICAL_HOST}`

// Geliştirme ortamında uyarı gösterilmez
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

export function isOutdatedAddress(host: string): boolean {
  if (host === CANONICAL_HOST) return false
  return !LOCAL_HOSTS.includes(host.split(':')[0] ?? '')
}
