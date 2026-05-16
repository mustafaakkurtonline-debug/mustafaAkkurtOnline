import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ReservedSlot } from '@/types/admin'

interface UseReservedSlotsReturn {
  reservedSlots: ReservedSlot[]
  isLoading: boolean
  refetch: () => void
}

export function useReservedSlots(): UseReservedSlotsReturn {
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [tick, setTick] = useState<number>(0)

  const refetch = useCallback((): void => {
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const fetch = async (): Promise<void> => {
      const { data } = await supabase
        .from('reserved_slots')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('slot_time', { ascending: true })

      if (cancelled) return
      setReservedSlots(data ?? [])
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [tick])

  return { reservedSlots, isLoading, refetch }
}
