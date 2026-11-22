import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getOrCreatePushSubscription,
  isIosBrowserTab,
  isPushSupported,
  readVapidPublicKey,
  toPushKeys,
} from '@/utils/pushSubscription'

// unsupported:   bu tarayıcıda web push yok (gösterilecek bir şey yok)
// needs-install: iPhone'da bildirim için önce ana ekrana eklenmeli
// ask:           izin istenebilir · saving: izin/kayıt sürüyor
// enabled:       bu cihaz bu numaranın bildirimlerini alır
// denied:        izin reddedilmiş (yalnızca telefon ayarlarından açılır)
export type CustomerPushStatus = 'unsupported' | 'needs-install' | 'ask' | 'saving' | 'enabled' | 'denied'

interface UseCustomerPushResult {
  status: CustomerPushStatus
  error: string | null
  enable: () => Promise<void>
}

const ENABLE_FAILED_MESSAGE = 'Bildirimler açılamadı. Lütfen tekrar deneyin.'

function detectStatus(): CustomerPushStatus {
  if (isIosBrowserTab()) return 'needs-install'
  if (!isPushSupported() || !readVapidPublicKey()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' ? 'enabled' : 'ask'
}

// Cihazı numaraya bağlar: bakım daveti bu kayda gider (migration 019).
// Randevu biliniyorsa "1 saat kaldı" hatırlatması için randevuya da bağlar (migration 008).
async function saveDeviceSubscription(phone: string, appointmentId: string | null): Promise<void> {
  const vapidPublicKey = readVapidPublicKey()
  if (!vapidPublicKey) throw new Error('VAPID anahtarı yapılandırılmamış')

  const keys = toPushKeys(await getOrCreatePushSubscription(vapidPublicKey))
  if (!keys) throw new Error('Abonelik bilgileri eksik')

  const { data: saved, error } = await supabase.rpc('save_customer_push_subscription', {
    p_phone: phone,
    p_endpoint: keys.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
  })
  if (error || saved !== true) throw new Error('Bildirim aboneliği kaydedilemedi')

  if (!appointmentId) return
  const { error: reminderError } = await supabase
    .from('appointment_reminders')
    .insert({ appointment_id: appointmentId, ...keys })
  if (reminderError) throw new Error('Randevu hatırlatması kaydedilemedi')
}

// Admin girişi açık cihaz berberindir (admin ve müşteri sayfası aynı oturumu görür).
// Berber müşteri adına randevu alırken cihazı o numaraya sessizce bağlanırsa
// davet müşteriye değil berbere gider, müşteriye WhatsApp yedeği de gitmez.
async function isStaffDevice(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return data.session !== null
}

// Müşterinin bu cihazda bildirim almasını yönetir (bakım daveti, randevu hatırlatması)
export function useCustomerPush(phone: string, appointmentId: string | null = null): UseCustomerPushResult {
  const [status, setStatus] = useState<CustomerPushStatus>(detectStatus)
  const [error, setError] = useState<string | null>(null)

  // İzin daha önce verilmişse cihaz sessizce yeniden kaydedilir: numara ile
  // abonelik eşleşmesi tazelenir, yeni randevunun hatırlatması kurulur.
  // Kayıt olmazsa buton yeniden gösterilir.
  useEffect(() => {
    if (detectStatus() !== 'enabled') return
    let cancelled = false
    const refresh = async (): Promise<void> => {
      if (await isStaffDevice()) return
      await saveDeviceSubscription(phone, appointmentId)
    }
    refresh().catch(() => {
      if (!cancelled) setStatus('ask')
    })
    return () => { cancelled = true }
  }, [phone, appointmentId])

  // Butondan çağrılır: iPhone izni yalnızca dokunmaya yanıt olarak sorar
  const enable = useCallback(async (): Promise<void> => {
    setStatus('saving')
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'ask')
        return
      }
      await saveDeviceSubscription(phone, appointmentId)
      setStatus('enabled')
    } catch {
      setStatus('ask')
      setError(ENABLE_FAILED_MESSAGE)
    }
  }, [phone, appointmentId])

  return { status, error, enable }
}
