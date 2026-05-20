import { Link } from 'react-router-dom'
import { usePWAInstall } from '@/hooks/usePWAInstall'

const WORKING_HOURS = [
  { day: 'Pazartesi', hours: '09:00 – 19:00' },
  { day: 'Salı', hours: '09:00 – 19:00' },
  { day: 'Çarşamba', hours: '09:00 – 19:00' },
  { day: 'Perşembe', hours: '09:00 – 19:00' },
  { day: 'Cuma', hours: '09:00 – 19:00' },
  { day: 'Cumartesi', hours: '09:00 – 18:00' },
  { day: 'Pazar', hours: 'Kapalı' },
]


function MapPinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mt-0.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function AboutPage() {
  const { canInstall, promptInstall } = usePWAInstall()
  const alreadyInstalled = isInStandaloneMode()

  return (
    <div className="pt-10 pb-4 space-y-7">
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

      <div className="h-px bg-gray-100" />

      {/* About text */}
      <div>
        <h2 className="text-gray-900 font-bold text-lg mb-3">Hakkımızda</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Yıllarca edindiğimiz deneyim ve ustalık ile müşterilerimize en iyi hizmeti sunmak için buradayız.
          Saç kesiminden sakal bakımına, paket hizmetlerimizle her zaman yanınızdayız.
        </p>
        <p className="text-gray-600 text-sm leading-relaxed mt-3">
          Online randevu sistemimiz sayesinde bekleme süresi olmadan, istediğiniz saatte berberimize gelebilirsiniz.
        </p>
      </div>

      {/* Working hours */}
      <div>
        <h2 className="text-gray-900 font-bold text-lg mb-3">Çalışma Saatleri</h2>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {WORKING_HOURS.map(({ day, hours }, i) => (
            <div
              key={day}
              className={`flex items-center justify-between px-4 py-3 ${i < WORKING_HOURS.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <span className="text-gray-700 text-sm font-medium">{day}</span>
              <span className={`text-sm font-semibold ${hours === 'Kapalı' ? 'text-red-400' : 'text-gray-900'}`}>
                {hours}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <h2 className="text-gray-900 font-bold text-lg mb-3">Adres</h2>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
          <MapPinIcon />
          <div>
            <p className="text-gray-800 text-sm font-medium">Mustafa Akkurt Berberi</p>
            <p className="text-gray-500 text-sm mt-0.5">Yayla, Seyitler Cd 29/A, 06020 Keçiören/Ankara</p>
          </div>
        </div>
      </div>

      {/* PWA install */}
      {!alreadyInstalled && (
        <div>
          <h2 className="text-gray-900 font-bold text-lg mb-3">Uygulamayı İndir</h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Uygulamayı ana ekranınıza ekleyin — internet olmadan da çalışır, her zaman hızlıca randevu alın.
            </p>
            {canInstall ? (
              <button
                type="button"
                onClick={() => { void promptInstall() }}
                className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <DownloadIcon />
                Uygulamayı Yükle
              </button>
            ) : (
              <Link
                to="/install"
                className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <DownloadIcon />
                Nasıl Kurulur?
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
