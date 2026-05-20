import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime } from '@/utils/dateUtils'

interface AppointmentPayload {
  id: string
  customer_name: string
  appointment_date: string
  appointment_time: string
  service_id: string
}

async function showAppointmentNotification(payload: AppointmentPayload): Promise<void> {
  if (Notification.permission !== 'granted') return

  const { customer_name, appointment_date, appointment_time, service_id, id } = payload

  const { data: service } = await supabase
    .from('services')
    .select('name')
    .eq('id', service_id)
    .single()

  const serviceName = service?.name ?? 'Randevu'
  const dateStr = formatDateLong(appointment_date)
  const timeStr = formatTime(appointment_time)

  new Notification('Yeni Randevu 🗓', {
    body: `${customer_name} — ${serviceName}\n${dateStr}, saat ${timeStr}`,
    icon: '/icons/icon-192x192.png',
    tag: `appointment-${id}`,
  })
}

export function useAdminNotifications(): void {
  useEffect(() => {
    if (!('Notification' in window)) return

    let cleanup: (() => void) | undefined

    const setup = (): void => {
      const channel = supabase
        .channel('admin-new-appointments')
        .on<AppointmentPayload>(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'appointments' },
          (payload) => { void showAppointmentNotification(payload.new) },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            void supabase.removeChannel(channel)
          }
        })

      cleanup = () => { void supabase.removeChannel(channel) }
    }

    if (Notification.permission === 'granted') {
      setup()
    } else if (Notification.permission === 'default') {
      void Notification.requestPermission().then((result) => {
        if (result === 'granted') setup()
      })
    }

    return () => { cleanup?.() }
  }, [])
}
