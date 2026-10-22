import { CANONICAL_URL, isOutdatedAddress } from '@/constants/site'

export function AddressMigrationBanner() {
  if (!isOutdatedAddress(window.location.host)) return null

  return (
    <div className="mx-4 mt-3 mb-1 bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
            <path d="M12 9v4" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-amber-900 text-sm font-bold leading-tight">
            Uygulamamız yeni adrese taşındı
          </p>
          <p className="text-amber-800 text-xs mt-1 leading-relaxed">
            Randevularınızın kesintisiz devam etmesi için yeni adresten açıp
            ana ekranınıza ekleyin. Eski uygulamayı silebilirsiniz.
          </p>
        </div>
      </div>
      <a
        href={CANONICAL_URL}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold py-3 rounded-xl transition-colors active:scale-[0.98]"
      >
        Yeni Adrese Git
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </a>
    </div>
  )
}
