import { useWorkingHours } from '@/hooks/useWorkingHours'
import { formatTime } from '@/utils/dateUtils'

const PHONE = '0507 873 19 10'

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = phone.replace(/\D/g, '')
  const tr = normalized.startsWith('0') ? `90${normalized.slice(1)}` : normalized
  return `https://wa.me/${tr}?text=${encodeURIComponent(message)}`
}

export function ContactPage() {
  const waLink = buildWhatsAppLink(PHONE, 'Merhaba, randevu hakkında bilgi almak istiyorum.')
  const { workingHours, isLoading } = useWorkingHours()

  return (
    <div className="pt-10 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img
          src="/icons/mustafaAkkurthair.png"
          alt="Mustafa Akkurt"
          className="w-16 h-16 rounded-2xl object-cover shadow-sm shrink-0"
        />
        <div>
          <h1 className="font-serif text-gray-900 text-3xl font-bold tracking-tight leading-tight">
            Mustafa Akkurt
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Online Randevu</p>
        </div>
      </div>

      {/* Phone */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <a
          href={`tel:${PHONE.replace(/\s/g, '')}`}
          className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
        >
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-xl leading-none">📞</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Telefon</p>
            <p className="text-gray-900 font-semibold">{PHONE}</p>
          </div>
          <span className="ml-auto text-gray-300 text-lg">›</span>
        </a>
      </div>

      {/* WhatsApp */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
        >
          <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
            <span className="text-xl leading-none">💬</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">WhatsApp</p>
            <p className="text-gray-900 font-semibold">Mesaj Gönder</p>
          </div>
          <span className="ml-auto text-gray-300 text-lg">›</span>
        </a>
      </div>

      {/* Address */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-start gap-4 px-4 py-4">
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-xl leading-none">📍</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Adres</p>
            <p className="text-gray-900 font-semibold">Mustafa Akkurt Berberi</p>
            <p className="text-gray-500 text-sm mt-0.5">Yayla, Seyitler Cd 29/A, 06020 Keçiören/Ankara</p>
          </div>
        </div>
      </div>

      {/* Working hours */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
        <p className="text-gray-700 text-sm font-semibold mb-3">Çalışma Saatleri</p>
        {isLoading ? (
          <div className="flex justify-center py-3">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {workingHours.map(wh => (
              <div key={wh.id} className="flex justify-between text-sm">
                <span className="text-gray-500">{DAY_NAMES[wh.day_of_week] ?? `Gün ${wh.day_of_week}`}</span>
                {wh.is_open ? (
                  <span className="text-gray-800 font-medium">
                    {formatTime(wh.open_time)} – {formatTime(wh.close_time)}
                  </span>
                ) : (
                  <span className="text-red-400 font-medium">Kapalı</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
