import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-4 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500 shrink-0">
            <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
          <h1 className="font-serif text-brand-500 text-3xl font-semibold tracking-wide">
            Mustafa Akkurt
          </h1>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#CA8A04',
                  brandAccent: '#A16207',
                  inputBackground: '#ffffff',
                  inputBorder: '#e5e7eb',
                  inputText: '#111827',
                  inputPlaceholder: '#9ca3af',
                  messageText: '#ef4444',
                  anchorTextColor: '#CA8A04',
                  defaultButtonBackground: '#111827',
                  defaultButtonBackgroundHover: '#1f2937',
                  defaultButtonBorder: 'transparent',
                  defaultButtonText: '#ffffff',
                },
                borderWidths: { buttonBorderWidth: '0px', inputBorderWidth: '1px' },
                radii: { borderRadiusButton: '12px', inputBorderRadius: '12px' },
              },
            },
          }}
          providers={[]}
          view="sign_in"
          showLinks={false}
          localization={{
            variables: {
              sign_in: {
                email_label: 'E-posta',
                password_label: 'Şifre',
                button_label: 'Giriş Yap',
                email_input_placeholder: 'admin@example.com',
                password_input_placeholder: '••••••••',
                loading_button_label: 'Giriş yapılıyor...',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
