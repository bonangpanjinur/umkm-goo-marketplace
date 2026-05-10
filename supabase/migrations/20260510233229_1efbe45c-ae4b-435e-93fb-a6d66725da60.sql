
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent unschedule helpers
DO $$
DECLARE
  jn text;
BEGIN
  FOREACH jn IN ARRAY ARRAY['kopihub_expire_plans','kopihub_expire_invoices','kopihub_owner_reminders']
  LOOP
    PERFORM cron.unschedule(jn) FROM cron.job WHERE jobname = jn;
  END LOOP;
END $$;

SELECT cron.schedule(
  'kopihub_expire_plans',
  '0 */6 * * *',
  $$ SELECT public.expire_overdue_plans(); $$
);

SELECT cron.schedule(
  'kopihub_expire_invoices',
  '0 19 * * *', -- 02:00 WIB (UTC+7) = 19:00 UTC previous day
  $$ SELECT public.expire_stale_pending_invoices(); $$
);

SELECT cron.schedule(
  'kopihub_owner_reminders',
  '5 * * * *',
  $$ SELECT public.generate_owner_reminders(); $$
);
