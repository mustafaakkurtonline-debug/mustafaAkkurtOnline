import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { BlockedSlot } from '@/types/admin'

interface UseBlockedSlotsReturn {
  blockedSlots: BlockedSlot[]
  isLoading: boolean
  refetch: () => void
}

export function useBlockedSlots(date: string): UseBlockedSlotsReturn {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => { setTick(t => t + 1) }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const fetchData = async (): Promise<void> => {
      const { data } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('blocked_date', date)
        .order('start_time')

      if (cancelled) return
      setBlockedSlots((data as BlockedSlot[]) ?? [])
      setIsLoading(false)
    }

    void fetchData()
    return () => { cancelled = true }
  }, [date, tick])

  return { blockedSlots, isLoading, refetch }
}
