import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateLong, formatTime } from '@/utils/dateUtils'
import { showSystemNotification } from '@/utils/serviceWorker'
import { getOrCreatePushSubscription, isIosBrowserTab, readVapidPublicKey, toPushKeys } from '@/utils/pushSubscription'

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

  // Tag, push bildirimiyle aynı formattadır (appt-<id>): aynı randevu için
  // iki kanaldan gelen bildirimler tek bildirime birleşir.
  await showSystemNotification('Yeni Randevu 🗓', {
    body: `${customer_name} — ${serviceName}\n${formatDateLong(appointment_date)}, saat ${formatTime(appointment_time)}`,
    icon: '/icons/icon-192x192.png',
    tag: `appt-${id}`,
  })
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const keys = toPushKeys(sub)
  if (!keys) throw new Error('Abonelik bilgileri eksik')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(keys, { onConflict: 'endpoint' })
  if (error) throw new Error(`Veritabanına kaydedilemedi: ${error.message}`)
}

// İzin zaten verilmiş varsayılarak çağrılır — kendi içinde izin istemez.
// Başarısızlıkta anlamlı bir Error fırlatır; çağıran taraf UI'da gösterir.
async function registerPushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) throw new Error('Bu tarayıcı service worker desteklemiyor')
  if (!('PushManager' in window)) {
    if (isIosBrowserTab()) {
      throw new Error(
        'iPhone\'da bildirim için uygulamayı önce ana ekrana eklemelisiniz. ' +
        'Safari\'de paylaş düğmesine (kutu-ok simgesi) dokunup "Ana Ekrana Ekle" deyin, ' +
        'sonra ana ekrandaki simgeden açıp bildirimleri tekrar açın.',
      )
    }
    throw new Error('Bu tarayıcı web push desteklemiyor')
  }

  const vapidPublicKey = readVapidPublicKey()
  if (!vapidPublicKey) throw new Error('VAPID anahtarı yapılandırılmamış')

  await saveSubscription(await getOrCreatePushSubscription(vapidPublicKey))
}

// Teknik hataları berberin anlayacağı Türkçe açıklamaya çevirir
export function toFriendlyPushError(err: unknown): string {
  if (!(err instanceof Error)) return String(err)

  if (err.name === 'AbortError') {
    // Tarayıcı izin vermiş görünse de push kaydı ayrıca engellenmiş olabilir;
    // bu durumda Play Hizmetleri yönlendirmesi yanlış olur.
    if (err.message.toLowerCase().includes('permission denied')) {
      return 'Tarayıcı bu site için bildirim kaydını engelliyor. Adres çubuğundaki ' +
        'kilit simgesine dokunup Bildirimler iznini "İzin ver" yapın, ayrıca telefon ' +
        'ayarlarından tarayıcının bildirim izninin açık olduğunu kontrol edip tekrar deneyin.'
    }
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
