-- ============================================================
-- Faz 6.4 — RLS Düzeltme: banned_customers anon SELECT
-- ============================================================
-- Sorun: CustomerFormStep, yasaklı müşteri kontrolü için
-- banned_customers tablosunu anon (oturumsuz) kullanıcı olarak
-- sorgular. Mevcut RLS yalnızca authenticated'a izin verdiğinden
-- yasak kontrolü sessizce başarısız oluyordu.
-- Çözüm: anon SELECT politikası eklendi.
-- ============================================================

CREATE POLICY "banned_customers_anon_read"
  ON banned_customers FOR SELECT
  TO anon
  USING (true);
