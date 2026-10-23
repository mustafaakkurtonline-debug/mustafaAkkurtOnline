import * as Sentry from '@sentry/react'
import type { Breadcrumb, ErrorEvent } from '@sentry/react'

// DSN gizli değildir; yalnızca hataların hangi Sentry projesine gideceğini belirtir
const SENTRY_DSN = 'https://00dc75e621e55e26b2d5e4491097c689@o4512306059608064.ingest.de.sentry.io/4512306068914256'

// Türk cep numaraları: 5XXXXXXXXX, 05XXXXXXXXX, 905XXXXXXXXX, +905XXXXXXXXX
const PHONE_PATTERN = /(?<![\w+])(?:\+?90|0)?5\d{9}\b/g
const PHONE_PLACEHOLDER = '[telefon]'

export function scrubPhoneNumbers(text: string): string {
  return text.replace(PHONE_PATTERN, PHONE_PLACEHOLDER)
}

// Müşteri telefonları Supabase sorgu adreslerinde geçer (ör. ?customer_phone=eq.05...);
// KVKK gereği hiçbir telefon numarası Sentry'ye gönderilmez.
export function scrubEvent<T extends ErrorEvent | Breadcrumb>(event: T): T {
  return JSON.parse(scrubPhoneNumbers(JSON.stringify(event))) as T
}

export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Yerel geliştirme ve testlerde hata gönderilmez
    enabled: import.meta.env.PROD,
    environment: window.location.hostname,
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
