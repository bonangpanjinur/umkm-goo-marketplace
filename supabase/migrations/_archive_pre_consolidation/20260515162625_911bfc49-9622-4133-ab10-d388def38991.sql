
-- Refactor: cron auto-renewal membaca rule dari expiry_reminder_rules
CREATE OR REPLACE FUNCTION public.run_expiry_reminders_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_row RECORD;
  shop_row RECORD;
  total_sent integer := 0;
  total_skipped integer := 0;
  result jsonb := '[]'::jsonb;
BEGIN
  FOR rule_row IN
    SELECT * FROM public.expiry_reminder_rules
    WHERE is_active = true
    ORDER BY sort_order
  LOOP
    FOR shop_row IN
      SELECT cs.id, cs.name, cs.owner_id, cs.plan_expires_at, cs.trial_ends_at,
             COALESCE(p.code, 'free') AS plan_code, COALESCE(p.name, 'Free') AS plan_name
      FROM public.coffee_shops cs
      LEFT JOIN public.plans p ON p.id = cs.plan_id
      WHERE
        CASE
          WHEN rule_row.audience = 'trial' THEN
            cs.trial_ends_at IS NOT NULL
            AND DATE(cs.trial_ends_at) = CURRENT_DATE + (rule_row.days_before || ' days')::interval
          WHEN rule_row.audience = 'paid' THEN
            cs.plan_expires_at IS NOT NULL
            AND DATE(cs.plan_expires_at) = CURRENT_DATE + (rule_row.days_before || ' days')::interval
          ELSE false
        END
    LOOP
      -- Insert notifikasi in-app (channel 'in_app' diasumsikan default)
      BEGIN
        INSERT INTO public.notifications (shop_id, recipient_user_id, title, body, severity, category)
        VALUES (
          shop_row.id,
          shop_row.owner_id,
          COALESCE(rule_row.template_subject, 'Paket akan habis'),
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_body, 'Paket {{plan_name}} berakhir {{days_left}} hari lagi'),
            '{{shop_name}}', shop_row.name),
            '{{plan_name}}', shop_row.plan_name),
            '{{days_left}}', rule_row.days_before::text),
            '{{expires_at}}', COALESCE(shop_row.plan_expires_at::text, shop_row.trial_ends_at::text)),
          'warning',
          'billing'
        );
        total_sent := total_sent + 1;
      EXCEPTION WHEN OTHERS THEN
        total_skipped := total_skipped + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('total_sent', total_sent, 'total_skipped', total_skipped, 'ran_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_expiry_reminders_v2() FROM anon, authenticated;

-- Process subscription renewals — buat invoice otomatis untuk langganan jatuh tempo
CREATE OR REPLACE FUNCTION public.process_subscription_renewals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  new_invoice_id uuid;
  total_processed integer := 0;
  total_failed integer := 0;
BEGIN
  FOR sub IN
    SELECT * FROM public.plan_subscriptions
    WHERE status = 'active'
      AND next_billing_at <= now() + interval '1 day'
  LOOP
    BEGIN
      -- Buat invoice baru via RPC create_plan_invoice (jika function ada)
      BEGIN
        new_invoice_id := (SELECT public.create_plan_invoice(sub.plan_code))::uuid;
      EXCEPTION WHEN OTHERS THEN
        new_invoice_id := NULL;
      END;

      IF new_invoice_id IS NOT NULL THEN
        UPDATE public.plan_invoices
        SET subscription_id = sub.id,
            payment_method = sub.payment_provider
        WHERE id = new_invoice_id;

        UPDATE public.plan_subscriptions
        SET last_invoice_id = new_invoice_id,
            last_charge_at = now(),
            next_billing_at = next_billing_at + (CASE WHEN sub.billing_interval = 'yearly' THEN interval '365 days' ELSE interval '30 days' END),
            failure_count = 0
        WHERE id = sub.id;
        total_processed := total_processed + 1;
      ELSE
        UPDATE public.plan_subscriptions
        SET failure_count = failure_count + 1,
            status = CASE WHEN failure_count >= 3 THEN 'past_due' ELSE status END
        WHERE id = sub.id;
        total_failed := total_failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      total_failed := total_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', total_processed, 'failed', total_failed, 'ran_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_subscription_renewals() FROM anon, authenticated;

-- Schedule daily (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-expiry-reminders-v2') THEN
      PERFORM cron.unschedule('run-expiry-reminders-v2');
    END IF;
    PERFORM cron.schedule(
      'run-expiry-reminders-v2',
      '0 2 * * *', -- 09:00 WIB
      $cron$ SELECT public.run_expiry_reminders_v2(); $cron$
    );

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-renewals') THEN
      PERFORM cron.unschedule('process-subscription-renewals');
    END IF;
    PERFORM cron.schedule(
      'process-subscription-renewals',
      '15 2 * * *',
      $cron$ SELECT public.process_subscription_renewals(); $cron$
    );
  END IF;
END $$;
