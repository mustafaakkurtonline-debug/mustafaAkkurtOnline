// index.html'deki açılış animasyonu katmanı
export const SPLASH_ELEMENT_ID = 'app-splash'

// Animasyonun toplam süresi (index.css: son yazı 2.45 sn'de başlar, 0.7 sn sürer).
// Tarayıcı animasyonların bitişini bildiremezse bu süre beklenir.
export const SPLASH_MIN_VISIBLE_MS = 3150

// Kapanış efektinin süresi: index.html'deki perdeler "delay-100" + "duration-700"
export const SPLASH_EXIT_MS = 800

// Kapanışı başlatan sınıflar: "is-exiting" perdeleri açar (index.html group-[.is-exiting])
export const SPLASH_EXIT_CLASSES = ['is-exiting', 'pointer-events-none'] as const

// Animasyon sürerken <html>'e eklenen kaydırma kilidi (index.html ekler)
export const SPLASH_SCROLL_LOCK_CLASS = 'overflow-hidden'
