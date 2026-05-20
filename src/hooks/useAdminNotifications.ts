import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useAdminNotifications(): void {
  useEffect(() => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    const channel = supabase
      .channel('admin-new-appointments')
      .on<{
        customer_name: string
        appointment_date: string
        appointment_time: string
      }>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          if (Notification.permission !== 'granted') return
          const { customer_name, appointment_date, appointment_time } = payload.new
          const time = appointment_time.slice(0, 5)
          new Notification('Yeni Randevu 📅', {
            body: `${customer_name} — ${appointment_date} saat ${time}`,
            icon: '/icons/icon-192x192.png',
            tag: 'new-appointment',
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])
}
