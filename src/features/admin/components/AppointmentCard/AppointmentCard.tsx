import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildWhatsAppUrl, buildConfirmationMessage, buildNoShowMessage } from '@/utils/whatsapp'
import { formatTime, addDays } from '@/utils/dateUtils'
import type { AppointmentWithService, AppointmentStatus } from '@/types/admin'

interface AppointmentCardProps {
  appointment: AppointmentWithService
  onUpdate: () => void
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
}

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  confirmed: 'bg-green-50 text-green-700 border border-green-200',
  completed: 'bg-gray-100 text-gray-500 border border-gray-200',
  no_show:   'bg-red-50 text-red-600 border border-red-200',
}

export function AppointmentCard({ appointment, onUpdate }: AppointmentCardProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const updateStatus = async (status: AppointmentStatus): Promise<void> => {
    setIsLoading(true)
    await supabase.from('appointments').update({ status }).eq('id', appointment.id)
    onUpdate()
    setIsLoading(false)
  }

  const handleCancel = async (): Promise<void> => {
    if (!window.confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) return
    setIsLoading(true)
    await supabase.from('appointments').delete().eq('id', appointment.id)
    onUpdate()
    setIsLoading(false)
  }

  const handleNoShow = async (): Promise<void> => {
    if (!window.confirm('Müşteriyi gelmedi olarak işaretlemek istiyor musunuz? 2 haftalık yasak uygulanacak.')) return
    setIsLoading(true)
    await Promise.all([
      supabase.from('appointments').update({ status: 'no_show' }).eq('id', appointment.id),
      supabase.from('banned_customers').insert({
        customer_phone: appointment.customer_phone,
        banned_until: addDays(appointment.appointment_date, 14),
        reason: 'Randevuya gelmedi',
      }),
    ])
    onUpdate()
    setIsLoading(false)
  }

  const handleNoShowWhatsAppClick = (): void => {
    void supabase
      .from('appointments')
      .update({ no_show_notified: true })
      .eq('id', appointment.id)
      .then(() => { onUpdate() })
  }

  const { status, services } = appointment
  const serviceName = services?.name ?? 'Bilinmeyen Hizmet'

  const confirmUrl = buildWhatsAppUrl(
    appointment.customer_phone,
    buildConfirmationMessage({
      customerName: appointment.customer_name,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
      serviceName,
    }),
  )

  const noShowUrl = buildWhatsAppUrl(
    appointment.customer_phone,
    buildNoShowMessage({
      customerName: appointment.customer_name,
      date: appointment.appointment_date,
      time: appointment.appointment_time,
    }),
  )

  const isActionable = status === 'pending' || status === 'confirmed'

  return (
    <div className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-gray-900 font-semibold">{appointment.customer_name}</p>
          <p className="text-gray-500 text-sm">{appointment.customer_phone}</p>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-brand-500 font-bold text-lg">{formatTime(appointment.appointment_time)}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-2 mb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-gray-600 text-sm truncate">{serviceName}</p>
            {services && (
              <p className="text-gray-400 text-xs">{services.duration_minutes} dk · {services.price} ₺</p>
            )}
          </div>
          {isActionable && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => { void updateStatus('completed') }}
              title="Tamamlandı"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {isActionable && (
          <>
            <ActionButton
              label="İptal"
              disabled={isLoading}
              onClick={() => { void handleCancel() }}
              className="bg-surface-100 text-gray-600 hover:bg-surface-200 border border-gray-200"
            />
            <ActionButton
              label="Gelmedi"
              disabled={isLoading}
              onClick={() => { void handleNoShow() }}
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
            />
          </>
        )}

        {status !== 'no_show' && (
          <a
            href={confirmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 transition-colors"
          >
            WhatsApp Onayla
          </a>
        )}

        {status === 'no_show' && !appointment.no_show_notified && (
          <a
            href={noShowUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNoShowWhatsAppClick}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
          >
            Uyarı Gönder
          </a>
        )}

        {status === 'no_show' && appointment.no_show_notified && (
          <span className="px-3 py-1.5 text-xs font-medium text-gray-400">
            Uyarı gönderildi ✓
          </span>
        )}
      </div>
    </div>
  )
}

interface ActionButtonProps {
  label: string
  disabled: boolean
  onClick: () => void
  className: string
}

function ActionButton({ label, disabled, onClick, className }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer ${className}`}
    >
      {label}
    </button>
  )
}
