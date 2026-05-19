import { useServices } from '@/hooks/useServices'
import { formatDuration } from '@/utils/dateUtils'
import type { Service } from '@/types/appointment'

interface ServiceStepProps {
  onSelect: (service: Service) => void
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
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <img
                  src="/icons/mustafaAkkurthair.png"
                  alt=""
                  className="w-full h-full object-cover"
                />
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
