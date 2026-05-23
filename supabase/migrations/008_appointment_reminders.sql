-- Müşteri randevu hatırlatma abonelikleri
-- Müşteri "Hatırlatma Al" butonuna bastığında push subscription bilgileri buraya kaydedilir.
CREATE TABLE appointment_reminders (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  endpoint       text        NOT NULL,
  p256dh         text        NOT NULL,
  auth           text        NOT NULL,
  reminder_sent  boolean     DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Anonim müşteri kendi randevusu için abonelik oluşturabilir.
CREATE POLICY "Müşteri hatırlatma aboneliği oluşturabilir"
  ON appointment_reminders FOR INSERT TO anon
  WITH CHECK (true);
