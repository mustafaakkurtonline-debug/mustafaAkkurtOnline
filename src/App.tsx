import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CustomerApp } from '@/features/customer/CustomerApp/CustomerApp'
import { InstallPage } from '@/features/customer/InstallPage/InstallPage'
import { RouteSpinner } from '@/components/layout/RouteSpinner/RouteSpinner'
import { useAuth } from '@/hooks/useAuth'

// Admin paneli ayrı dosyada: müşteriler yalnızca kendi sayfalarının kodunu indirir
const LoginPage = lazy(() =>
  import('@/features/admin/LoginPage/LoginPage').then(m => ({ default: m.LoginPage })),
)
const DashboardPage = lazy(() =>
  import('@/features/admin/DashboardPage/DashboardPage').then(m => ({ default: m.DashboardPage })),
)

interface ProtectedRouteProps {
  children: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <RouteSpinner />


  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteSpinner />}>
      <Routes>
        <Route path="/" element={<CustomerApp />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
