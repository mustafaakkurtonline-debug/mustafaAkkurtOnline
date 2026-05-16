import { useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service } from '@/types/admin'

interface ServiceFormProps {
  service?: Service | null
  onSuccess: () => void
  onCancel: () => void
}

export function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const [name, setName] = useState<string>(service?.name ?? '')
  const [duration, setDuration] = useState<number>(service?.duration_minutes ?? 30)
  const [price, setPrice] = useState<number>(service?.price ?? 0)
  const [isActive, setIsActive] = useState<boolean>(service?.is_active ?? true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) { setError('Hizmet adı zorunludur.'); return }
    if (duration < 5) { setError('Süre en az 5 dakika olmalıdır.'); return }
    if (price < 0) { setError('Fiyat 0 veya daha fazla olmalıdır.'); return }

    setIsSubmitting(true)
    setError(null)

    if (service) {
      const { error: err } = await supabase
        .from('services')
        .update({ name: name.trim(), duration_minutes: duration, price, is_active: isActive })
        .eq('id', service.id)
      if (err) { setError('Hizmet güncellenemedi.'); setIsSubmitting(false); return }
    } else {
      const { error: err } = await supabase
        .from('services')
        .insert({ name: name.trim(), duration_minutes: duration, price, is_active: isActive })
      if (err) { setError('Hizmet eklenemedi.'); setIsSubmitting(false); return }
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm border border-gray-100 shadow-xl p-5">
        <h2 className="text-gray-900 font-bold text-lg mb-4">
          {service ? 'Hizmeti Düzenle' : 'Yeni Hizmet'}
        </h2>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          <div>
            <label className="block text-gray-600 text-sm mb-1">Hizmet Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value) }}
              placeholder="Saç Kesimi"
              className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-600 text-sm mb-1">Süre (dk)</label>
              <input
                type="number"
                value={duration}
                min={5}
                step={5}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setDuration(Number(e.target.value)) }}
                className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">Fiyat (₺)</label>
              <input
                type="number"
                value={price}
                min={0}
                step={1}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setPrice(Number(e.target.value)) }}
                className="w-full bg-surface-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setIsActive(e.target.checked) }}
              className="w-4 h-4 accent-brand-500"
            />
            <span className="text-gray-600 text-sm">Aktif (müşterilere göster)</span>
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
