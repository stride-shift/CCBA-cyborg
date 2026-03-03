-- ============================================================
-- CRON JOB SETUP for send-scheduled-emails Edge Function
-- Runs every minute, calls the Edge Function via pg_net
-- ============================================================

-- Store project URL and service role key in vault
SELECT vault.create_secret(
  'https://mkvczghwutluguygixhx.supabase.co',
  'project_url',
  'Project URL for Edge Function invocations'
);

SELECT vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdmN6Z2h3dXRsdWd1eWdpeGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3OTc4MSwiZXhwIjoyMDg0NjU1NzgxfQ.ADVKt1dCYQTkkLFK8oVAupl1GBx4WrdidY1-RK_k1i8',
  'service_role_key',
  'Service role key for Edge Function auth'
);

-- Schedule cron job to run every minute
SELECT cron.schedule(
  'send-scheduled-emails',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
           || '/functions/v1/send-scheduled-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
