import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { reportWarning } from '@/lib/sentry'
import type { ApprovedCustomer } from '@/types/admin'

interface UseApprovedCustomersReturn {
  customers: ApprovedCustomer[]
  isLoading: boolean
  hasError: boolean
  refetch: () => void
}

export function useApprovedCustomers(): UseApprovedCustomersReturn {
  const [customers, setCustomers] = useState<ApprovedCustomer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)
  const [tick, setTick] = useState<number>(0)

  const refetch = useCallback((): void => {
    setIsLoading(true)
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchData = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('approved_customers')
        .select('*')
        .order('customer_name', { ascending: true })

      if (cancelled) return
      // Hata boş liste gibi gösterilmez; berber müşterilerini silinmiş sanmasın
      if (error) {
        reportWarning('Müşteri listesi yüklenemedi', { error: error.message })
      } else {
        setCustomers(data)
      }
      setHasError(error !== null)
      setIsLoading(false)
    }

    void fetchData()
    return () => { cancelled = true }
  }, [tick])

  return { customers, isLoading, hasError, refetch }
}
