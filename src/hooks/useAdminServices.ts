import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service } from '@/types/admin'

interface UseAdminServicesReturn {
  services: Service[]
  isLoading: boolean
  refetch: () => void
}

export function useAdminServices(): UseAdminServicesReturn {
  const [services, setServices] = useState<Service[]>([])
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
        .from('services')
        .select('*')
        .order('name', { ascending: true })

      if (cancelled) return
      setServices(data ?? [])
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [tick])

  return { services, isLoading, refetch }
}
