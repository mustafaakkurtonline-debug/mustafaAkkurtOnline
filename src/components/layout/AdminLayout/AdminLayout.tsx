import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate()

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-surface-900 text-ink-primary">
      <header className="bg-surface-800 border-b border-surface-600 px-4 py-3 flex items-center justify-between">
        <h1 className="text-brand-400 font-bold text-lg">Mustafa Akkurt — Admin</h1>
        <button
          type="button"
          onClick={() => { void handleSignOut() }}
          className="text-ink-secondary text-sm hover:text-ink-primary transition-colors"
        >
          Çıkış
        </button>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
