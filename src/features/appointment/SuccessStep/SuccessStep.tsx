import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime, formatDuration } from '@/utils/dateUtils'
import type { AppointmentFormData } from '@/types/appointment'

interface SuccessStepProps {
  formData: AppointmentFormData
  appointmentId: string | null
  onNewAppointment: () => void
}

type ReminderState = 'idle' | 'requesting' | 'granted' | 'denied'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function vapidKeyToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf
}

async function subscribeAndSave(appointmentId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidPublicKey) return false

  const registration = await navigator.serviceWorker.ready
  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    })
  }

  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return false

  const { error } = await supabase
    .from('appointment_reminders')
    .insert({ appointment_id: appointmentId, endpoint, p256dh, auth })

  return !error
}

export function SuccessStep({ formData, appointmentId, onNewAppointment }: SuccessStepProps) {
  const alreadyInstalled = isInStandaloneMode()
  const ios = isIos()

  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [reminderState, setReminderState] = useState<ReminderState>('idle')

  const handleReminderSubscribe = async (): Promise<void> => {
    if (!appointmentId || reminderState !== 'idle') return
    setReminderState('requesting')

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setReminderState('denied')
      return
    }

    const ok = await subscribeAndSave(appointmentId)
    setReminderState(ok ? 'granted' : 'denied')
  }

  return (
    <div className="pt-10 pb-4 space-y-6">
      {/* Success hero */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-green-50 border-2 border-green-200">
          <span className="text-green-600 text-4xl leading-none">✓</span>
        </div>
        <h2 className="text-gray-900 text-2xl font-bold">Randevunuz Alındı!</h2>
        <p className="text-gray-400 text-sm mt-1">Sizi bekliyoruz.</p>
      </div>

      {/* Appointment card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-surface-500">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <p className="text-gray-900 font-semibold">{formData.service.name}</p>
            <p className="text-gray-400 text-sm mt-0.5">
              {formatDuration(formData.service.duration_minutes)} · {formData.service.price} ₺
            </p>
          </div>
        </div>
        <div className="px-5 py-4 flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-xs mb-1">Tarih</p>
            <p className="text-gray-900 font-semibold text-sm">{formatDateLong(formData.date)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs mb-1">Saat</p>
            <p className="text-gray-900 font-bold text-xl leading-none">{formatTime(formData.time)}</p>
          </div>
        </div>
      </div>

      {/* Reminder subscription */}
      {pushSupported && appointmentId !== null && reminderState !== 'granted' && (
        <button
          type="button"
          onClick={() => { void handleReminderSubscribe() }}
          disabled={reminderState === 'requesting' || reminderState === 'denied'}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-full font-medium transition-all ${
            reminderState === 'denied'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : reminderState === 'requesting'
                ? 'bg-brand-50 text-brand-400 cursor-wait'
                : 'bg-brand-500 text-white active:scale-[0.98] hover:bg-brand-600'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {reminderState === 'requesting'
            ? 'Ayarlanıyor...'
            : reminderState === 'denied'
              ? 'Bildirim izni kapalı'
              : 'Randevu Hatırlatması Al'}
        </button>
      )}
      {reminderState === 'granted' && (
        <div className="flex items-center justify-center gap-2 py-3 text-green-600 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Randevudan 1 saat önce hatırlatma gönderilecek
        </div>
      )}

      {/* PWA install */}
      {!alreadyInstalled && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📱</span>
            <p className="text-gray-900 text-sm font-semibold">Uygulamayı Ana Ekrana Ekle</p>
          </div>
          {ios ? (
            <ol className="text-gray-500 text-sm space-y-1.5 list-decimal list-inside">
              <li>Alttaki <strong className="text-gray-800">Paylaş</strong> butonuna dokunun</li>
              <li><strong className="text-gray-800">Ana Ekrana Ekle</strong> seçeneğini seçin</li>
              <li><strong className="text-gray-800">Ekle</strong>&apos;ye dokunun</li>
            </ol>
          ) : (
            <ol className="text-gray-500 text-sm space-y-1.5 list-decimal list-inside">
              <li>Tarayıcı menüsüne dokunun <strong className="text-gray-800">(⋮)</strong></li>
              <li><strong className="text-gray-800">Uygulamayı yükle</strong> veya <strong className="text-gray-800">Ana ekrana ekle</strong> seçin</li>
            </ol>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNewAppointment}
        className="w-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-400 active:scale-[0.98] font-medium py-4 rounded-full transition-all"
      >
        Yeni Randevu Al
      </button>
    </div>
  )
}
