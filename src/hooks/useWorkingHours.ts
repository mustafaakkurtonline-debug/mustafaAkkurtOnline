import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { WorkingHour } from '@/types/admin'

interface UseWorkingHoursReturn {
  workingHours: WorkingHour[]
  isLoading: boolean
  refetch: () => void
}

export function useWorkingHours(): UseWorkingHoursReturn {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
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
        .from('working_hours')
        .select('*')
        .order('day_of_week', { ascending: true })

      if (cancelled) return
      setWorkingHours(data ?? [])
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [tick])

  return { workingHours, isLoading, refetch }
}
