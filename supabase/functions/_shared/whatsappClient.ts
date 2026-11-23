import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// Günlük hatırlatma ve davet işinin (whatsapp-reminders) yan etkili yardımcıları.
// Dosya ve tablo adları WhatsApp döneminden kalma; mesajlar artık yalnızca
// bildirimle (web push) gider. Gönderme işi webPush.ts'te.

export interface SendResult {
  ok: boolean
  error: string | null
}

export type MessageKind = 'reminder' | 'revisit'
// whatsapp: eski kayıtlar (iptal edildi), push: bildirim (migration 019)
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
  { appointmentId, kind, channel = 'push', customerPhone, result }: LogEntry,
): Promise<void> {
  await supabase.from('whatsapp_messages').insert({
    appointment_id: appointmentId,
    kind,
    channel,
    customer_phone: customerPhone,
    status: result.ok ? 'sent' : 'failed',
    error: result.error,
  })
}

// Supabase Cron çağrısının gizli anahtarını doğrular (Vault'taki cron_secret ile aynı).
// Anahtar tanımlı değilse de çağrı reddedilir.
export function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET')
  return Boolean(secret) && req.headers.get('Authorization') === `Bearer ${secret}`
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
