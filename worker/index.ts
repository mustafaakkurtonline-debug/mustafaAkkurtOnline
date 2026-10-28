// Cloudflare Worker: siteyi (dist) sunar ve bazı internet bağlantılarının
// ulaşamadığı servislere giden istekleri sitenin kendi adresi üzerinden iletir.
//   /sb/...           → Supabase (REST, Auth, Realtime WebSocket dahil)
//   /sentry-tunnel    → Sentry hata raporları
// Diğer tüm istekler doğrudan statik dosyalardan karşılanır (wrangler.jsonc).
import { SUPABASE_PROXY_PATH, SENTRY_TUNNEL_PATH } from '../src/constants/site'
import { SENTRY_DSN } from '../src/constants/sentry'

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  SUPABASE_ORIGIN: string
}

const METHOD_NOT_ALLOWED = 405

// /sb/rest/v1/services?x=1 → https://<proje>.supabase.co/rest/v1/services?x=1
export function toSupabaseUrl(requestUrl: URL, supabaseOrigin: string): string {
  return supabaseOrigin + requestUrl.pathname.slice(SUPABASE_PROXY_PATH.length) + requestUrl.search
}

// Sentry'nin herkese açık DSN'inden olay gönderme adresi üretilir
export function sentryEnvelopeUrl(dsn: string): string {
  const parsed = new URL(dsn)
  const projectId = parsed.pathname.slice(1)
  return `https://${parsed.host}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${parsed.username}`
}

function proxyToSupabase(request: Request, env: Env): Promise<Response> {
  // new Request(url, request) gövdeyi, başlıkları ve WebSocket yükseltmesini korur
  const proxied = new Request(toSupabaseUrl(new URL(request.url), env.SUPABASE_ORIGIN), request)
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) proxied.headers.set('x-forwarded-for', clientIp)
  return fetch(proxied)
}

async function tunnelToSentry(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: METHOD_NOT_ALLOWED })
  // Olaylar her zaman bu projenin Sentry'sine gider; istemcinin verdiği adrese değil
  return fetch(sentryEnvelopeUrl(SENTRY_DSN), {
    method: 'POST',
    headers: { 'content-type': 'application/x-sentry-envelope' },
    body: await request.text(),
  })
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith(`${SUPABASE_PROXY_PATH}/`)) return proxyToSupabase(request, env)
    if (pathname === SENTRY_TUNNEL_PATH) return tunnelToSentry(request)
    return env.ASSETS.fetch(request)
  },
}
