import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useReservedSlots } from '@/hooks/useReservedSlots'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch/ToggleSwitch'
import { formatTime, formatDateLong, getTodayString, getNextDateForDbDay, getJsDayOfWeek, jsToDbDayOfWeek } from '@/utils/dateUtils'
import type { ReservedSlot, ReservedSlotException } from '@/types/admin'

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

const UNIQUE_VIOLATION_CODE = '23505'

interface SlotFormData {
  customer_name: string
  day_of_week: number
  slot_time: string
  duration_minutes: number
  start_date: string
  end_date: string
  is_active: boolean
}

const EMPTY_FORM: SlotFormData = {
  customer_name: '',
  day_of_week: 0,
  slot_time: '09:00',
  duration_minutes: 60,
  start_date: '',
  end_date: '',
  is_active: true,
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function CalendarOffIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="10" y1="14" x2="14" y2="18" />
      <line x1="14" y1="14" x2="10" y2="18" />
    </svg>
  )
}

export function ReservedSlotsSection() {
  const { reservedSlots, exceptions, isLoading, refetch } = useReservedSlots()
  const [editingSlot, setEditingSlot] = useState<ReservedSlot | null>(null)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [exceptionSlot, setExceptionSlot] = useState<ReservedSlot | null>(null)

  const handleToggleActive = async (slot: ReservedSlot): Promise<void> => {
    await supabase.from('reserved_slots').update({ is_active: !slot.is_active }).eq('id', slot.id)
    refetch()
  }

  const handleDelete = async (slot: ReservedSlot): Promise<void> => {
    if (!window.confirm(`${slot.customer_name} — ${DAY_NAMES[slot.day_of_week] ?? ''} ${formatTime(slot.slot_time)} slotunu silmek istiyor musunuz?`)) return
    await supabase.from('reserved_slots').delete().eq('id', slot.id)
    refetch()
  }

  const handleDeleteException = async (exception: ReservedSlotException): Promise<void> => {
    await supabase.from('reserved_slot_exceptions').delete().eq('id', exception.id)
    refetch()
  }

  const handleFormSuccess = (): void => {
    setEditingSlot(null)
    setShowAddForm(false)
    setExceptionSlot(null)
    refetch()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-900 font-bold text-base">Sabit Müşteri Slotları</h2>
        <button
          type="button"
          onClick={() => { setShowAddForm(true) }}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          + Ekle
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && reservedSlots.length === 0 && (
        <p className="text-gray-400 text-sm mb-2">Sabit slot yok.</p>
      )}

      {!isLoading && reservedSlots.map(slot => {
        const slotExceptions = exceptions.filter(ex => ex.reserved_slot_id === slot.id)
        return (
          <div
            key={slot.id}
            className="bg-white rounded-xl p-3 mb-2 border border-gray-100 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold truncate ${slot.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {slot.customer_name}
                  </p>
                  {!slot.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 text-gray-400 border border-gray-200 shrink-0">
                      Pasif
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  {DAY_NAMES[slot.day_of_week] ?? `Gün ${slot.day_of_week}`} · {formatTime(slot.slot_time)} · {slot.duration_minutes} dk
                </p>
                <p className="text-gray-400 text-xs">
                  {slot.start_date}
                  {slot.end_date ? ` → ${slot.end_date}` : ' → Süresiz'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ToggleSwitch
                  checked={slot.is_active}
                  onChange={() => { void handleToggleActive(slot) }}
                  label={slot.is_active ? 'Pasife al' : 'Aktife al'}
                />
                {slot.is_active && (
                  <button
                    type="button"
                    onClick={() => { setExceptionSlot(slot) }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                    title="Tek tarihe özel değişiklik (ertele / o gün yok)"
                  >
                    <CalendarOffIcon />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setEditingSlot(slot) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 text-gray-500 hover:bg-surface-200 transition-colors cursor-pointer"
                  title="Düzenle"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => { void handleDelete(slot) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                  title="Sil"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {slotExceptions.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1.5">
                {slotExceptions.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between gap-2">
                    <p className="text-amber-600 text-xs">
                      {formatDateLong(ex.exception_date)} —{' '}
                      {ex.new_time ? `saat ${formatTime(ex.new_time)}'e alındı` : 'o gün gelmiyor'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { void handleDeleteException(ex) }}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="İstisnayı geri al"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {(showAddForm || editingSlot !== null) && (
        <SlotForm
          slot={editingSlot}
          onSuccess={handleFormSuccess}
          onCancel={() => { setEditingSlot(null); setShowAddForm(false) }}
        />
      )}

      {exceptionSlot !== null && (
        <ExceptionForm
          slot={exceptionSlot}
          onSuccess={handleFormSuccess}
          onCancel={() => { setExceptionSlot(null) }}
        />
      )}
    </section>
  )
}

type ExceptionMode = 'skip' | 'move'

interface ExceptionFormProps {
  slot: ReservedSlot
  onSuccess: () => void
  onCancel: () => void
}

function ExceptionForm({ slot, onSuccess, onCancel }: ExceptionFormProps) {
  const [exceptionDate, setExceptionDate] = useState<string>(getNextDateForDbDay(slot.day_of_week))
  const [mode, setMode] = useState<ExceptionMode>('skip')
  const [newTime, setNewTime] = useState<string>(formatTime(slot.slot_time))
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const dayName = DAY_NAMES[slot.day_of_week] ?? ''

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!exceptionDate) { setError('Tarih zorunludur.'); return }
    if (exceptionDate < getTodayString()) { setError('Geçmiş bir tarih seçilemez.'); return }
    if (jsToDbDayOfWeek(getJsDayOfWeek(exceptionDate)) !== slot.day_of_week) {
      setError(`Seçilen tarih ${dayName} gününe denk gelmiyor.`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    const { error: err } = await supabase.from('reserved_slot_exceptions').insert({
      reserved_slot_id: slot.id,
      exception_date: exceptionDate,
      new_time: mode === 'move' ? newTime : null,
    })

    if (err) {
      setError(err.code === UNIQUE_VIOLATION_CODE
        ? 'Bu tarih için zaten bir istisna mevcut. Önce onu geri alın.'
        : 'İstisna kaydedilemedi.')
      setIsSubmitting(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-100 shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <h2 className="text-gray-900 font-bold text-lg mb-1">Tek Tarihe Özel Değişiklik</h2>
        <p className="text-gray-500 text-sm mb-4">
          {slot.customer_name} · {dayName} {formatTime(slot.slot_time)} — sadece seçilen tarih etkilenir, slot kalıcı olarak değişmez.
        </p>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-1">Tarih ({dayName})</label>
            <input
              type="date"
              value={exceptionDate}
              min={getTodayString()}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setExceptionDate(e.target.value) }}
              className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">Ne yapılacak?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setMode('skip') }}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  mode === 'skip'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-surface-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                O gün gelmiyor
              </button>
              <button
                type="button"
                onClick={() => { setMode('move') }}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  mode === 'move'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-surface-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                Saati değiştir
              </button>
            </div>
          </div>

          {mode === 'move' && (
            <div>
              <label className="block text-gray-600 text-sm mb-1">O günkü yeni saat</label>
              <input
                type="time"
                value={newTime}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setNewTime(e.target.value) }}
                className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
              />
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-surface-100 text-gray-600 text-sm font-medium hover:bg-surface-200 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SlotFormProps {
  slot?: ReservedSlot | null
  onSuccess: () => void
  onCancel: () => void
}

function SlotForm({ slot, onSuccess, onCancel }: SlotFormProps) {
  const [form, setForm] = useState<SlotFormData>(
    slot
      ? {
          customer_name: slot.customer_name,
          day_of_week: slot.day_of_week,
          slot_time: formatTime(slot.slot_time),
          duration_minutes: slot.duration_minutes,
          start_date: slot.start_date,
          end_date: slot.end_date ?? '',
          is_active: slot.is_active,
        }
      : EMPTY_FORM,
  )
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Partial<SlotFormData>): void => {
    setForm(prev => ({ ...prev, ...patch }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!form.customer_name.trim()) { setError('Müşteri adı zorunludur.'); return }
    if (!form.start_date) { setError('Başlangıç tarihi zorunludur.'); return }
    if (form.end_date && form.end_date <= form.start_date) { setError('Bitiş tarihi başlangıçtan sonra olmalıdır.'); return }

    setIsSubmitting(true)
    setError(null)

    const payload = {
      customer_name: form.customer_name.trim(),
      day_of_week: form.day_of_week,
      slot_time: form.slot_time,
      duration_minutes: form.duration_minutes,
      start_date: form.start_date,
      end_date: form.end_date || null,
      is_active: form.is_active,
    }

    if (slot) {
      const { error: err } = await supabase.from('reserved_slots').update(payload).eq('id', slot.id)
      if (err) { setError('Slot güncellenemedi.'); setIsSubmitting(false); return }
    } else {
      const { error: err } = await supabase.from('reserved_slots').insert(payload)
      if (err) { setError('Slot eklenemedi.'); setIsSubmitting(false); return }
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-100 shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <h2 className="text-gray-900 font-bold text-lg mb-4">
          {slot ? 'Slotu Düzenle' : 'Yeni Sabit Slot'}
        </h2>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-1">Müşteri Adı</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { update({ customer_name: e.target.value }) }}
              placeholder="Ad Soyad"
              className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-600 text-sm mb-1">Gün</label>
              <select
                value={form.day_of_week}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => { update({ day_of_week: Number(e.target.value) }) }}
                className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
              >
                {DAY_NAMES.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">Saat</label>
              <input
                type="time"
                value={form.slot_time}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { update({ slot_time: e.target.value }) }}
                className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">Süre</label>
            <select
              value={form.duration_minutes}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => { update({ duration_minutes: Number(e.target.value) }) }}
              className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
            >
              <option value={30}>30 dakika</option>
              <option value={45}>45 dakika</option>
              <option value={60}>60 dakika (1 saat)</option>
              <option value={90}>90 dakika</option>
              <option value={120}>120 dakika (2 saat)</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { update({ start_date: e.target.value }) }}
              className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-gray-600 text-sm mb-1">
              Bitiş Tarihi <span className="text-gray-400">(boş = süresiz)</span>
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { update({ end_date: e.target.value }) }}
              className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-between gap-3 bg-surface-50 border border-gray-200 rounded-xl px-3 py-3">
            <div className="min-w-0">
              <p className="text-gray-900 text-sm font-medium">Slot aktif</p>
              <p className="text-gray-400 text-xs mt-0.5">Pasifken bu saat müşterilere açılır.</p>
            </div>
            <ToggleSwitch
              checked={form.is_active}
              onChange={() => { update({ is_active: !form.is_active }) }}
              label="Slot aktif"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-surface-100 text-gray-600 text-sm font-medium hover:bg-surface-200 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
