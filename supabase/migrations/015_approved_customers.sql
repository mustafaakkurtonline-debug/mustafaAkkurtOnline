-- Migration 015: Online randevu yalnızca kayıtlı müşterilere açık
--
-- Berber online randevunun yalnızca kendi müşterileri tarafından alınmasını
-- istiyor. Müşteri listesi admin panelinden yönetilir; listede olmayan bir
-- numarayla randevu kaydı veritabanı tarafından reddedilir.
--
-- Bu projede giriş yapan tek kullanıcı berberdir (müşteri hesabı yok), bu yüzden
-- "authenticated" = admin kabul edilir (001, 009, 014 ile aynı yaklaşım).
--
-- Tekrar çalıştırılabilir: yarıda kalmış bir denemeden sonra baştan çalıştırmak güvenlidir.
-- Çalıştırma: Supabase Dashboard → SQL Editor

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Müşteri listesi
--    Telefonlar randevularla aynı biçimde, yalnızca rakam olarak tutulur (05XXXXXXXXX)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approved_customers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  text        NOT NULL,
  customer_phone text        NOT NULL UNIQUE,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE approved_customers ENABLE ROW LEVEL SECURITY;

-- Listeyi yalnızca admin görür ve değiştirir; müşteri tarafı (anon) tabloyu okuyamaz
DROP POLICY IF EXISTS "approved_customers_admin_all" ON approved_customers;
CREATE POLICY "approved_customers_admin_all"
  ON approved_customers FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Bugüne kadar randevu almış herkes listeye eklenir (berberin kararı:
--    şimdiye kadar alanların hepsi kendi müşterisi). Aynı numarayla farklı
--    isimler yazılmışsa en son randevudaki isim kullanılır.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO approved_customers (customer_name, customer_phone)
SELECT DISTINCT ON (phone) trim(customer_name), phone
FROM (
  SELECT customer_name, regexp_replace(customer_phone, '[^0-9]', '', 'g') AS phone, created_at
  FROM appointments
) AS past
WHERE phone <> ''
ORDER BY phone, created_at DESC
ON CONFLICT (customer_phone) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Müşteri tarafı yalnızca "bu numara kayıtlı mı" sorusunu sorabilir;
--    liste ve isimler dışarı verilmez.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_approved_customer(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM approved_customers
    WHERE customer_phone = regexp_replace(p_phone, '[^0-9]', '', 'g')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_customer(text) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Randevu kaydı: giriş yapmamış kullanıcı yalnızca listedeki bir numarayla
--    randevu oluşturabilir; admin (giriş yapmış) kısıtlamasız ekleyebilir.
-- ──────────────────────────────────────────────────────────────────────────────
-- Politikalar birbirini genişletir: herkese açık eski bir kayıt politikası
-- kalırsa yeni kısıt işe yaramaz. Bu yüzden anon'a açık tüm kayıt politikaları
-- (001'deki "appointments_public_insert" ve dashboard'dan farklı adla eklenmiş
-- olanlar dahil) kaldırılır.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND cmd IN ('INSERT', 'ALL')
      AND roles && ARRAY['anon', 'public']::name[]
  LOOP
    EXECUTE format('DROP POLICY %I ON public.appointments', p.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "appointments_approved_insert" ON appointments;
CREATE POLICY "appointments_approved_insert"
  ON appointments FOR INSERT TO anon
  WITH CHECK (public.is_approved_customer(customer_phone));

-- Kaldırılan eski politika admin'e de kayıt izni veriyordu; o izin korunur
DROP POLICY IF EXISTS "appointments_admin_insert" ON appointments;
CREATE POLICY "appointments_admin_insert"
  ON appointments FOR INSERT TO authenticated
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Kontrol: listeye eklenen müşteri sayısı ve randevu kayıt politikaları
-- ──────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM approved_customers) AS eklenen_musteri,
  (SELECT string_agg(policyname || ' → ' || array_to_string(roles, ','), ' | ')
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'appointments' AND cmd IN ('INSERT', 'ALL')
  ) AS kayit_politikalari;
