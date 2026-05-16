import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { BlockedDay } from '@/types/admin'

interface UseBlockedDaysReturn {
  blockedDays: BlockedDay[]
  isLoading: boolean
  refetch: () => void
}

export function useBlockedDays(): UseBlockedDaysReturn {
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([])
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
        .from('blocked_days')
        .select('*')
        .order('blocked_date', { ascending: true })

      if (cancelled) return
      setBlockedDays(data ?? [])
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [tick])

  return { blockedDays, isLoading, refetch }
}
