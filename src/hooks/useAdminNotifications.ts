import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime } from '@/utils/dateUtils'

interface AppointmentPayload {
  id: string
  customer_name: string
  appointment_date: string
  appointment_time: string
  service_id: string
}

async function showAppointmentNotification(payload: AppointmentPayload): Promise<void> {
  if (Notification.permission !== 'granted') return
  if (!('serviceWorker' in navigator)) return

  const { customer_name, appointment_date, appointment_time, service_id, id } = payload

  const { data: service } = await supabase
    .from('services')
    .select('name')
    .eq('id', service_id)
    .single()

  const serviceName = service?.name ?? 'Randevu'

  // Android Chrome'da new Notification() sayfa bağlamında çalışmaz;
  // sistem bildirimi yalnızca service worker üzerinden gösterilebilir.
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Yeni Randevu 🗓', {
    body: `${customer_name} — ${serviceName}\n${formatDateLong(appointment_date)}, saat ${formatTime(appointment_time)}`,
    icon: '/icons/icon-192x192.png',
    tag: `appointment-${id}`,
  })
}

function vapidKeyToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return

  await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh, auth }, { onConflict: 'endpoint' })
}

// İzin zaten verilmiş varsayılarak çağrılır — kendi içinde izin istemez.
async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidPublicKey) return

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) { await saveSubscription(existing); return }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  })
  await saveSubscription(subscription)
}

interface AdminNotificationsResult {
  notifPermission: NotificationPermission
  enableNotifications: () => Promise<void>
}

export function useAdminNotifications(): AdminNotificationsResult {
  const supported = 'Notification' in window

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )

  // İzin verildiğinde Realtime + push subscription başlat
  useEffect(() => {
    if (!supported || notifPermission !== 'granted') return

    void registerPushSubscription()

    const channel = supabase
      .channel('admin-new-appointments')
      .on<AppointmentPayload>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => { void showAppointmentNotification(payload.new) },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') void supabase.removeChannel(channel)
      })

    return () => { void supabase.removeChannel(channel) }
  }, [notifPermission, supported])

  // Kullanıcı butona basınca çağrılır — user gesture gerektirir (Android Chrome şartı)
  const enableNotifications = async (): Promise<void> => {
    if (!supported) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  return { notifPermission, enableNotifications }
}
