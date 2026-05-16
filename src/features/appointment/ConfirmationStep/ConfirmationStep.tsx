import { formatDateLong, formatTime, formatDuration } from '@/utils/dateUtils'
import type { AppointmentFormData } from '@/types/appointment'

interface ConfirmationStepProps {
  formData: AppointmentFormData
  isSubmitting: boolean
  submitError: string | null
  onConfirm: () => void
  onBack: () => void
}

export function ConfirmationStep({
  formData,
  isSubmitting,
  submitError,
  onConfirm,
  onBack,
}: ConfirmationStepProps) {
  return (
    <div className="pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
          aria-label="Geri"
        >
          ←
        </button>
        <h1 className="text-gray-900 font-bold text-xl">Randevu Özeti</h1>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Service row */}
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

        {/* Detail rows */}
        <div className="px-5 py-4 space-y-3.5">
          <Row label="Tarih" value={formatDateLong(formData.date)} />
          <Row label="Saat" value={formatTime(formData.time)} bold />
          <div className="border-t border-gray-100" />
          <Row label="Ad Soyad" value={formData.customerName} />
          <Row label="Telefon" value={formData.customerPhone} />
        </div>
      </div>

      {submitError !== null && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-red-600 text-sm">{submitError}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={isSubmitting}
        className="w-full mt-6 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all"
      >
        {isSubmitting ? 'Oluşturuluyor…' : 'Randevuyu Onayla →'}
      </button>
    </div>
  )
}

interface RowProps {
  label: string
  value: string
  bold?: boolean
}

function Row({ label, value, bold = false }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-400 text-sm shrink-0">{label}</span>
      <span className={`text-sm text-right ${bold ? 'text-gray-900 font-bold text-base' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}
