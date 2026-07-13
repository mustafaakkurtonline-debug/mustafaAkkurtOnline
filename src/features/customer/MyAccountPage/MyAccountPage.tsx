import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPhoneInput, isValidTurkishPhone, normalizePhone, formatDateLong, formatTime, getTodayString } from '@/utils/dateUtils'
import type { AppointmentStatus } from '@/types/database'

const MAX_VISIBLE_APPOINTMENTS = 5

interface AppointmentRow {
  id: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  service_name: string | null
  duration_minutes: number | null
  price: number | null
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, { label: string; className: string }> = {
    pending:   { label: 'Bekliyor',    className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    confirmed: { label: 'Onaylandı',  className: 'bg-green-50 text-green-700 border-green-200' },
    completed: { label: 'Tamamlandı', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    no_show:   { label: 'Gelmedi',    className: 'bg-red-50 text-red-600 border-red-200' },
  }
  const { label, className } = map[status]
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${className}`}>
      {label}
    </span>
  )
}

function AppointmentCard({
  appointment,
}: {
  appointment: AppointmentRow
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 font-semibold text-sm truncate">
              {appointment.service_name ?? 'Hizmet'}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {formatDateLong(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={appointment.status} />
        </div>
      </div>
    </div>
  )
}

export function MyAccountPage() {
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [appointments, setAppointments] = useState<AppointmentRow[] | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setPhoneError(null)

    if (!isValidTurkishPhone(phone)) {
      setPhoneError('Geçerli bir telefon numarası girin. (0530 123 45 67)')
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase.rpc('get_my_appointments', {
      p_phone: normalizePhone(phone),
    })
    setIsLoading(false)

    if (error) {
      setPhoneError('Sorgu başarısız. Lütfen daha sonra tekrar deneyin.')
      return
    }

    setAppointments((data as AppointmentRow[] | null) ?? [])
  }

  const today = getTodayString()

  if (isLoading) {
    return (
      <div className="pt-20 flex justify-center">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (appointments !== null) {
    const visibleAppointments = appointments.slice(0, MAX_VISIBLE_APPOINTMENTS)
    const upcoming = visibleAppointments.filter(
      a => a.appointment_date >= today && a.status !== 'completed' && a.status !== 'no_show'
    )
    const past = visibleAppointments.filter(
      a => a.appointment_date < today || a.status === 'completed' || a.status === 'no_show'
    )

    return (
      <div className="pt-6 pb-4 space-y-6">
        <button
          type="button"
          onClick={() => { setAppointments(null) }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Geri
        </button>

        {appointments.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">Bu numaraya ait randevu bulunamadı.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                  Yaklaşan Randevular
                </h3>
                <div className="space-y-3">
                  {upcoming.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
                  Geçmiş Randevular
                </h3>
                <div className="space-y-3">
                  {past.map(a => <AppointmentCard key={a.id} appointment={a} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="pt-16 pb-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
        </div>
        <h2 className="text-gray-900 text-xl font-bold">Randevularım</h2>
        <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
          Telefon numaranızı girerek<br />randevularınızı görüntüleyin.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
        <div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(formatPhoneInput(e.target.value)) }}
            placeholder="0530 000 00 00"
            autoComplete="tel"
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 placeholder-gray-300 text-base font-medium outline-none focus:border-gray-400 transition-colors text-center tracking-wider"
          />
          {phoneError !== null && (
            <p className="text-red-500 text-xs mt-1.5 text-center">{phoneError}</p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-full transition-all active:scale-[0.98] cursor-pointer"
        >
          Randevularımı Göster
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <a
          href="/admin/dashboard"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Kuaför Girişi
        </a>
      </div>
    </div>
  )
}
