import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { reportWarning } from '@/lib/sentry'

interface UseAuthReturn {
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Oturum kontrolü (süresi dolmuş token'ın ağdan yenilenmesi dahil) takılırsa
// kullanıcı yükleme ekranında kalmasın; bu sürenin sonunda giriş ekranına düşer.
// Oturum sonradan gelirse onAuthStateChange onu yine yakalar.
export const SESSION_CHECK_TIMEOUT_MS = 8000

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false)
      reportWarning('Oturum kontrolü zaman aşımına uğradı')
    }, SESSION_CHECK_TIMEOUT_MS)

    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        setSession(initialSession)
      })
      .catch(() => {
        // Oturum okunamadı: oturumsuz kabul edilip giriş ekranına düşülür
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
        setIsLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, updatedSession) => {
        setSession(updatedSession)
      }
    )

    return () => {
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    isLoading,
    isAuthenticated: session !== null,
  }
}
