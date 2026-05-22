import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AppointmentWithService } from '@/types/admin'

interface UseAdminAppointmentsReturn {
  appointments: AppointmentWithService[]
  isLoading: boolean
  refetch: () => void
}

export function useAdminAppointments(date: string): UseAdminAppointmentsReturn {
  const [appointments, setAppointments] = useState<AppointmentWithService[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [tick, setTick] = useState<number>(0)

  const refetch = useCallback((): void => {
    setTick(t => t + 1)
  }, [])

  // Veri çekme
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const fetchData = async (): Promise<void> => {
      const { data } = await supabase
        .from('appointments')
        .select('*, services(name, duration_minutes, price)')
        .eq('appointment_date', date)
        .order('appointment_time', { ascending: true })

      if (cancelled) return
      setAppointments((data as AppointmentWithService[]) ?? [])
      setIsLoading(false)
    }

    void fetchData()
    return () => { cancelled = true }
  }, [date, tick])

  // Realtime: o güne ait randevu eklenince veya güncellenince listeyi yenile
  useEffect(() => {
    const channel = supabase
      .channel(`admin-appointments-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `appointment_date=eq.${date}` },
        () => { setTick(t => t + 1) },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') void supabase.removeChannel(channel)
      })

    return () => { void supabase.removeChannel(channel) }
  }, [date])

  return { appointments, isLoading, refetch }
}
