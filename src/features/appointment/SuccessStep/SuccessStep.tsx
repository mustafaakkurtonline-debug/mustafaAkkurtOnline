import { formatDateLong, formatTime, formatDuration } from '@/utils/dateUtils'
import type { AppointmentFormData } from '@/types/appointment'

interface SuccessStepProps {
  formData: AppointmentFormData
  onNewAppointment: () => void
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function SuccessStep({ formData, onNewAppointment }: SuccessStepProps) {
  const alreadyInstalled = isInStandaloneMode()
  const ios = isIos()

  return (
    <div className="pt-10 pb-4 space-y-6">
      {/* Success hero */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-green-50 border-2 border-green-200">
          <span className="text-green-600 text-4xl leading-none">✓</span>
        </div>
        <h2 className="text-gray-900 text-2xl font-bold">Randevunuz Alındı!</h2>
        <p className="text-gray-400 text-sm mt-1">Sizi bekliyoruz.</p>
      </div>

      {/* Appointment card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-surface-500">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <p className="text-gray-900 font-semibold">{formData.service.name}</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {formatDuration(formData.service.duration_minutes)} · {formData.service.price} ₺
            </p>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-xs mb-1">Tarih</p>
            <p className="text-gray-900 font-semibold text-sm">{formatDateLong(formData.date)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs mb-1">Saat</p>
            <p className="text-gray-900 font-bold text-xl leading-none">{formatTime(formData.time)}</p>
          </div>
        </div>
      </div>

      {/* PWA install */}
      {!alreadyInstalled && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📱</span>
            <p className="text-gray-900 text-sm font-semibold">Uygulamayı Ana Ekrana Ekle</p>
          </div>
          {ios ? (
            <ol className="text-gray-500 text-sm space-y-1.5 list-decimal list-inside">
              <li>Alttaki <strong className="text-gray-800">Paylaş</strong> butonuna dokunun</li>
              <li><strong className="text-gray-800">Ana Ekrana Ekle</strong> seçeneğini seçin</li>
              <li><strong className="text-gray-800">Ekle</strong>&apos;ye dokunun</li>
            </ol>
          ) : (
            <ol className="text-gray-500 text-sm space-y-1.5 list-decimal list-inside">
              <li>Tarayıcı menüsüne dokunun <strong className="text-gray-800">(⋮)</strong></li>
              <li><strong className="text-gray-800">Uygulamayı yükle</strong> veya <strong className="text-gray-800">Ana ekrana ekle</strong> seçin</li>
            </ol>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNewAppointment}
        className="w-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-400 active:scale-[0.98] font-medium py-4 rounded-full transition-all"
      >
        Yeni Randevu Al
      </button>
    </div>
  )
}
