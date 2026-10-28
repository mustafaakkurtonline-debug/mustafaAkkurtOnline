/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// Eski sürümlerde sayfa gezinmeleri CacheFirst ile bu cache'e yazılıyordu; cihaz
// bir kez önbelleğe aldıktan sonra yeni deploy'ları hiç görmüyordu. Cache'i
// silmezsek o cihazlar eski uygulamada kilitli kalır.
const LEGACY_PAGES_CACHE = 'pages-cache'

// Yeni SW yüklenince hemen devralır; eski SW'nin "waiting" kalması engellenir.
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.delete(LEGACY_PAGES_CACHE).then(() => self.clients.claim()),
  )
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Supabase API çağrıları → NetworkFirst (5 dakika cache)
registerRoute(
  /^https:\/\/[a-z]+\.supabase\.co\/.*/i,
  new NetworkFirst({ cacheName: 'supabase-api-cache' }),
)

// Güncel adreste Supabase'e site üzerinden gidilir (/sb, worker/index.ts);
// veri sorguları aynı şekilde önbelleğe alınır. Oturum istekleri hariç.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/sb/rest/'),
  new NetworkFirst({ cacheName: 'supabase-api-cache' }),
)

// Sayfa gezinmeleri precache'teki index.html'den karşılanır. Precache her
// deploy'da yeni revision aldığı için kullanıcı güncel sürümü alır.
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/index.html'),
    // Bağlantı tanı sayfası (public/tani.html) her zaman sunucudan açılır
    { denylist: [/^\/admin/, /^\/tani/] },
  ),
)

// Admin gezinmeleri precache'teki admin.html'den karşılanır: panel, sunucuya o an
// ulaşılamasa bile açılır (beyaz ekran yerine) ve her /admin/... adresinde admin
// manifest'i kullanılır. Cloudflare /admin/login gibi alt adreslere index.html
// döndürdüğü için ağdan gelen sayfa bu rotaya uygun değildir. admin.html
// precache'te yoksa sayfa ağdan istenir.
const ADMIN_SHELL_URL = '/admin.html'

registerRoute(
  new NavigationRoute(
    async ({ request }) => (await matchPrecache(ADMIN_SHELL_URL)) ?? fetch(request),
    { allowlist: [/^\/admin/] },
  ),
)

// ------------------------------------------------------------------
// Web Push: her durumda göster — panel açıkken de.
// Realtime tarafı da aynı tag ile bildirim gösterdiğinden, aynı randevu
// için ikinci bildirim öncekinin yerine geçer; çift bildirim oluşmaz.
// ------------------------------------------------------------------
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json() as { title: string; body: string; tag?: string }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: data.tag ?? 'appointment',
      requireInteraction: true,
      // vibrate TS tiplerinde yok ama tüm Android tarayıcıları destekler
      ...({ vibrate: [200, 100, 200] } as NotificationOptions),
    }),
  )
})

// Bildirime tıklanınca admin panelini aç
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const adminClient = clients.find((c) => c.url.includes('/admin'))
        if (adminClient) return adminClient.focus()
        return self.clients.openWindow('/admin')
      }),
  )
})
