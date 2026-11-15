-- Migration 016: Karşılama ekranı için kayıtlı müşterinin ilk adı
--
-- Numara girildikten sonra müşteri "Hoş geldiniz, Ahmet" ekranıyla karşılanır.
-- Numarayı bilen birine soyad ve liste verilmez; yalnızca ilk ad döner.
-- Kayıtlı olmayan numara için NULL döner (kayıt kontrolü de bununla yapılır).
-- Randevu kaydındaki kısıt (015, is_approved_customer) aynen geçerlidir.
--
-- Tekrar çalıştırılabilir. Çalıştırma: Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION public.approved_customer_first_name(p_phone text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT split_part(btrim(customer_name), ' ', 1)
  FROM approved_customers
  WHERE customer_phone = regexp_replace(p_phone, '[^0-9]', '', 'g')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.approved_customer_first_name(text) TO anon, authenticated;

-- Kontrol: listedeki kayıt sayısı ve kayıtsız bir numaranın sonucu (boş olmalı)
SELECT
  (SELECT count(*) FROM approved_customers) AS listedeki_musteri,
  public.approved_customer_first_name('05000000000') AS kayitsiz_numara_sonucu;
