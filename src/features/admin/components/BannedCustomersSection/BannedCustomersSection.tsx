import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useBannedCustomers } from '@/hooks/useBannedCustomers'
import { formatDateLong, getTodayString } from '@/utils/dateUtils'
import type { BannedCustomer } from '@/types/admin'

export function BannedCustomersSection() {
  const { bannedCustomers, isLoading, refetch } = useBannedCustomers()
  const [newPhone, setNewPhone] = useState<string>('')
  const [newUntil, setNewUntil] = useState<string>('')
  const [newReason, setNewReason] = useState<string>('')
  const [isAdding, setIsAdding] = useState<boolean>(false)
  const [addError, setAddError] = useState<string | null>(null)
  const today = getTodayString()

  const handleDelete = async (ban: BannedCustomer): Promise<void> => {
    if (!window.confirm(`${ban.customer_phone} numaralı yasağı kaldırmak istiyor musunuz?`)) return
    await supabase.from('banned_customers').delete().eq('id', ban.id)
    refetch()
  }

  const handleAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const phone = newPhone.replace(/\D/g, '')
    if (!phone) { setAddError('Telefon numarası zorunludur.'); return }
    if (!newUntil) { setAddError('Yasak bitiş tarihi zorunludur.'); return }
    if (!newReason.trim()) { setAddError('Sebep yazmalısınız.'); return }

    setIsAdding(true)
    setAddError(null)

    const { error } = await supabase.from('banned_customers').insert({
      customer_phone: phone,
      banned_until: newUntil,
      reason: newReason.trim(),
    })

    if (error) {
      setAddError('Kayıt eklenemedi. Lütfen tekrar deneyin.')
      setIsAdding(false)
      return
    }

    setNewPhone('')
    setNewUntil('')
    setNewReason('')
    setIsAdding(false)
    refetch()
  }

  return (
    <section>
      <h2 className="text-gray-900 font-bold text-base mb-3">Yasaklı Müşteriler</h2>

      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && bannedCustomers.length === 0 && (
        <p className="text-gray-400 text-sm mb-4">Yasaklı müşteri yok.</p>
      )}

      {!isLoading && bannedCustomers.map(ban => {
        const isExpired = ban.banned_until < today
        return (
          <div
            key={ban.id}
            className={`bg-white rounded-xl px-4 py-3 mb-2 border border-gray-100 shadow-sm flex items-start justify-between gap-3 ${
              isExpired ? 'opacity-50' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-gray-900 text-sm font-medium">{ban.customer_phone}</p>
                {isExpired && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 text-gray-400 border border-gray-200">
                    Süresi doldu
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                {isExpired ? 'Bitiş:' : 'Yasak bitiş:'} {formatDateLong(ban.banned_until)}
              </p>
              <p className="text-gray-400 text-xs">{ban.reason}</p>
            </div>
            <button
              type="button"
              onClick={() => { void handleDelete(ban) }}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm cursor-pointer"
              title="Yasağı kaldır"
            >
              ✕
            </button>
          </div>
        )
      })}

      <form onSubmit={(e) => { void handleAdd(e) }} className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-3">
        <p className="text-gray-700 text-sm font-medium mb-3">Manuel Ban Ekle</p>
        <div className="space-y-3">
          <input
            type="tel"
            value={newPhone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setNewPhone(e.target.value) }}
            placeholder="Telefon numarası (ör. 5551234567)"
            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
          />
          <div>
            <label className="block text-gray-600 text-xs mb-1">Yasak bitiş tarihi</label>
            <input
              type="date"
              value={newUntil}
              onChange={(e: ChangeEvent<HTMLInputElement>) => { setNewUntil(e.target.value) }}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <input
            type="text"
            value={newReason}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setNewReason(e.target.value) }}
            placeholder="Sebep"
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
