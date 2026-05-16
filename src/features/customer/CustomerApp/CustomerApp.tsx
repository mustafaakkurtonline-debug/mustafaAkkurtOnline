import { useState } from 'react'
import { CustomerLayout } from '@/components/layout/CustomerLayout/CustomerLayout'
import { BottomNav } from '@/components/layout/BottomNav/BottomNav'
import type { CustomerTab } from '@/components/layout/BottomNav/BottomNav'
import { AppointmentPage } from '@/features/appointment/AppointmentPage/AppointmentPage'
import { AboutPage } from '@/features/customer/AboutPage/AboutPage'
import { ContactPage } from '@/features/customer/ContactPage/ContactPage'
import { MyAccountPage } from '@/features/customer/MyAccountPage/MyAccountPage'

export function CustomerApp() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home')
  const [isInBookingFlow, setIsInBookingFlow] = useState<boolean>(false)

  // Bottom nav is hidden only when booking flow is active on the home tab
  const showBottomNav = !(isInBookingFlow && activeTab === 'home')

  return (
    <CustomerLayout>
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
