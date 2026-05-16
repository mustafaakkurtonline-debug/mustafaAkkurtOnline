import { useState, useEffect } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkingHours } from '@/hooks/useWorkingHours'
import { useBlockedDays } from '@/hooks/useBlockedDays'
import { formatDateLong, formatTime } from '@/utils/dateUtils'
import { BannedCustomersSection } from '@/features/admin/components/BannedCustomersSection/BannedCustomersSection'
import { ReservedSlotsSection } from '@/features/reserved/ReservedSlotsSection/ReservedSlotsSection'
import type { WorkingHour, BlockedDay } from '@/types/admin'

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export function SettingsTab() {
  return (
    <div className="space-y-6">
      <WorkingHoursSection />
      <BlockedDaysSection />
      <BannedCustomersSection />
      <ReservedSlotsSection />
    </div>
  )
}

function WorkingHoursSection() {
  const { workingHours, isLoading, refetch } = useWorkingHours()
  const [localHours, setLocalHours] = useState<WorkingHour[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setLocalHours(workingHours)
  }, [workingHours])

  const updateLocal = (id: string, updates: Partial<WorkingHour>): void => {
    setLocalHours(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
  }

  const saveHour = async (hour: WorkingHour): Promise<void> => {
    setSavingId(hour.id)
    await supabase
      .from('working_hours')
      .update({ is_open: hour.is_open, open_time: hour.open_time, close_time: hour.close_time })
      .eq('id', hour.id)
    setSavingId(null)
    refetch()
  }

  return (
    <section>
      <h2 className="text-gray-900 font-bold text-base mb-3">Çalışma Saatleri</h2>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && localHours.map(hour => (
        <div key={hour.id} className="bg-white rounded-xl p-3 mb-2 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-900 text-sm font-medium w-28 shrink-0">
              {DAY_NAMES[hour.day_of_week] ?? `Gün ${hour.day_of_week}`}
            </span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hour.is_open}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  updateLocal(hour.id, { is_open: e.target.checked })
                }}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-gray-500 text-xs">Açık</span>
            </label>
          </div>

          {hour.is_open && (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="time"
                value={formatTime(hour.open_time)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  updateLocal(hour.id, { open_time: e.target.value })
                }}
                className="flex-1 bg-surface-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm outline-none focus:border-brand-500"
              />
              <span className="text-gray-400 text-xs">–</span>
              <input
                type="time"
                value={formatTime(hour.close_time)}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  updateLocal(hour.id, { close_time: e.target.value })
                }}
                className="flex-1 bg-surface-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-sm outline-none focus:border-brand-500"
              />
            </div>
          )}

          <button
            type="button"
            disabled={savingId === hour.id}
            onClick={() => { void saveHour(hour) }}
            className="w-full py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {savingId === hour.id ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      ))}
    </section>
  )
}

function BlockedDaysSection() {
  const { blockedDays, isLoading, refetch } = useBlockedDays()
  const [newDate, setNewDate] = useState<string>('')
  const [newReason, setNewReason] = useState<string>('')
  const [isAdding, setIsAdding] = useState<boolean>(false)
  const [addError, setAddError] = useState<string | null>(null)

  const handleDelete = async (day: BlockedDay): Promise<void> => {
    if (!window.confirm(`${formatDateLong(day.blocked_date)} tarihini kapalı günlerden kaldırmak istiyor musunuz?`)) return
    await supabase.from('blocked_days').delete().eq('id', day.id)
    refetch()
  }

  const handleAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!newDate) { setAddError('Tarih seçmelisiniz.'); return }
    if (!newReason.trim()) { setAddError('Sebep yazmalısınız.'); return }

    setIsAdding(true)
    setAddError(null)

    const { error } = await supabase.from('blocked_days').insert({
      blocked_date: newDate,
      reason: newReason.trim(),
    })

    if (error) {
      setAddError('Bu tarih zaten kapalı olarak işaretlenmiş.')
      setIsAdding(false)
      return
    }

    setNewDate('')
    setNewReason('')
    setIsAdding(false)
    refetch()
  }

  return (
    <section>
      <h2 className="text-gray-900 font-bold text-base mb-3">Kapalı Günler</h2>

      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && blockedDays.length === 0 && (
        <p className="text-gray-400 text-sm mb-4">Kapalı gün yok.</p>
      )}

      {!isLoading && blockedDays.map(day => (
        <div
          key={day.id}
          className="bg-white rounded-xl px-4 py-3 mb-2 border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <p className="text-gray-900 text-sm font-medium">{formatDateLong(day.blocked_date)}</p>
            <p className="text-gray-400 text-xs">{day.reason}</p>
          </div>
          <button
            type="button"
            onClick={() => { void handleDelete(day) }}
            className="ml-3 shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm cursor-pointer"
            title="Kaldır"
          >
            ✕
          </button>
        </div>
      ))}

      <form onSubmit={(e) => { void handleAdd(e) }} className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-3">
        <p className="text-gray-700 text-sm font-medium mb-3">Kapalı Gün Ekle</p>
        <div className="space-y-3">
          <input
            type="date"
            value={newDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setNewDate(e.target.value) }}
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="text"
            value={newReason}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setNewReason(e.target.value) }}
            placeholder="Sebep (ör. Bayram tatili)"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
          />
          {addError && <p className="text-red-500 text-xs">{addError}</p>}
          <button
            type="submit"
            disabled={isAdding}
            className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isAdding ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </form>
    </section>
  )
}
