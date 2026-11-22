-- Migration 017: Otomatik WhatsApp mesajları (Meta WhatsApp Cloud API)
--
-- Gönderen fonksiyon: supabase/functions/whatsapp-reminders. cron-job.org her
-- gün 21:00 (İstanbul) çağırır:
--   - yarınki randevulara hatırlatma ("randevu_hatirlatma")
--   - son randevusunun üzerinden 20 gün geçen müşteriye bakım daveti ("bakim_hatirlatma")
-- Bu migration yalnızca takip için gereken alanları ekler.
--
-- Tekrar çalıştırılabilir. Çalıştırma: Supabase Dashboard → SQL Editor

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Mesaj gönderildi mi? (iş tekrar çalışırsa ikinci mesaj gitmesin)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS whatsapp_revisit_sent_at timestamptz;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Gönderim kaydı: her deneme (başarılı/başarısız) burada tutulur.
--    appointment_id'de yabancı anahtar yok: randevu silinse de kayıt kalır.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid,
  kind            text        NOT NULL,
  customer_phone  text        NOT NULL,
  status          text        NOT NULL CHECK (status IN ('sent', 'failed')),
  error           text,
  meta_message_id text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Mesaj türleri: hatırlatma ve bakım daveti
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_kind_check;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_kind_check
  CHECK (kind IN ('reminder', 'revisit'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages (created_at DESC);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Yalnızca admin (giriş yapmış) okur; yazan Edge Function service role ile RLS'i aşar
DROP POLICY IF EXISTS "whatsapp_messages_admin_read" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_admin_read"
  ON whatsapp_messages FOR SELECT TO authenticated
  USING (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Kontrol (iki kolon da true dönmeli)
-- ──────────────────────────────────────────────────────────────────────────────
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'whatsapp_reminder_sent_at'
  ) AS hatirlatma_kolonu,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'whatsapp_revisit_sent_at'
  ) AS bakim_daveti_kolonu,
  (SELECT count(*) FROM whatsapp_messages) AS mesaj_kaydi;
