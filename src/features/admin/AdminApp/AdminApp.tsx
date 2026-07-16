import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { AdminTab } from '@/types/admin'
import { DashboardTab } from '@/features/admin/tabs/DashboardTab/DashboardTab'
import { ServicesTab } from '@/features/admin/tabs/ServicesTab/ServicesTab'
import { SettingsTab } from '@/features/admin/tabs/SettingsTab/SettingsTab'
import { useAdminNotifications } from '@/hooks/useAdminNotifications'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ScissorsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const TABS: { id: AdminTab; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'dashboard', label: 'Takvim',   Icon: CalendarIcon },
  { id: 'services',  label: 'Hizmetler', Icon: ScissorsIcon },
  { id: 'settings',  label: 'Ayarlar',   Icon: SettingsIcon },
]

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const navigate = useNavigate()

  const { notifPermission, pushState, pushError, enableNotifications, retryPushRegistration } = useAdminNotifications()

  // Capture install prompt before it disappears
  useEffect(() => {
    const handler = (e: Event): void => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => { window.removeEventListener('beforeinstallprompt', handler) }
  }, [])

  const handleInstall = async (): Promise<void> => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-surface-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b border-gray-200 shrink-0">
        {/* Fills the iOS Dynamic Island / status bar area with header background */}
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500 shrink-0">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
            <h1 className="font-serif text-brand-500 font-semibold text-lg tracking-wide">Mustafa Akkurt</h1>
          </div>
          <div className="flex items-center gap-3">
            {'Notification' in window && notifPermission !== 'granted' && (
              <button
                type="button"
                onClick={() => { void enableNotifications() }}
                className="flex items-center gap-1 text-amber-600 text-sm font-medium hover:text-amber-500 transition-colors cursor-pointer"
                title={notifPermission === 'denied' ? 'Tarayıcı ayarlarından bildirimlere izin verin' : 'Bildirimleri etkinleştir'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  {notifPermission === 'denied' && <line x1="1" y1="1" x2="23" y2="23" />}
                </svg>
                {notifPermission === 'denied' ? 'Bildirim Kapalı' : 'Bildirimleri Aç'}
              </button>
            )}
            {installPrompt !== null && (
              <button
                type="button"
                onClick={() => { void handleInstall() }}
                className="text-brand-500 text-sm font-medium hover:text-brand-400 transition-colors cursor-pointer"
              >
                Uygulamayı Kur
              </button>
            )}
            {isIOS && !isStandalone && (
              <button
                type="button"
                onClick={() => { setShowIOSGuide(true) }}
                className="text-brand-500 text-sm font-medium hover:text-brand-400 transition-colors cursor-pointer"
              >
                Ana Ekrana Ekle
              </button>
            )}
            <button
              type="button"
              onClick={() => { void handleSignOut() }}
              className="text-gray-400 text-sm hover:text-gray-700 transition-colors cursor-pointer"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Push kayıt durumu: cihazın bildirim alıp alamayacağını gösterir */}
      {notifPermission === 'granted' && pushState === 'registering' && (
        <div className="bg-surface-100 border-b border-gray-200 px-4 py-2">
          <p className="text-gray-500 text-xs">Bildirim kaydı yapılıyor…</p>
        </div>
      )}
      {notifPermission === 'granted' && pushState === 'registered' && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-green-700 text-xs">Bu cihaz yeni randevu bildirimlerine kayıtlı</p>
        </div>
      )}
      {notifPermission === 'granted' && pushState === 'failed' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-red-700 text-xs min-w-0">
            Bildirim kaydı başarısız: {pushError ?? 'bilinmeyen hata'}
          </p>
          <button
            type="button"
            onClick={retryPushRegistration}
            className="shrink-0 text-red-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* iOS install guide modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
          onClick={() => { setShowIOSGuide(false) }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => { e.stopPropagation() }}
          >
            <h2 className="font-bold text-gray-900 text-lg mb-1">Admin Panelini Kur</h2>
            <p className="text-gray-500 text-sm mb-5">Safari'den ana ekrana ekleyin:</p>
            <ol className="space-y-4">
              <li className="flex gap-3 items-start">
                <span className="bg-brand-50 text-brand-600 font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span className="text-gray-700 text-sm">
                  Safari'nin altındaki <strong>Paylaş</strong> butonuna dokunun
                  <span className="block text-gray-400 text-xs mt-0.5">(kutu içinde yukarı ok)</span>
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="bg-brand-50 text-brand-600 font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span className="text-gray-700 text-sm">
                  Listeden <strong>"Ana Ekrana Ekle"</strong>yi seçin
                </span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="bg-brand-50 text-brand-600 font-bold text-sm w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span className="text-gray-700 text-sm">
                  Sağ üstteki <strong>"Ekle"</strong>ye dokunun
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => { setShowIOSGuide(false) }}
              className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'services' && <ServicesTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {TABS.map(({ id, label, Icon }) => (
          <TabButton
            key={id}
            label={label}
            Icon={Icon}
            isActive={activeTab === id}
            onClick={() => { setActiveTab(id) }}
          />
        ))}
      </nav>
    </div>
  )
}

interface TabButtonProps {
  label: string
  Icon: () => React.ReactElement
  isActive: boolean
  onClick: () => void
}

function TabButton({ label, Icon, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 gap-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer ${
        isActive ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <Icon />
      <span>{label}</span>
      {isActive && <span className="block h-0.5 w-5 rounded-full bg-brand-500" />}
    </button>
  )
}
