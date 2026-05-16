import { useState } from 'react'
import { useAdminAppointments } from '@/hooks/useAdminAppointments'
import { AppointmentCard } from '@/features/admin/components/AppointmentCard/AppointmentCard'
import { getTodayString, addDays } from '@/utils/dateUtils'

function formatDateHeader(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function DashboardTab() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  const { appointments, isLoading, refetch } = useAdminAppointments(selectedDate)
  const today = getTodayString()
  const isToday = selectedDate === today

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => { setSelectedDate(d => addDays(d, -1)) }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-100 text-gray-600 hover:bg-surface-200 transition-colors text-lg cursor-pointer"
        >
          ‹
        </button>

        <div className="text-center flex-1 mx-2">
          <p className="text-gray-900 font-semibold text-sm">{formatDateHeader(selectedDate)}</p>
          {!isToday && (
            <button
              type="button"
              onClick={() => { setSelectedDate(today) }}
              className="text-brand-500 text-xs mt-0.5 hover:text-brand-600 transition-colors cursor-pointer"
            >
              Bugüne git
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setSelectedDate(d => addDays(d, 1)) }}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-100 text-gray-600 hover:bg-surface-200 transition-colors text-lg cursor-pointer"
        >
          ›
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && appointments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Bu tarihte randevu yok.</p>
        </div>
      )}

      {!isLoading && appointments.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs mb-3">{appointments.length} randevu</p>
          {appointments.map(apt => (
            <AppointmentCard key={apt.id} appointment={apt} onUpdate={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}
