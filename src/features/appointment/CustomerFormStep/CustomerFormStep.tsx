import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizePhone, formatPhoneInput, isValidTurkishPhone } from '@/utils/dateUtils'
import { MIN_NAME_LENGTH } from '@/constants/appointment'

interface CustomerFormStepProps {
  initialName: string
  initialPhone: string
  onSubmit: (name: string, phone: string) => void
  onBack: () => void
}

function KvkkModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-gray-900 font-bold text-base">KVKK Aydınlatma Metni</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4 text-sm text-gray-600 leading-relaxed">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca aydınlatma yükümlülüğü
            çerçevesinde bilgilerinize sunulmaktadır.
          </p>
          <div>
            <p className="text-gray-900 font-semibold mb-1">Veri Sorumlusu</p>
            <p>Mustafa Akkurt Berberi</p>
          </div>
          <div>
            <p className="text-gray-900 font-semibold mb-1">İşlenen Kişisel Veriler</p>
            <p>Ad soyad ve telefon numaranız randevu sistemi kapsamında işlenmektedir.</p>
          </div>
          <div>
            <p className="text-gray-900 font-semibold mb-1">İşleme Amaçları ve Hukuki Dayanağı</p>
            <p>
              Kişisel verileriniz; randevu oluşturulması, onaylanması ve bilgilendirme amacıyla,
              KVKK&apos;nın 5. maddesi uyarınca açık rızanıza dayanılarak işlenmektedir.
            </p>
          </div>
          <div>
            <p className="text-gray-900 font-semibold mb-1">Aktarım</p>
            <p>Verileriniz üçüncü kişilerle paylaşılmamaktadır.</p>
          </div>
          <div>
            <p className="text-gray-900 font-semibold mb-1">Haklarınız</p>
            <p>
              KVKK&apos;nın 11. maddesi uyarınca; verilerinize erişim, düzeltme, silme, işlemeye
              itiraz ve taşınabilirlik haklarına sahipsiniz. Bu haklarınızı kullanmak için
              berberimize başvurabilirsiniz.
            </p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-full active:scale-[0.98] transition-transform"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  )
}

export function CustomerFormStep({ initialName, initialPhone, onSubmit, onBack }: CustomerFormStepProps) {
  const [name, setName] = useState<string>(initialName)
  const [phone, setPhone] = useState<string>(
    initialPhone ? formatPhoneInput(initialPhone) : ''
  )
  const [kvkkAccepted, setKvkkAccepted] = useState<boolean>(false)
  const [showKvkk, setShowKvkk] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneInput(value))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const digits = normalizePhone(phone)

    if (trimmedName.length < MIN_NAME_LENGTH) {
      setError('Ad soyad en az 3 karakter olmalı.')
      return
    }

    if (!isValidTurkishPhone(phone)) {
      setError('Geçerli bir telefon numarası girin. (05XX XXX XX XX)')
      return
    }

    if (!kvkkAccepted) {
      setError('Devam etmek için KVKK metnini onaylamanız gerekmektedir.')
      return
    }

    setIsChecking(true)

    const today = new Date().toISOString().slice(0, 10)

    const { data: banned } = await supabase
      .from('banned_customers')
      .select('banned_until')
      .eq('customer_phone', digits)
      .gt('banned_until', today)
      .limit(1)

    setIsChecking(false)

    if (banned && banned.length > 0) {
      const until = new Date(banned[0].banned_until + 'T00:00:00').toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      setError(`Bu numara ${until} tarihine kadar randevu alamaz.`)
      return
    }

    onSubmit(trimmedName, phone)
  }

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
        <h1 className="text-gray-900 font-bold text-xl leading-tight">
          Bilgilerinizi Girin{' '}
          <span className="text-gray-400 font-normal text-base">(3/3)</span>
        </h1>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="customerName" className="block text-gray-700 text-sm font-medium">
            Ad Soyad <span className="text-gray-400">*</span>
          </label>
          <input
            id="customerName"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value) }}
            required
            autoComplete="name"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors text-base"
            placeholder="Ahmet Yılmaz"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="customerPhone" className="block text-gray-700 text-sm font-medium">
            Telefon <span className="text-gray-400">*</span>
          </label>
          <input
            id="customerPhone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => { handlePhoneChange(e.target.value) }}
            required
            autoComplete="tel"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors text-base"
            placeholder="0532 123 45 67"
          />
        </div>

        {/* KVKK consent */}
        <div className="flex items-start gap-3 pt-1">
          <button
            type="button"
            onClick={() => { setKvkkAccepted(prev => !prev) }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
              kvkkAccepted ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white'
            }`}
            aria-label="KVKK onayı"
          >
            {kvkkAccepted && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <p className="text-gray-500 text-sm leading-relaxed">
            <button
              type="button"
              onClick={() => { setShowKvkk(true) }}
              className="text-gray-900 font-semibold underline underline-offset-2 cursor-pointer"
            >
              KVKK aydınlatma metnini
            </button>{' '}
            okudum ve kişisel verilerimin işlenmesine onay veriyorum.
          </p>
        </div>

        {error !== null && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isChecking}
          className="w-full mt-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all"
        >
          {isChecking ? 'Kontrol ediliyor…' : 'Devam Et →'}
        </button>
      </form>

      {showKvkk && <KvkkModal onClose={() => { setShowKvkk(false) }} />}
    </div>
  )
}
