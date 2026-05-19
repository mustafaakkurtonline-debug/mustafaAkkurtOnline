import { useServices } from '@/hooks/useServices'
import { formatDuration } from '@/utils/dateUtils'
import type { Service } from '@/types/appointment'

interface ServiceStepProps {
  onSelect: (service: Service) => void
}

function ScissorsIcon({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

export function ServiceStep({ onSelect }: ServiceStepProps) {
  const { services, isLoading, error } = useServices()

  return (
    <div className="pt-10 pb-4">
      {/* Branding header */}
      <div className="mb-8 flex items-center gap-4">
        <img
          src="/icons/mustafaAkkurthair.png"
          alt="Mustafa Akkurt"
          className="w-16 h-16 rounded-2xl object-cover shadow-sm"
        />
        <div>
          <h1 className="font-serif text-gray-900 text-3xl font-bold tracking-tight leading-tight">
            Mustafa Akkurt
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Online Randevu</p>
        </div>
      </div>

      <h2 className="text-gray-900 text-2xl font-bold mb-6">Hizmet Seçin</h2>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error !== null && (
        <p className="text-red-500 text-sm py-8 text-center">{error}</p>
      )}

      <div className="space-y-3">
        {services.map((service, index) => (
          <button
            key={service.id}
            type="button"
            onClick={() => { onSelect(service) }}
            className="w-full text-left cursor-pointer animate-slide-up"
            style={{ animationDelay: `${index * 55}ms` }}
          >
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 flex items-center gap-4 hover:border-brand-200 hover:shadow-md active:scale-[0.97] transition-all duration-150 shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                <ScissorsIcon size={24} className="text-surface-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-semibold text-base">{service.name}</p>
                <p className="text-gray-400 text-sm mt-0.5">{formatDuration(service.duration_minutes)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-gray-900 font-bold text-base">{service.price} ₺</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
