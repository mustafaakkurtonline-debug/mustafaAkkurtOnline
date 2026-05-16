import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service } from '@/types/appointment'

interface UseServicesReturn {
  services: Service[]
  isLoading: boolean
  error: string | null
}

export function useServices(): UseServicesReturn {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetch = async (): Promise<void> => {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (cancelled) return

      if (fetchError) {
        setError('Hizmetler yüklenemedi. Lütfen tekrar deneyin.')
      } else {
        setServices(data ?? [])
      }
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [])

  return { services, isLoading, error }
}
