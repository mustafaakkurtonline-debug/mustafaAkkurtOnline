-- Migration 018: Hizmet silme (arşivleme)
--
-- appointments.service_id → services(id) ON DELETE RESTRICT olduğu için randevu
-- geçmişi olan bir hizmet veritabanından silinemez. Admin panelindeki "Sil"
-- bu durumda hizmeti arşivler (deleted_at dolar, is_active = false): listeden
-- kalkar, müşteriye gösterilmez, eski randevularda hizmet adı korunur.
-- Randevusu hiç olmayan hizmet ise tamamen silinir.
--
-- Tekrar çalıştırılabilir. Çalıştırma: Supabase Dashboard → SQL Editor

ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
