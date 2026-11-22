-- Migration 019: Müşteri bildirim abonelikleri (bakım daveti web push ile)
--
-- Bakım daveti ("son randevunun üzerinden 20 gün geçti") önce ücretsiz web push
-- bildirimi olarak gider. Bildirim aboneliği olmayan müşteriye, yalnızca
-- WHATSAPP_REVISIT_ENABLED=true ise WhatsApp şablonu gider
-- (supabase/functions/whatsapp-reminders).
--
-- Abonelik telefon numarasına bağlıdır. Müşteri "Bildirimleri Aç" dediğinde
-- save_customer_push_subscription ile kaydedilir; yalnızca kayıtlı müşteriler
-- (approved_customers, migration 015) kayıt yapabilir.
--
-- Tekrar çalıştırılabilir. Çalıştırma: Supabase Dashboard → SQL Editor

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Abonelikler
--    Bir cihaz birden fazla numaraya bağlı olabilir (ör. aynı telefondan baba
--    ve oğul randevu alıyorsa); her numaranın daveti o cihaza gider.
--    UNIQUE (customer_phone, endpoint) numaraya göre aramada index işi de görür.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_push_subscriptions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text        NOT NULL,
  endpoint       text        NOT NULL,
  p256dh         text        NOT NULL,
  auth           text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_phone, endpoint)
);

-- Süresi dolan abonelik endpoint'e göre silinir
CREATE INDEX IF NOT EXISTS idx_customer_push_subscriptions_endpoint
  ON customer_push_subscriptions (endpoint);

ALTER TABLE customer_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin (giriş yapmış) yalnızca okur. Müşteri tarafı (anon) tabloya doğrudan
-- erişemez, yalnızca aşağıdaki fonksiyonla kayıt yapar. Gönderen Edge Function
-- service role ile RLS'i aşar.
DROP POLICY IF EXISTS "customer_push_subscriptions_admin_read" ON customer_push_subscriptions;
CREATE POLICY "customer_push_subscriptions_admin_read"
  ON customer_push_subscriptions FOR SELECT TO authenticated
  USING (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Kayıt fonksiyonu: kayıtlı müşteri numarası için cihazı kaydeder/tazeler.
--    Kayıtlı olmayan numara ya da geçersiz abonelik bilgisi için false döner.
--    Numarayı bilen biri o müşterinin davetini kendi cihazına alabilir; davette
--    yalnızca ilk ad var (016'nın zaten verdiği bilgi).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_customer_push_subscription(
  p_phone    text,
  p_endpoint text,
  p_p256dh   text,
  p_auth     text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(p_phone, '[^0-9]', '', 'g');
BEGIN
  -- Push servisleri https adres verir; anahtarlar base64url ve kısadır
  IF coalesce(p_endpoint, '') !~ '^https://' OR length(p_endpoint) > 2048
     OR coalesce(length(p_p256dh), 0) NOT BETWEEN 1 AND 256
     OR coalesce(length(p_auth), 0) NOT BETWEEN 1 AND 256 THEN
    RETURN false;
  END IF;

  IF NOT public.is_approved_customer(v_phone) THEN
    RETURN false;
  END IF;

  INSERT INTO customer_push_subscriptions (customer_phone, endpoint, p256dh, auth)
  VALUES (v_phone, p_endpoint, p_p256dh, p_auth)
  ON CONFLICT (customer_phone, endpoint)
  DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = now();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_customer_push_subscription(text, text, text, text) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Bugüne kadar "1 saat önce hatırlatma" için kaydedilmiş cihazlar
--    randevudaki numaraya bağlanır (migration 008)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO customer_push_subscriptions (customer_phone, endpoint, p256dh, auth)
SELECT DISTINCT ON (phone, endpoint) phone, endpoint, p256dh, auth
FROM (
  SELECT regexp_replace(a.customer_phone, '[^0-9]', '', 'g') AS phone,
         r.endpoint, r.p256dh, r.auth, r.created_at
  FROM appointment_reminders r
  JOIN appointments a ON a.id = r.appointment_id
) AS past
WHERE phone <> ''
ORDER BY phone, endpoint, created_at DESC
ON CONFLICT (customer_phone, endpoint) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Gönderim kaydında kanal: whatsapp (ücretli) / push (ücretsiz bildirim)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_channel_check;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_channel_check
  CHECK (channel IN ('whatsapp', 'push'));

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Kontrol (ilk iki kolon true dönmeli)
-- ──────────────────────────────────────────────────────────────────────────────
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'save_customer_push_subscription'
  ) AS kayit_fonksiyonu,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_messages' AND column_name = 'channel'
  ) AS kanal_kolonu,
  (SELECT count(*) FROM customer_push_subscriptions) AS kayitli_cihaz;
