import { useCustomerPush } from '@/hooks/useCustomerPush'

// card:   randevu sonrası ekran; bütün durumlar anlatılır
// inline: karşılama ekranı; yalnızca izin düğmesi ve "açık" bilgisi (kalabalık yapmasın)
export type NotificationOptInVariant = 'card' | 'inline'

interface NotificationOptInProps {
  phone: string
  // Verilirse "1 saat kaldı" hatırlatması da bu randevu için kurulur
  appointmentId?: string | null
  variant: NotificationOptInVariant
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// Müşteriden bu cihazda bildirim izni ister (bakım daveti ve randevu hatırlatması)
export function NotificationOptIn({ phone, appointmentId = null, variant }: NotificationOptInProps) {
  const { status, error, enable } = useCustomerPush(phone, appointmentId)
  const isInline = variant === 'inline'
  const isBusy = status === 'saving'

  const handleEnable = (): void => { void enable() }

  if (status === 'enabled') {
    return (
      <p className={`flex items-center justify-center gap-2 text-gray-400 ${isInline ? 'mt-4 text-xs' : 'py-2 text-sm'}`}>
        <CheckIcon />
        Bildirimler açık
      </p>
    )
  }

  if (status === 'ask' || status === 'saving') {
    const errorText = error && <p className="text-red-500 text-xs mt-3 text-center">{error}</p>

    if (isInline) {
      return (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleEnable}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 hover:border-gray-400 active:scale-[0.98] disabled:opacity-60 text-sm font-medium py-3 rounded-full transition-all cursor-pointer"
          >
            <BellIcon />
            {isBusy ? 'Açılıyor…' : 'Randevu hatırlatmalarını aç'}
          </button>
          {errorText}
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-100 text-surface-500 flex items-center justify-center shrink-0">
            <BellIcon />
          </div>
          <div>
            <p className="text-gray-900 text-sm font-semibold">Bildirimleri açın</p>
            <p className="text-gray-500 text-sm mt-0.5">Yeni randevu zamanınız geldiğinde size bildirimle hatırlatalım.</p>
          </div>
        </div>
        {errorText}
        <button
          type="button"
          onClick={handleEnable}
          disabled={isBusy}
          className="mt-4 w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-all cursor-pointer"
        >
          {isBusy ? 'Açılıyor…' : 'Bildirimleri Aç'}
        </button>
      </div>
    )
  }

  if (isInline) return null

  if (status === 'denied') {
    return (
      <p className="text-gray-400 text-xs text-center">
        Bildirimler kapalı. Telefon ayarlarından bu siteye bildirim izni verilebilir.
      </p>
    )
  }

  if (status === 'needs-install') {
    return (
      <p className="text-gray-400 text-xs text-center">
        Bildirim almak için uygulamayı ana ekrana ekleyip oradan açın.
      </p>
    )
  }

  return null
}
