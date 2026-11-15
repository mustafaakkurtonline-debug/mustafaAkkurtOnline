import {
  SPLASH_ELEMENT_ID,
  SPLASH_MIN_VISIBLE_MS,
  SPLASH_EXIT_MS,
  SPLASH_EXIT_CLASSES,
  SPLASH_SCROLL_LOCK_CLASS,
} from '@/constants/splash'

// Açılış animasyonu katmanını kaldırır. Uygulama ilk ekranını çizdikten sonra
// çağrılır: animasyon bitmeden kesilmez, bitince ekran ortadan ikiye açılarak
// kapanır, ardından katman silinir ve kaydırma açılır.
// Katman gizliyse (oturumda gösterildi / hareket azaltma) hemen kaldırılır.
export function hideSplash(): void {
  const splash = document.getElementById(SPLASH_ELEMENT_ID)
  if (!splash) return

  if (window.getComputedStyle(splash).display === 'none') {
    removeSplash(splash)
    return
  }

  void waitForIntro(splash).then(() => {
    splash.classList.add(...SPLASH_EXIT_CLASSES)
    window.setTimeout(() => { removeSplash(splash) }, SPLASH_EXIT_MS)
  })
}

function removeSplash(splash: HTMLElement): void {
  splash.remove()
  document.documentElement.classList.remove(SPLASH_SCROLL_LOCK_CLASS)
}

// Animasyonların gerçek bitişi beklenir (stil geç inerse de doğru çalışır);
// bunu bilmeyen eski tarayıcılarda sayfa açılışından itibaren sabit süre beklenir
function waitForIntro(splash: HTMLElement): Promise<void> {
  if ('getAnimations' in splash) {
    const finished = splash.getAnimations({ subtree: true }).map(animation =>
      animation.finished.then(() => undefined, () => undefined),
    )
    return Promise.all(finished).then(() => undefined)
  }
  const remainingMs = Math.max(0, SPLASH_MIN_VISIBLE_MS - performance.now())
  return new Promise(resolve => { window.setTimeout(resolve, remainingMs) })
}
