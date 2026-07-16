import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminServices } from '@/hooks/useAdminServices'
import { ServiceForm } from '@/features/admin/components/ServiceForm/ServiceForm'
import { ToggleSwitch } from '@/components/ui/ToggleSwitch/ToggleSwitch'
import type { Service } from '@/types/admin'

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export function ServicesTab() {
  const { services, isLoading, refetch } = useAdminServices()
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showAddForm, setShowAddForm] = useState<boolean>(false)

  const handleToggleActive = async (service: Service): Promise<void> => {
    await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id)
    refetch()
  }

  const handleDelete = async (service: Service): Promise<void> => {
    if (!window.confirm(`"${service.name}" hizmetini silmek istediğinize emin misiniz?`)) return
    await supabase.from('services').delete().eq('id', service.id)
    refetch()
  }

  const handleFormSuccess = (): void => {
    setEditingService(null)
    setShowAddForm(false)
    refetch()
  }

  const handleFormCancel = (): void => {
    setEditingService(null)
    setShowAddForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-900 font-bold text-base">Hizmetler</h2>
        <button
          type="button"
          onClick={() => { setShowAddForm(true) }}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
        >
          + Ekle
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Henüz hizmet eklenmemiş.</p>
        </div>
      )}

      {!isLoading && services.map(service => (
        <div
          key={service.id}
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-gray-900 font-semibold truncate">{service.name}</p>
                {!service.is_active && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 text-gray-400 border border-gray-200 shrink-0">
                    Pasif
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">
                {service.duration_minutes} dk · {service.price} ₺
              </p>
            </div>

            <div className="flex items-center gap-2 ml-3 shrink-0">
              <ToggleSwitch
                checked={service.is_active}
                onChange={() => { void handleToggleActive(service) }}
                label={service.is_active ? 'Pasife al' : 'Aktife al'}
              />
              <button
                type="button"
                onClick={() => { setEditingService(service) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 text-gray-500 hover:bg-surface-200 transition-colors cursor-pointer"
                title="Düzenle"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={() => { void handleDelete(service) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                title="Sil"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ))}

      {(showAddForm || editingService !== null) && (
        <ServiceForm
          service={editingService}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}
