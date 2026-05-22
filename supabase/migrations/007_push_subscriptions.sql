-- Web Push bildirim abonelikleri
-- Admin'in kayıtlı cihazlarına push göndermek için endpoint ve şifreleme anahtarlarını saklar.
CREATE TABLE push_subscriptions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint   text        NOT NULL UNIQUE,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Yalnızca giriş yapmış admin yönetebilir; Edge Function servis rolüyle RLS'yi atlar.
CREATE POLICY "Admin push subscription yönetimi"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
