import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminAppointments } from '@/hooks/useAdminAppointments'
import { useBlockedSlots } from '@/hooks/useBlockedSlots'
import { AppointmentCard } from '@/features/admin/components/AppointmentCard/AppointmentCard'
import { getTodayString, addDays, formatTime } from '@/utils/dateUtils'
import type { BlockedSlot } from '@/types/admin'

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
        <div className="text-center py-8">
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

      <BlockedSlotsSection date={selectedDate} />
    </div>
  )
}

function BlockedSlotsSection({ date }: { date: string }) {
  const { blockedSlots, refetch } = useBlockedSlots(date)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: { preventDefault(): void }): Promise<void> => {
    e.preventDefault()
    if (!startTime || !endTime) { setError('Başlangıç ve bitiş saati seçmelisiniz.'); return }
    if (endTime <= startTime) { setError('Bitiş saati başlangıçtan sonra olmalı.'); return }

    setIsAdding(true)
    setError(null)

    await supabase.from('blocked_slots').insert({
      blocked_date: date,
      start_time: startTime,
      end_time: endTime,
      reason: reason.trim() || null,
    })

    setStartTime('')
    setEndTime('')
    setReason('')
    setIsAdding(false)
    refetch()
  }

  const handleDelete = async (slot: BlockedSlot): Promise<void> => {
    await supabase.from('blocked_slots').delete().eq('id', slot.id)
    refetch()
  }

  return (
    <section className="mt-6 pt-5 border-t border-gray-100">
      <h2 className="text-gray-900 font-bold text-sm mb-3">Kapalı Saat Aralıkları</h2>

      {blockedSlots.length === 0 && (
        <p className="text-gray-400 text-xs mb-4">Bu gün için kapalı saat aralığı yok.</p>
      )}

      {blockedSlots.map(slot => (
        <div
          key={slot.id}
          className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-2 flex items-center justify-between"
        >
          <div>
            <p className="text-gray-900 text-sm font-medium">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </p>
            {slot.reason && <p className="text-gray-500 text-xs mt-0.5">{slot.reason}</p>}
          </div>
          <button
            type="button"
            onClick={() => { void handleDelete(slot) }}
            className="ml-3 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-sm cursor-pointer"
            title="Kaldır"
          >
            ✕
          </button>
        </div>
      ))}

      <form
        onSubmit={(e) => { void handleAdd(e) }}
        className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-3"
      >
        <p className="text-gray-700 text-sm font-medium mb-3">Saat Aralığı Kapat</p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="time"
            value={startTime}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setStartTime(e.target.value) }}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
          />
          <span className="text-gray-400 text-xs shrink-0">–</span>
          <input
            type="time"
            value={endTime}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setEndTime(e.target.value) }}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setReason(e.target.value) }}
          placeholder="Sebep (isteğe bağlı)"
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500 mb-3"
        />
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <button
          type="submit"
          disabled={isAdding}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isAdding ? 'Ekleniyor…' : 'Kapat'}
        </button>
      </form>
    </section>
  )
}
