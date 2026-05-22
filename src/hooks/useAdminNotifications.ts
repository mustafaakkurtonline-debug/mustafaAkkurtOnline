import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime } from '@/utils/dateUtils'

interface AppointmentPayload {
  id: string
  customer_name: string
  appointment_date: string
  appointment_time: string
  service_id: string
}

// Supabase Realtime üzerinden gelen yeni randevuyu, uygulama açıkken gösterir.
// Uygulama kapalıyken ise Edge Function → Web Push devreye girer.
async function showAppointmentNotification(payload: AppointmentPayload): Promise<void> {
  if (Notification.permission !== 'granted') return

  const { customer_name, appointment_date, appointment_time, service_id, id } = payload

  const { data: service } = await supabase
    .from('services')
    .select('name')
    .eq('id', service_id)
    .single()

  const serviceName = service?.name ?? 'Randevu'
  const dateStr = formatDateLong(appointment_date)
  const timeStr = formatTime(appointment_time)

  new Notification('Yeni Randevu 🗓', {
    body: `${customer_name} — ${serviceName}\n${dateStr}, saat ${timeStr}`,
    icon: '/icons/icon-192x192.png',
    tag: `appointment-${id}`,
  })
}

// VAPID public key'i Uint8Array'e çevirir (pushManager.subscribe için gerekli).
// new ArrayBuffer ile oluşturmak, TypeScript'in BufferSource tipini doğru çözmesini sağlar.
function vapidKeyToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buf = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf
}

// Yeni push subscription'ı Supabase'e kaydeder (çakışma varsa günceller)
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

// Web Push aboneliğini başlatır; izin yoksa ister, varsa kaydeder.
async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidPublicKey) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready

  // Mevcut abonelik varsa tekrar kaydet (uçmuş olabilir)
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    await saveSubscription(existing)
    return
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // .buffer as ArrayBuffer: TypeScript'in SharedArrayBuffer ambiguity hatasını çözer
    applicationServerKey: vapidKeyToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  })
  await saveSubscription(subscription)
}

export function useAdminNotifications(): void {
  useEffect(() => {
    if (!('Notification' in window)) return

    let cleanup: (() => void) | undefined

    const setup = (): void => {
      // Web Push aboneliğini arka planda başlat
      void registerPushSubscription()

      // Realtime kanalı: uygulama açıkken anlık bildirim
      const channel = supabase
        .channel('admin-new-appointments')
        .on<AppointmentPayload>(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'appointments' },
          (payload) => { void showAppointmentNotification(payload.new) },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            void supabase.removeChannel(channel)
          }
        })

      cleanup = () => { void supabase.removeChannel(channel) }
    }

    if (Notification.permission === 'granted') {
      setup()
    } else if (Notification.permission === 'default') {
      void Notification.requestPermission().then((result) => {
        if (result === 'granted') setup()
      })
    }

    return () => { cleanup?.() }
  }, [])
}
