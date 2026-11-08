import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useApprovedCustomers } from '@/hooks/useApprovedCustomers'
import { formatPhoneInput, isValidTurkishPhone, normalizePhone } from '@/utils/dateUtils'
import { MIN_NAME_LENGTH } from '@/constants/appointment'
import type { ApprovedCustomer } from '@/types/admin'

// Aynı numara ikinci kez eklenmek istendiğinde Postgres'in benzersizlik hatası
const UNIQUE_VIOLATION_CODE = '23505'
const LOCALE = 'tr-TR'

// Online randevu yalnızca bu listedeki numaralara açıktır (migration 015)
export function CustomersTab() {
  const { customers, isLoading, hasError, refetch } = useApprovedCustomers()
  const [query, setQuery] = useState<string>('')

  const visibleCustomers = useMemo(
    () => filterCustomers(customers, query).sort((a, b) => a.customer_name.localeCompare(b.customer_name, LOCALE)),
    [customers, query],
  )

  const handleDelete = async (customer: ApprovedCustomer): Promise<void> => {
    const confirmed = window.confirm(
      `${customer.customer_name} listeden çıkarılsın mı? Bu numarayla artık online randevu alınamaz.`,
    )
    if (!confirmed) return
    const { error } = await supabase.from('approved_customers').delete().eq('id', customer.id)
    if (error) window.alert('Müşteri silinemedi. Lütfen tekrar deneyin.')
    refetch()
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-gray-900 font-bold text-base">Müşterilerim</h2>
        <p className="text-gray-500 text-xs mt-1 mb-3">
          Online randevuyu yalnızca bu listedeki numaralar alabilir.
        </p>
        <AddCustomerForm onAdded={refetch} />
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <input
            type="search"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => { setQuery(e.target.value) }}
            placeholder="İsim veya numara ara"
            className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
          />
          {!isLoading && !hasError && (
            <span className="text-gray-400 text-xs shrink-0">{customers.length} müşteri</span>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && hasError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-red-700 text-sm">Müşteri listesi yüklenemedi.</p>
            <button
              type="button"
              onClick={refetch}
              className="shrink-0 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {!isLoading && !hasError && visibleCustomers.length === 0 && (
          <p className="text-gray-400 text-sm">
            {customers.length === 0 ? 'Listede müşteri yok.' : 'Aramaya uyan müşteri yok.'}
          </p>
        )}

        {!isLoading && !hasError && visibleCustomers.map(customer => (
          <div
            key={customer.id}
            className="bg-white rounded-xl px-4 py-3 mb-2 border border-gray-100 shadow-sm flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-gray-900 text-sm font-medium truncate">{customer.customer_name}</p>
              <p className="text-gray-500 text-xs mt-0.5">{formatPhoneInput(customer.customer_phone)}</p>
            </div>
            <button
              type="button"
              onClick={() => { void handleDelete(customer) }}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-sm cursor-pointer"
              title="Listeden çıkar"
              aria-label={`${customer.customer_name} listeden çıkar`}
            >
              ✕
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}

function filterCustomers(customers: ApprovedCustomer[], query: string): ApprovedCustomer[] {
  const text = query.trim().toLocaleLowerCase(LOCALE)
  if (!text) return [...customers]
  const digits = normalizePhone(text)
  return customers.filter(c =>
    c.customer_name.toLocaleLowerCase(LOCALE).includes(text) ||
    (digits.length > 0 && c.customer_phone.includes(digits)),
  )
}

interface AddCustomerFormProps {
  onAdded: () => void
}

function AddCustomerForm({ onAdded }: AddCustomerFormProps) {
  const [name, setName] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [isAdding, setIsAdding] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < MIN_NAME_LENGTH) { setError('Ad soyad en az 3 karakter olmalı.'); return }
    if (!isValidTurkishPhone(phone)) { setError('Geçerli bir telefon numarası girin. (05XX XXX XX XX)'); return }

    setIsAdding(true)
    setError(null)

    const { error: insertError } = await supabase.from('approved_customers').insert({
      customer_name: trimmedName,
      customer_phone: normalizePhone(phone),
    })

    setIsAdding(false)

    if (insertError) {
      setError(insertError.code === UNIQUE_VIOLATION_CODE
        ? 'Bu numara zaten listede.'
        : 'Müşteri eklenemedi. Lütfen tekrar deneyin.')
      return
    }

    setName('')
    setPhone('')
    onAdded()
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e) }} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="text-gray-700 text-sm font-medium mb-3">Müşteri Ekle</p>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setName(e.target.value) }}
          placeholder="Ad soyad"
          autoComplete="off"
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { setPhone(formatPhoneInput(e.target.value)) }}
          placeholder="0532 123 45 67"
          autoComplete="off"
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-brand-500"
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={isAdding}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isAdding ? 'Ekleniyor…' : 'Ekle'}
        </button>
      </div>
    </form>
  )
}
