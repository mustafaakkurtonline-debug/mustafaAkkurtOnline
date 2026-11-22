import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { buildTemplateBody } from './whatsappMessages.ts'
import type { TemplateName } from './whatsappMessages.ts'

// Meta Graph API sürümü; Meta eski sürümleri ~2 yıl sonra kapatır, gerekirse secret ile güncellenir
const DEFAULT_GRAPH_VERSION = 'v23.0'

export interface SendResult {
  ok: boolean
  messageId: string | null
  error: string | null
}

interface GraphResponse {
  messages?: Array<{ id: string }>
  error?: { message?: string; code?: number }
}

// Meta hesabı bağlanmadan da günlük iş çalışır (bildirim daveti gider);
// bağlı değilken WhatsApp adımları atlanır, her randevu için hata yazılmaz.
export function isWhatsAppConfigured(): boolean {
  return Boolean(Deno.env.get('WHATSAPP_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID'))
}

// Meta WhatsApp Cloud API ile onaylı şablon mesajı gönderir. Hata fırlatmaz,
// sonucu döndürür (bir müşteriye gidemeyen mesaj diğerlerini durdurmasın).
export async function sendTemplate(rawPhone: string, template: TemplateName, params: string[]): Promise<SendResult> {
  const token = Deno.env.get('WHATSAPP_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !phoneNumberId) {
    return { ok: false, messageId: null, error: 'WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID ayarlı değil' }
  }

  const version = Deno.env.get('WHATSAPP_GRAPH_VERSION') ?? DEFAULT_GRAPH_VERSION

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTemplateBody(rawPhone, template, params)),
    })
    const data = await response.json() as GraphResponse
    if (!response.ok) {
      return { ok: false, messageId: null, error: data.error?.message ?? `HTTP ${response.status}` }
    }
    return { ok: true, messageId: data.messages?.[0]?.id ?? null, error: null }
  } catch (err) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : String(err) }
  }
}

export type MessageKind = 'reminder' | 'revisit'
// whatsapp: ücretli şablon mesajı, push: ücretsiz bildirim (migration 019)
export type MessageChannel = 'whatsapp' | 'push'

interface LogEntry {
  appointmentId: string | null
  kind: MessageKind
  channel?: MessageChannel
  customerPhone: string
  result: SendResult
}

// Her gönderim denemesi admin'in görebileceği kayda yazılır (migration 017)
export async function logMessage(
  supabase: SupabaseClient,
  { appointmentId, kind, channel = 'whatsapp', customerPhone, result }: LogEntry,
): Promise<void> {
  await supabase.from('whatsapp_messages').insert({
    appointment_id: appointmentId,
    kind,
    channel,
    customer_phone: customerPhone,
    status: result.ok ? 'sent' : 'failed',
    error: result.error,
    meta_message_id: result.messageId,
  })
}

// cron-job.org çağrısının gizli anahtarını doğrular. Ücretli mesaj
// gönderdiği için anahtar tanımlı değilse de çağrı reddedilir.
export function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET')
  return Boolean(secret) && req.headers.get('Authorization') === `Bearer ${secret}`
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
