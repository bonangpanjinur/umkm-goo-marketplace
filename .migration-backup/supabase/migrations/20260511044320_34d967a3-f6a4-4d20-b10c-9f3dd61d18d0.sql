-- =========================================================
-- BATCH B: Security Hardening
-- =========================================================

-- 1) Revoke EXECUTE on ALL SECURITY DEFINER functions from PUBLIC and anon
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- 2) Grant EXECUTE to authenticated for client-callable RPCs only
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_checkout(text, text, text, text, text, jsonb, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_marketplace_cart() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_report(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_report_daily(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_entitlements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_stats(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_daily(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_top_products(uuid, timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_available_delivery_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.courier_mark_delivered(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_courier_atomic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_shift(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_shift(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_dispute(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_order_message(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_order(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_hold_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_release_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_refund_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_plan_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_plan_invoice(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_shop_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_shop_plan(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_shop(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend_shop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_feature(text, text, text, text, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_theme(text, text, text, text, text, text, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_plan_feature(uuid, text, integer, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_plan_theme(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_plan_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_plan_theme(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_admin_stats(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_admin_daily(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_admin_top_shops(timestamptz, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_shop_theme(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_custom_domain_verified(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid) TO authenticated;

-- Public callable (anon allowed)
GRANT EXECUTE ON FUNCTION public.get_billing_settings_public() TO anon, authenticated;

-- 3) Move pg_trgm extension out of public (if installed in public)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
    EXECUTE 'ALTER EXTENSION pg_trgm SET SCHEMA extensions';
  END IF;
END $$;

-- 4) Storage: drop overly broad SELECT-all policies on public buckets, keep per-bucket SELECT only
-- Note: keep public read for known buckets, just ensure no listing-all policies exist.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND cmd='SELECT'
      AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;