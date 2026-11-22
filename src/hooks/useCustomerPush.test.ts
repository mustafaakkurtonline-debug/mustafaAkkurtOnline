import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

interface DbError { message: string }
interface RpcResult { data: boolean | null; error: DbError | null }

// Supabase çağrıları yakalanır; canlı veritabanına hiçbir şey yazılmaz
const rpc = vi.fn<(name: string, args: Record<string, string>) => Promise<RpcResult>>()
const insert = vi.fn<(table: string, row: Record<string, string>) => Promise<{ error: DbError | null }>>()
// Admin girişi açık mı (berberin cihazı)
const session = { current: null as { user: { id: string } } | null }

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: Record<string, string>) => rpc(name, args),
    from: (table: string) => ({ insert: (row: Record<string, string>) => insert(table, row) }),
    auth: { getSession: () => Promise.resolve({ data: { session: session.current } }) },
  },
}))

const KEYS = { endpoint: 'https://push.example/abc', p256dh: 'P256DH', auth: 'AUTH' }
const device = { supported: true, iosTab: false }

vi.mock('@/utils/pushSubscription', () => ({
  isPushSupported: () => device.supported,
  isIosBrowserTab: () => device.iosTab,
  readVapidPublicKey: () => 'test-vapid-key',
  getOrCreatePushSubscription: () => Promise.resolve({}),
  toPushKeys: () => KEYS,
}))

import { useCustomerPush } from './useCustomerPush'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const PHONE = '0532 123 45 67'
const requestPermission = vi.fn<() => Promise<NotificationPermission>>()

let root: Root | null = null
let container: HTMLDivElement

// permission: sayfa açılırken izin durumu · answer: izin sorulunca verilen yanıt
function stubNotification(permission: NotificationPermission, answer: NotificationPermission = permission): void {
  requestPermission.mockResolvedValue(answer)
  vi.stubGlobal('Notification', { permission, requestPermission })
}

// Bekleyen bütün sahte (hemen çözülen) Supabase yanıtlarının işlenmesini bekler
function settle(): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, 0) })
}

interface ProbeProps {
  phone: string
  appointmentId: string | null
}

// Hook'un durumunu DOM'a yazar; düğme enable()'ı çağırır (müşterinin dokunması gibi)
function Probe({ phone, appointmentId }: ProbeProps) {
  const { status, error, enable } = useCustomerPush(phone, appointmentId)
  return createElement('button', {
    'data-status': status,
    'data-error': error ?? '',
    onClick: () => { void enable() },
  })
}

function probe(): HTMLButtonElement {
  const button = container.querySelector('button')
  if (!button) throw new Error('Probe yok')
  return button
}

async function renderPush(appointmentId: string | null = null): Promise<void> {
  await act(async () => {
    root?.render(createElement(Probe, { phone: PHONE, appointmentId }))
    await settle()
  })
}

async function tapEnable(): Promise<void> {
  await act(async () => {
    probe().click()
    await settle()
  })
}

beforeEach(() => {
  device.supported = true
  device.iosTab = false
  session.current = null
  rpc.mockReset().mockResolvedValue({ data: true, error: null })
  insert.mockReset().mockResolvedValue({ error: null })
  requestPermission.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  container.remove()
  vi.unstubAllGlobals()
})

describe('useCustomerPush', () => {
  it('iPhone Safari sekmesinde önce ana ekrana eklenmesini ister', async () => {
    device.iosTab = true
    stubNotification('default')
    await renderPush()
    expect(probe().dataset.status).toBe('needs-install')
  })

  it('web push olmayan tarayıcıda gösterilecek bir şey yoktur', async () => {
    device.supported = false
    stubNotification('default')
    await renderPush()
    expect(probe().dataset.status).toBe('unsupported')
  })

  it('izin sorulmadan hiçbir şey kaydetmez', async () => {
    stubNotification('default')
    await renderPush('appt-1')
    expect(probe().dataset.status).toBe('ask')
    expect(requestPermission).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('düğmeyle izin verilince cihazı numaraya ve randevuya bağlar', async () => {
    stubNotification('default', 'granted')
    await renderPush('appt-1')

    await tapEnable()

    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('save_customer_push_subscription', {
      p_phone: PHONE,
      p_endpoint: KEYS.endpoint,
      p_p256dh: KEYS.p256dh,
      p_auth: KEYS.auth,
    })
    expect(insert).toHaveBeenCalledWith('appointment_reminders', { appointment_id: 'appt-1', ...KEYS })
    expect(probe().dataset.status).toBe('enabled')
    expect(probe().dataset.error).toBe('')
  })

  it('randevu yoksa yalnızca numaraya bağlar (karşılama ekranı)', async () => {
    stubNotification('default', 'granted')
    await renderPush()

    await tapEnable()

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(insert).not.toHaveBeenCalled()
    expect(probe().dataset.status).toBe('enabled')
  })

  it('izin reddedilirse kayıt yapmaz', async () => {
    stubNotification('default', 'denied')
    await renderPush('appt-1')

    await tapEnable()

    expect(rpc).not.toHaveBeenCalled()
    expect(probe().dataset.status).toBe('denied')
  })

  it('izin zaten verilmişse açılışta sessizce yeniden kaydeder', async () => {
    stubNotification('granted')
    await renderPush('appt-2')

    expect(probe().dataset.status).toBe('enabled')
    expect(requestPermission).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith('appointment_reminders', { appointment_id: 'appt-2', ...KEYS })
  })

  it('berberin cihazı müşteri adına randevu alırken o numaraya sessizce bağlanmaz', async () => {
    stubNotification('granted')
    session.current = { user: { id: 'admin' } }
    await renderPush('appt-3')

    expect(rpc).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('sessiz kayıt olmazsa düğmeyi yeniden gösterir', async () => {
    stubNotification('granted')
    rpc.mockResolvedValue({ data: null, error: { message: 'ağ hatası' } })
    await renderPush()

    expect(probe().dataset.status).toBe('ask')
  })

  it('kayıt reddedilirse hata gösterir ve tekrar denemeye izin verir', async () => {
    stubNotification('default', 'granted')
    rpc.mockResolvedValue({ data: false, error: null })
    await renderPush()

    await tapEnable()

    expect(probe().dataset.status).toBe('ask')
    expect(probe().dataset.error).toBe('Bildirimler açılamadı. Lütfen tekrar deneyin.')
  })
})
