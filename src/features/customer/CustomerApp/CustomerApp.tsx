import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CustomerLayout } from '@/components/layout/CustomerLayout/CustomerLayout'
import { BottomNav } from '@/components/layout/BottomNav/BottomNav'
import type { CustomerTab } from '@/components/layout/BottomNav/BottomNav'
import { AppointmentPage } from '@/features/appointment/AppointmentPage/AppointmentPage'
import { AboutPage } from '@/features/customer/AboutPage/AboutPage'
import { ContactPage } from '@/features/customer/ContactPage/ContactPage'
import { MyAccountPage } from '@/features/customer/MyAccountPage/MyAccountPage'
import { usePWAInstall } from '@/hooks/usePWAInstall'

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function InstallBanner() {
  const { canInstall, promptInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (dismissed || isInStandaloneMode()) return null

  const handleInstall = async () => {
    setInstalling(true)
    await promptInstall()
    setInstalling(false)
  }

  return (
    <div className="mx-4 mt-3 mb-1 bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-tight">Uygulamayı Yükle</p>
        <p className="text-gray-400 text-xs mt-0.5">Ana ekrana ekle, tek dokunuşla aç</p>
      </div>
      {canInstall ? (
        <button
          type="button"
          onClick={() => { void handleInstall() }}
          disabled={installing}
          className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
        >
          {installing ? '…' : 'Yükle'}
        </button>
      ) : (
        <Link
          to="/install"
          className="bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 active:scale-95 transition-transform cursor-pointer"
        >
          Nasıl Kurulur?
        </Link>
      )}
      <button
        type="button"
        onClick={() => { setDismissed(true) }}
        className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer shrink-0 ml-1"
        aria-label="Kapat"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export function CustomerApp() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home')
  const [isInBookingFlow, setIsInBookingFlow] = useState<boolean>(false)

  // Bottom nav is hidden only when booking flow is active on the home tab
  const showBottomNav = !(isInBookingFlow && activeTab === 'home')

  return (
    <CustomerLayout>
      <InstallBanner />

      {/* Home tab — stays mounted to preserve wizard state */}
      <div className={activeTab === 'home' ? 'block' : 'hidden'}>
        <AppointmentPage onBookingFlowChange={setIsInBookingFlow} />
      </div>

      {/* Other tabs — remount on each visit so they animate in fresh */}
      {activeTab === 'about' && (
        <div className="animate-fade-in">
          <AboutPage />
        </div>
      )}
      {activeTab === 'contact' && (
        <div className="animate-fade-in">
          <ContactPage />
        </div>
      )}
      {activeTab === 'account' && (
        <div className="animate-fade-in">
          <MyAccountPage />
        </div>
      )}

      {showBottomNav && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </CustomerLayout>
  )
}
