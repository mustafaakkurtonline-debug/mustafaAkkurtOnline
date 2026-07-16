/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

// Yeni SW yüklenince hemen devralır; eski SW'nin "waiting" kalması engellenir.
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim())
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Supabase API çağrıları → NetworkFirst (5 dakika cache)
registerRoute(
  /^https:\/\/[a-z]+\.supabase\.co\/.*/i,
  new NetworkFirst({ cacheName: 'supabase-api-cache' }),
)

// Admin rotaları offline desteklenmez
registerRoute(
  new NavigationRoute(
    new CacheFirst({ cacheName: 'pages-cache' }),
    { denylist: [/^\/admin/] },
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
