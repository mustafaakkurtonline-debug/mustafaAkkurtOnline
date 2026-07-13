import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTodayString } from '@/utils/dateUtils'
import type { ReservedSlot, ReservedSlotException } from '@/types/admin'

interface UseReservedSlotsReturn {
  reservedSlots: ReservedSlot[]
  exceptions: ReservedSlotException[]
  isLoading: boolean
  refetch: () => void
}

export function useReservedSlots(): UseReservedSlotsReturn {
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([])
  const [exceptions, setExceptions] = useState<ReservedSlotException[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [tick, setTick] = useState<number>(0)

  const refetch = useCallback((): void => {
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const fetch = async (): Promise<void> => {
      const [{ data: slots }, { data: exceptionData }] = await Promise.all([
        supabase
          .from('reserved_slots')
          .select('*')
          .order('day_of_week', { ascending: true })
          .order('slot_time', { ascending: true }),
        supabase
          .from('reserved_slot_exceptions')
          .select('*')
          .gte('exception_date', getTodayString())
          .order('exception_date', { ascending: true }),
      ])

      if (cancelled) return
      setReservedSlots(slots ?? [])
      setExceptions(exceptionData ?? [])
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [tick])

  return { reservedSlots, exceptions, isLoading, refetch }
}
