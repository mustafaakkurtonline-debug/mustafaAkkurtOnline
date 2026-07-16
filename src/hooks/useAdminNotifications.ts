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

  // Hizmet adı alınamazsa bildirim yine de gösterilir
  let serviceName = 'Randevu'
  try {
    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', service_id)
      .single()
    if (service?.name) serviceName = service.name
  } catch {
    // sorgu başarısız olsa da bildirimi engelleme
  }

  // Android Chrome'da new Notification() sayfa bağlamında çalışmaz;
  // sistem bildirimi yalnızca service worker üzerinden gösterilebilir.
  // Tag, push bildirimiyle aynı formattadır (appt-<id>): aynı randevu için
  // iki kanaldan gelen bildirimler tek bildirime birleşir.
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Yeni Randevu 🗓', {
    body: `${customer_name} — ${serviceName}\n${formatDateLong(appointment_date)}, saat ${formatTime(appointment_time)}`,
    icon: '/icons/icon-192x192.png',
    tag: `appt-${id}`,
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

const SW_READY_TIMEOUT_MS = 10000

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) throw new Error('Abonelik bilgileri eksik')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh, auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(`Veritabanına kaydedilemedi: ${error.message}`)
}

function keysEqual(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (a === null) return false
  const av = new Uint8Array(a)
  if (av.length !== b.length) return false
  return av.every((v, i) => v === b[i])
}

// İzin zaten verilmiş varsayılarak çağrılır — kendi içinde izin istemez.
// Başarısızlıkta anlamlı bir Error fırlatır; çağıran taraf UI'da gösterir.
async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) throw new Error('Bu tarayıcı service worker desteklemiyor')
  if (!('PushManager' in window)) throw new Error('Bu tarayıcı web push desteklemiyor')

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidPublicKey) throw new Error('VAPID anahtarı yapılandırılmamış')

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => { reject(new Error('Service worker hazır olmadı (zaman aşımı)')) }, SW_READY_TIMEOUT_MS)
    }),
  ])

  const applicationServerKey = vapidKeyToUint8Array(vapidPublicKey)
  const existing = await registration.pushManager.getSubscription()

  if (existing) {
    if (keysEqual(existing.options.applicationServerKey, applicationServerKey)) {
      await saveSubscription(existing)
      return
    }
    // Farklı (eski) VAPID anahtarıyla yapılmış abonelik push alamaz — yenile
    await existing.unsubscribe()
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
  })
  await saveSubscription(subscription)
}

// Teknik hataları berberin anlayacağı Türkçe açıklamaya çevirir
function toFriendlyPushError(err: unknown): string {
  if (!(err instanceof Error)) return String(err)

  if (err.name === 'AbortError') {
    return 'Telefonun bildirim servisine (Google) ulaşılamadı. Play Store\'dan ' +
      'Google Play Hizmetleri ve Chrome\'u güncelleyip telefonu yeniden başlatın. ' +
      'Google servisleri olmayan telefonlarda (örn. Huawei) bildirim desteklenmez.'
  }
  if (err.name === 'NotAllowedError') {
    return 'Tarayıcı bildirim iznini engelliyor. Telefon ayarlarından Chrome için ' +
      'bildirimlere izin verildiğinden emin olun.'
  }
  return err.name !== 'Error' ? `${err.name}: ${err.message}` : err.message
}

export type PushRegistrationState = 'idle' | 'registering' | 'registered' | 'failed'

interface AdminNotificationsResult {
  notifPermission: NotificationPermission
  pushState: PushRegistrationState
  pushError: string | null
  enableNotifications: () => Promise<void>
  retryPushRegistration: () => void
}

export function useAdminNotifications(): AdminNotificationsResult {
  const supported = 'Notification' in window

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )
  const [pushState, setPushState] = useState<PushRegistrationState>('idle')
  const [pushError, setPushError] = useState<string | null>(null)
  const [registerTick, setRegisterTick] = useState<number>(0)

  // İzin verildiğinde push subscription kaydını yap ve sonucu UI'a bildir
  useEffect(() => {
    if (!supported || notifPermission !== 'granted') return
    let cancelled = false

    setPushState('registering')
    setPushError(null)

    registerPushSubscription()
      .then(() => {
        if (!cancelled) setPushState('registered')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPushState('failed')
        setPushError(toFriendlyPushError(err))
      })

    return () => { cancelled = true }
  }, [notifPermission, supported, registerTick])

  // İzin verildiğinde Realtime kanalını başlat.
  // Kanal, hata durumunda kaldırılmaz: realtime-js bağlantı kopunca
  // (ekran kilidi, ağ değişimi) kanalı kendisi yeniden kurar.
  useEffect(() => {
    if (!supported || notifPermission !== 'granted') return

    const channel = supabase
      .channel('admin-new-appointments')
      .on<AppointmentPayload>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => { void showAppointmentNotification(payload.new) },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [notifPermission, supported])

  // Kullanıcı butona basınca çağrılır — user gesture gerektirir (Android Chrome şartı)
  const enableNotifications = async (): Promise<void> => {
    if (!supported) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  const retryPushRegistration = (): void => {
    setRegisterTick(t => t + 1)
  }

  return { notifPermission, pushState, pushError, enableNotifications, retryPushRegistration }
}
