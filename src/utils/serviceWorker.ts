const SERVICE_WORKER_READY_TIMEOUT_MS = 10000

// navigator.serviceWorker.ready, kayıt hiç yapılamazsa sonsuza kadar bekler;
// süre dolunca anlamlı bir hatayla sonlanır.
export function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => { reject(new Error('Service worker hazır olmadı (zaman aşımı)')) }, SERVICE_WORKER_READY_TIMEOUT_MS)
    }),
  ])
}

// Android Chrome'da `new Notification()` sayfa içinde çalışmaz ("Illegal constructor");
// sistem bildirimi yalnızca service worker kaydı üzerinden gösterilebilir.
export async function showSystemNotification(title: string, options: NotificationOptions): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await waitForServiceWorker()
  await registration.showNotification(title, options)
}
