import * as Sentry from '@sentry/react'
import type { Breadcrumb, ErrorEvent } from '@sentry/react'
import { SENTRY_DSN } from '@/constants/sentry'
import { hasApiProxy, SENTRY_TUNNEL_PATH } from '@/constants/site'

// Türk cep numaraları: 5XXXXXXXXX, 05XXXXXXXXX, 905XXXXXXXXX, +905XXXXXXXXX.
// Lookbehind (?<!…) kullanılmaz: iOS 16.4 öncesi Safari bu ifadeyi tanımaz ve
// uygulamanın tamamı açılmadan çöker (beyaz ekran). Bu yüzden numaradan önceki
// karakter gruba alınır ve değiştirmede korunur.
const PHONE_PATTERN = /(^|[^\w+])(?:\+?90|0)?5\d{9}\b/g
const PHONE_REPLACEMENT = '$1[telefon]'

export function scrubPhoneNumbers(text: string): string {
  return text.replace(PHONE_PATTERN, PHONE_REPLACEMENT)
}

// Müşteri telefonları Supabase sorgu adreslerinde geçer (ör. ?customer_phone=eq.05...);
// KVKK gereği hiçbir telefon numarası Sentry'ye gönderilmez.
export function scrubEvent<T extends ErrorEvent | Breadcrumb>(event: T): T {
  return JSON.parse(scrubPhoneNumbers(JSON.stringify(event))) as T
}

function getDisplayMode(): string {
  return window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
}

function isControlledByServiceWorker(): boolean {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null
}

export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Yerel geliştirme ve testlerde hata gönderilmez
    enabled: import.meta.env.PROD,
    environment: window.location.hostname,
    // sentry.io'ya ulaşamayan bağlantılarda raporlar sitenin kendi adresinden gider
    tunnel: hasApiProxy(window.location.host) ? SENTRY_TUNNEL_PATH : undefined,
    // Cihazın hangi sürümü çalıştırdığı görülür (eski önbellekte kalan cihazlar)
    release: __APP_RELEASE__,
    initialScope: {
      tags: {
        display_mode: getDisplayMode(),
        sw_controlled: String(isControlledByServiceWorker()),
      },
    },
    // Kullanıcı, çerez, başlık, sorgu parametresi ve istek gövdesi toplanmaz
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend: (event) => {
      delete event.user
      return scrubEvent(event)
    },
    beforeBreadcrumb: (breadcrumb) => scrubEvent(breadcrumb),
  })
}

// Hata fırlatmayan ama kullanıcıyı takılı bırakan durumları (zaman aşımı,
// yüklenemeyen veri) raporlar; bunlar kendiliğinden Sentry'ye düşmez.
export function reportWarning(message: string, details?: Record<string, string>): void {
  Sentry.captureMessage(message, { level: 'warning', extra: details })
}
