import type { ReactNode } from 'react'

interface CustomerLayoutProps {
  children: ReactNode
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-50 text-gray-900">
      <main className="mx-auto max-w-md min-h-screen pb-32 px-4">
        {children}
      </main>
    </div>
  )
}
