import { BrandHeader } from '@/components/layout/BrandHeader/BrandHeader'
import { formatPhoneInput } from '@/utils/dateUtils'

interface WelcomeStepProps {
  firstName: string
  phone: string
  onContinue: () => void
  onChangePhone: () => void
}

// Numarası doğrulanan kayıtlı müşteriyi adıyla karşılar. Yanlış kişi
// (ör. numara hatalı yazıldı) burada fark edip numarayı değiştirebilir.
export function WelcomeStep({ firstName, phone, onContinue, onChangePhone }: WelcomeStepProps) {
  return (
    <div className="pt-10 pb-4">
      <BrandHeader />

      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-8 shadow-sm text-center">
        <p className="text-4xl mb-4" aria-hidden="true">👋</p>
        <p className="text-gray-500 text-base">Hoş geldiniz{firstName ? ',' : ''}</p>
        {firstName && (
          <h2 className="font-serif text-gray-900 text-3xl font-bold mt-1 break-words">{firstName}</h2>
        )}
        <p className="text-gray-500 text-sm mt-4">
          Randevunuzu birkaç adımda oluşturabilirsiniz.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all cursor-pointer"
        >
          Randevu Al →
        </button>
      </div>

      <button
        type="button"
        onClick={onChangePhone}
        className="mt-5 w-full text-gray-500 text-sm py-2 cursor-pointer"
      >
        Siz değil misiniz?{' '}
        <span className="text-gray-900 font-medium underline">Numarayı değiştir</span>
      </button>
      <p className="text-gray-400 text-xs text-center">{formatPhoneInput(phone)}</p>
    </div>
  )
}
