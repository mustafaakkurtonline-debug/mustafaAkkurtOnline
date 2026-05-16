import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useReservedSlots } from '@/hooks/useReservedSlots'
import { formatTime } from '@/utils/dateUtils'
import type { ReservedSlot } from '@/types/admin'

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

interface SlotFormData {
  customer_name: string
  day_of_week: number
  slot_time: string
  start_date: string
  end_date: string
  is_active: boolean
}

const EMPTY_FORM: SlotFormData = {
  customer_name: '',
  day_of_week: 0,
  slot_time: '09:00',
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

export function ReservedSlotsSection() {
  const { reservedSlots, isLoading, refetch } = useReservedSlots()
  const [editingSlot, setEditingSlot] = useState<ReservedSlot | null>(null)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)

  const handleToggleActive = async (slot: ReservedSlot): Promise<void> => {
    await supabase.from('reserved_slots').update({ is_active: !slot.is_active }).eq('id', slot.id)
    refetch()
  }

  const handleDelete = async (slot: ReservedSlot): Promise<void> => {
    if (!window.confirm(`${slot.customer_name} — ${DAY_NAMES[slot.day_of_week] ?? ''} ${formatTime(slot.slot_time)} slotunu silmek istiyor musunuz?`)) return
    await supabase.from('reserved_slots').delete().eq('id', slot.id)
    refetch()
  }

  const handleFormSuccess = (): void => {
    setEditingSlot(null)
    setShowAddForm(false)
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

      {!isLoading && reservedSlots.map(slot => (
        <div
          key={slot.id}
          className={`bg-white rounded-xl p-3 mb-2 border border-gray-100 shadow-sm ${!slot.is_active ? 'opacity-50' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-gray-900 text-sm font-semibold">{slot.customer_name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {DAY_NAMES[slot.day_of_week] ?? `Gün ${slot.day_of_week}`} · {formatTime(slot.slot_time)}
              </p>
              <p className="text-gray-400 text-xs">
                {slot.start_date}
                {slot.end_date ? ` → ${slot.end_date}` : ' → Süresiz'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => { void handleToggleActive(slot) }}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${slot.is_active ? 'bg-brand-500' : 'bg-gray-300'}`}
                title={slot.is_active ? 'Pasife al' : 'Aktife al'}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${slot.is_active ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
              <button
                type="button"
                onClick={() => { setEditingSlot(slot) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-100 text-gray-500 hover:bg-surface-200 transition-colors cursor-pointer"
                title="Düzenle"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => { void handleDelete(slot) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                title="Sil"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ))}

      {(showAddForm || editingSlot !== null) && (
        <SlotForm
          slot={editingSlot}
          onSuccess={handleFormSuccess}
          onCancel={() => { setEditingSlot(null); setShowAddForm(false) }}
        />
      )}
    </section>
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

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { update({ is_active: e.target.checked }) }}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-gray-600 text-sm">Aktif</span>
          </label>

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
