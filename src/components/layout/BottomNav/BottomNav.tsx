export type CustomerTab = 'home' | 'about' | 'contact' | 'account'

interface BottomNavProps {
  activeTab: CustomerTab
  onTabChange: (tab: CustomerTab) => void
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function AboutIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M19 8v6m-3-3h6" />
    </svg>
  )
}

function ContactIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 7L2 7" />
    </svg>
  )
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const TABS = [
  { id: 'home'    as CustomerTab, label: 'Anasayfa',   Icon: HomeIcon },
  { id: 'about'   as CustomerTab, label: 'Hakkımızda', Icon: AboutIcon },
  { id: 'contact' as CustomerTab, label: 'İletişim',   Icon: ContactIcon },
  { id: 'account' as CustomerTab, label: 'Hesabım',    Icon: AccountIcon },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center px-4 z-50">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl px-1 py-2 flex items-center justify-around shadow-xl">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => { onTabChange(id) }}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors duration-150"
            >
              <span className={`transition-colors duration-150 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                <Icon active={isActive} />
              </span>
              <span className={`text-xs font-medium transition-colors duration-150 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                {label}
              </span>
              <span
                className={`h-0.5 rounded-full bg-white transition-all duration-200 ${isActive ? 'w-4 opacity-100' : 'w-0 opacity-0'}`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
