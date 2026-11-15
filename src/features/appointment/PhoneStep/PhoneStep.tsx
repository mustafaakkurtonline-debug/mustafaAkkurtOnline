import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { BrandHeader } from '@/components/layout/BrandHeader/BrandHeader'
import { normalizePhone, formatPhoneInput, isValidTurkishPhone, getTodayString } from '@/utils/dateUtils'
import { buildWhatsAppUrl } from '@/utils/whatsapp'
import { formatFirstName } from '@/utils/formatName'
import { SHOP_PHONE } from '@/constants/shop'

// PostgREST: çağrılan veritabanı fonksiyonu yok
const FUNCTION_NOT_FOUND_CODE = 'PGRST202'

interface FirstNameLookup {
  // null = kayıtlı değil; boş metin = kayıtlı ama adı bilinmiyor
  data: string | null
  error: { message: string } | null
}

// İsim fonksiyonu (migration 016) veritabanına henüz eklenmemişse eski
// evet/hayır kontrolüne (015) düşülür; müşteri adsız "Hoş geldiniz" görür.
async function lookupFirstName(digits: string): Promise<FirstNameLookup> {
  const named = await supabase.rpc('approved_customer_first_name', { p_phone: digits })
  if (named.error?.code !== FUNCTION_NOT_FOUND_CODE) return { data: named.data, error: named.error }

  const approved = await supabase.rpc('is_approved_customer', { p_phone: digits })
  if (approved.error) return { data: null, error: approved.error }
  return { data: approved.data ? '' : null, error: null }
}

interface PhoneStepProps {
  initialPhone: string
  onVerified: (phone: string, firstName: string) => void
}

// Online randevu yalnızca berberin müşteri listesindeki numaralara açıktır
// (supabase/migrations/015). Liste dışarı verilmez; numara kayıtlıysa yalnızca
// karşılama için ilk ad döner (016). Aynı kural veritabanında da uygulanır.
export function PhoneStep({ initialPhone, onVerified }: PhoneStepProps) {
  const [phone, setPhone] = useState<string>(initialPhone ? formatPhoneInput(initialPhone) : '')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [isNotRegistered, setIsNotRegistered] = useState<boolean>(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!isValidTurkishPhone(phone)) {
      setError('Geçerli bir telefon numarası girin. (05XX XXX XX XX)')
      return
    }

    const digits = normalizePhone(phone)
    setIsChecking(true)

    const [approval, ban] = await Promise.all([
      lookupFirstName(digits),
      supabase
        .from('banned_customers')
        .select('banned_until')
        .eq('customer_phone', digits)
        .gt('banned_until', getTodayString())
        .limit(1),
    ])

    setIsChecking(false)

    if (approval.error || ban.error) {
      setError('Numara kontrol edilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.')
      return
    }

    // null = kayıtlı değil; boş metin = kayıtlı ama adı yazılmamış
    if (approval.data === null) {
      setIsNotRegistered(true)
      return
    }

    const activeBan = ban.data[0]
    if (activeBan) {
      const until = new Date(activeBan.banned_until + 'T00:00:00').toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      setError(`Bu numara ${until} tarihine kadar randevu alamaz.`)
      return
    }

    onVerified(phone, formatFirstName(approval.data))
  }

  if (isNotRegistered) {
    return (
      <NotRegisteredNotice
        phone={phone}
        onRetry={() => { setIsNotRegistered(false) }}
      />
    )
  }

  return (
    <div className="pt-10 pb-4">
      <BrandHeader />

      <h2 className="text-gray-900 text-2xl font-bold mb-2">Telefon Numaranız</h2>
      <p className="text-gray-500 text-sm mb-6">
        Online randevu kayıtlı müşterilerimize özeldir. Devam etmek için numaranızı girin.
      </p>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-5">
        <input
          id="customerPhone"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => { setPhone(formatPhoneInput(e.target.value)) }}
          required
          autoComplete="tel"
          aria-label="Telefon numarası"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition-colors text-base"
          placeholder="0532 123 45 67"
        />

        {error !== null && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isChecking}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all"
        >
          {isChecking ? 'Kontrol ediliyor…' : 'Devam Et →'}
        </button>
      </form>
    </div>
  )
}

interface NotRegisteredNoticeProps {
  phone: string
  onRetry: () => void
}

function NotRegisteredNotice({ phone, onRetry }: NotRegisteredNoticeProps) {
  const whatsAppUrl = buildWhatsAppUrl(
    SHOP_PHONE,
    `Merhaba, online randevu için müşteri listenize eklenmek istiyorum.\nAdım: \nNumaram: ${phone}`,
  )

  return (
    <div className="pt-10 pb-4">
      <BrandHeader />

      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-6 shadow-sm">
        <h2 className="text-gray-900 text-xl font-bold mb-2">Kayıtlı müşteri bulunamadı</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          <span className="text-gray-900 font-medium">{phone}</span> numarası müşteri listemizde yok.
          Online randevu yalnızca kayıtlı müşterilerimize açıktır.
        </p>
        <p className="text-gray-500 text-sm leading-relaxed mt-3">
          Müşterimizseniz WhatsApp'tan yazın, numaranızı listeye ekleyelim.
        </p>

        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-full transition-colors"
        >
          WhatsApp'tan Yaz
        </a>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 w-full text-gray-600 font-medium py-3 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Başka numara dene
        </button>
      </div>
    </div>
  )
}
