-- F-16 Phase 4: Auto-cancel pending-deposit bookings
-- Runs hourly via pg_cron. Reads cutoff window from platform_settings.booking_auto_cancel_hours (default 24h).

CREATE OR REPLACE FUNCTION public.auto_cancel_pending_deposit_bookings()
RETURNS TABLE(cancelled_count integer, cutoff_hours integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_hours integer;
  v_cancelled integer := 0;
  v_booking record;
BEGIN
  -- Read window from platform_settings; fallback 24h
  SELECT COALESCE(NULLIF(value, '')::integer, 24)
    INTO v_cutoff_hours
  FROM public.platform_settings
  WHERE key = 'booking_auto_cancel_hours';

  IF v_cutoff_hours IS NULL THEN
    v_cutoff_hours := 24;
  END IF;

  -- Find candidates: pending booking with required-but-unpaid deposit, created longer than cutoff
  FOR v_booking IN
    SELECT id, shop_id, customer_name, customer_user_id, deposit_amount, created_at
    FROM public.bookings
    WHERE status = 'pending'
      AND deposit_required = true
      AND deposit_status = 'pending'
      AND created_at < (now() - make_interval(hours => v_cutoff_hours))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.bookings
    SET status = 'cancelled',
        deposit_status = 'expired',
        cancelled_at = now(),
        cancelled_reason = 'auto_cancel_pending_dp',
        updated_at = now()
    WHERE id = v_booking.id;

    -- Audit log (actor_id NULL = system)
    INSERT INTO public.staff_audit_logs (shop_id, actor_id, target_user_id, target_name, action, meta)
    VALUES (
      v_booking.shop_id,
      NULL,
      v_booking.customer_user_id,
      v_booking.customer_name,
      'auto_cancel_pending_dp',
      jsonb_build_object(
        'booking_id', v_booking.id,
        'deposit_amount', v_booking.deposit_amount,
        'created_at', v_booking.created_at,
        'cutoff_hours', v_cutoff_hours
      )
    );

    v_cancelled := v_cancelled + 1;
  END LOOP;

  RETURN QUERY SELECT v_cancelled, v_cutoff_hours;
END;
$$;

COMMENT ON FUNCTION public.auto_cancel_pending_deposit_bookings IS 'F-16 Fase 4: Cancel bookings with pending deposit older than platform_settings.booking_auto_cancel_hours. Dijadwalkan hourly via pg_cron.';

-- Unschedule existing job (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-cancel-pending-deposit-bookings')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-cancel-pending-deposit-bookings');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule hourly
SELECT cron.schedule(
  'auto-cancel-pending-deposit-bookings',
  '15 * * * *',  -- setiap jam pada menit ke-15
  $$ SELECT public.auto_cancel_pending_deposit_bookings(); $$
);