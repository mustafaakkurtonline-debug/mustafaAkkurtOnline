-- Migration 020: Günlük hatırlatma / davet işinin zamanlanması (Supabase Cron)
--
-- whatsapp-reminders Edge Function'ı kendi kendine çalışmaz; her gün birinin
-- çağırması gerekir. Bu iş Supabase'in kendi zamanlayıcısıyla (pg_cron) yapılır:
-- her gün 21:00 İstanbul'da fonksiyon çağrılır (pg_net ile HTTP isteği).
--   - Yarınki randevulara WhatsApp hatırlatması (WhatsApp hesabı bağlıysa)
--   - 20 gün olan müşteriye davet: önce bildirim, yoksa WhatsApp (açıksa)
--
-- Çağrı CRON_SECRET ile yetkilendirilir. Sır, Vault'ta "cron_secret" adıyla
-- durur ve Edge Function secret'ı CRON_SECRET ile aynı olmalıdır. Sır bu
-- dosyada yoktur; değiştirmek için ikisi birlikte güncellenir:
--   supabase secrets set CRON_SECRET=...  ve  vault.update_secret(...)
--
-- Saat: pg_cron UTC çalışır. Türkiye yıl boyu UTC+3 (yaz saati yok):
-- 18:00 UTC = 21:00 İstanbul.
--
-- Tekrar çalıştırılabilir (aynı adlı iş güncellenir). Çalıştırma: SQL Editor

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'gunluk-hatirlatma-ve-davet',
  '0 18 * * *',
  $job$
    SELECT net.http_post(
      url := 'https://pwtwpwdoblczzzqchqul.supabase.co/functions/v1/whatsapp-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Kontrol: iş listede olmalı, Vault'ta sır bulunmalı (true)
-- Son çalışmalar:  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
-- Son yanıtlar (6 saat saklanır):
--   SELECT created, status_code, content FROM net._http_response ORDER BY created DESC LIMIT 5;
-- ──────────────────────────────────────────────────────────────────────────────
SELECT
  jobname,
  schedule,
  active,
  EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') AS vault_sirri_var
FROM cron.job
WHERE jobname = 'gunluk-hatirlatma-ve-davet';
