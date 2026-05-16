import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { BannedCustomer } from '@/types/admin'

interface UseBannedCustomersReturn {
  bannedCustomers: BannedCustomer[]
  isLoading: boolean
  refetch: () => void
}

export function useBannedCustomers(): UseBannedCustomersReturn {
  const [bannedCustomers, setBannedCustomers] = useState<BannedCustomer[]>([])
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
        .from('banned_customers')
        .select('*')
        .order('banned_until', { ascending: false })

      if (cancelled) return
      setBannedCustomers(data ?? [])
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [tick])

  return { bannedCustomers, isLoading, refetch }
}
