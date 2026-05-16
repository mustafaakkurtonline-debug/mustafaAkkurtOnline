import { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

function ScissorsIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function StepRow({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </span>
      <p className="text-gray-600 text-sm leading-relaxed mt-0.5">{children}</p>
    </div>
  )
}

export function InstallPage() {
  const { canInstall, promptInstall } = usePWAInstall()
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)
  const alreadyInstalled = isInStandaloneMode()
  const ios = isIos()

  const handleInstall = async () => {
    setInstalling(true)
    const accepted = await promptInstall()
    setInstalling(false)
    if (accepted) setInstalled(true)
  }

  if (alreadyInstalled || installed) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center">
          <span className="text-green-600 text-4xl leading-none">✓</span>
        </div>
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">Uygulama Hazır!</h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Ana ekranınızdan randevu alabilirsiniz.
          </p>
        </div>
        <a
          href="/"
          className="w-full max-w-xs bg-gray-900 text-white font-bold py-4 rounded-full text-center block active:scale-[0.98] transition-transform"
        >
          Randevu Al →
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col px-6 py-14">
      {/* App identity */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-24 h-24 rounded-3xl bg-gray-900 flex items-center justify-center mb-5 shadow-lg">
          <span className="text-brand-400">
            <ScissorsIcon />
          </span>
        </div>
        <h1 className="font-serif text-gray-900 text-3xl font-bold tracking-wide">
          Mustafa Akkurt
        </h1>
        <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider font-medium">Berberi</p>
        <p className="text-gray-500 text-sm mt-4 leading-relaxed max-w-xs">
          Uygulamayı ana ekranınıza ekleyin — tek dokunuşla randevu alın, bekleme olmadan.
        </p>
      </div>

      {/* Install action */}
      {canInstall ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => { void handleInstall() }}
            disabled={installing}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <DownloadIcon />
            {installing ? 'Yükleniyor…' : 'Uygulamayı Yükle'}
          </button>
        </div>
      ) : ios ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-gray-900 font-semibold text-sm">Safari ile ekleyin:</p>
          <div className="space-y-3.5">
            <StepRow num={1}>
              Alt çubuktaki{' '}
              <strong className="text-gray-900">Paylaş ↑</strong>{' '}
              butonuna dokunun
            </StepRow>
            <StepRow num={2}>
              <strong className="text-gray-900">Ana Ekrana Ekle</strong>{' '}
              seçeneğine dokunun
            </StepRow>
            <StepRow num={3}>
              Sağ üstteki{' '}
              <strong className="text-gray-900">Ekle</strong>{' '}
              butonuna dokunun
            </StepRow>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <p className="text-gray-900 font-semibold text-sm">Tarayıcı menüsünden ekleyin:</p>
          <div className="space-y-3.5">
            <StepRow num={1}>
              Tarayıcı menüsüne dokunun{' '}
              <strong className="text-gray-900">(⋮ veya ⋯)</strong>
            </StepRow>
            <StepRow num={2}>
              <strong className="text-gray-900">"Uygulamayı yükle"</strong>{' '}
              veya{' '}
              <strong className="text-gray-900">"Ana ekrana ekle"</strong>{' '}
              seçeneğine dokunun
            </StepRow>
          </div>
        </div>
      )}

      <a
        href="/"
        className="mt-8 text-center block text-gray-400 text-sm"
      >
        ← Randevuya dön
      </a>
    </div>
  )
}
