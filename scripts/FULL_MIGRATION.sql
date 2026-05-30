-- =============================================================================
-- FULL_MIGRATION.sql — UMKMgo Master Migration
-- Dibuat otomatis dengan menggabungkan semua fresh_schema files (01→07).
-- Jalankan sekali di Supabase SQL Editor (atau via psql) pada database baru.
-- 
-- URUTAN:
--   01_core_schema.sql                    — tabel inti
--   02_indexes_views_triggers.sql         — indexes, views, triggers
--   03_constraints_foreign_keys.sql       — constraints & FK
--   04_policies_and_storage.sql           — RLS policies & storage
--   05_seed_reference_data.sql            — seed data referensi
--   06_post_consolidation.sql             — tabel post-konsolidasi
--   07_functions_and_late_migrations.sql  — fungsi, RLS, views, RPCs
-- =============================================================================

-- =============================================================================
-- BEGIN: 01_core_schema.sql
-- =============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public; (already exists)


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

-- bootstrap placeholder to satisfy early function compilation; dropped before real shops table
CREATE TABLE IF NOT EXISTS public.shops__bootstrap_placeholder (
    id uuid,
    owner_id uuid,
    name text,
    slug text,
    plan text,
    plan_expires_at timestamp with time zone,
    custom_domain text,
    custom_domain_verified_at timestamp with time zone,
    suspended_at timestamp with time zone,
    suspended_reason text,
    active_theme_key text,
    theme_key text,
    plan_started_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    business_category_id uuid
);

CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'owner',
    'cashier',
    'barista',
    'customer',
    'manager',
    'courier',
    'pelayan',
    'gudang',
    'koki',
    'helper',
    'supervisor'
);


--
-- Name: cash_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cash_movement_type AS ENUM (
    'in',
    'out',
    'sale',
    'refund',
    'opening',
    'closing'
);


--
-- Name: delivery_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_mode AS ENUM (
    'flat',
    'zone'
);


--
-- Name: fulfillment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fulfillment_type AS ENUM (
    'dine_in',
    'pickup',
    'delivery'
);


--
-- Name: order_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_channel AS ENUM (
    'pos',
    'online'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'completed',
    'voided',
    'refunded',
    'pending',
    'preparing',
    'ready',
    'delivering',
    'cancelled'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'qris',
    'manual_transfer',
    'cod'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'awaiting_verification',
    'paid',
    'refunded'
);


--
-- Name: po_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_status AS ENUM (
    'draft',
    'ordered',
    'received',
    'cancelled'
);


--
-- Name: promo_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promo_channel AS ENUM (
    'pos',
    'online',
    'all'
);


--
-- Name: promo_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promo_type AS ENUM (
    'percent',
    'nominal'
);


--
-- Name: shift_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: stock_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_movement_type AS ENUM (
    'purchase',
    'adjustment',
    'sale',
    'waste'
);


--
-- Name: wallet_txn_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_txn_type AS ENUM (
    'sale_pending',
    'sale_release',
    'commission',
    'withdrawal_hold',
    'withdrawal_paid',
    'withdrawal_refund',
    'refund',
    'adjustment'
);


--
-- Name: withdrawal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.withdrawal_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'paid',
    'cancelled'
);


--
-- Name: accept_staff_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_inv staff_invitations%ROWTYPE;
  v_email text;
BEGIN
  v_email := lower(coalesce((auth.jwt()->>'email'), ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_inv FROM public.staff_invitations
  WHERE token = _token AND accepted_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired';
  END IF;

  IF lower(v_inv.email) <> v_email THEN
    RAISE EXCEPTION 'email_mismatch';
  END IF;

  -- Create role row (idempotent on user_id+role+shop)
  INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id)
  VALUES (auth.uid(), v_inv.role, v_inv.shop_id, v_inv.outlet_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.staff_invitations
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('shop_id', v_inv.shop_id, 'role', v_inv.role);
END;
$$;


--
-- Name: admin_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
  month_start timestamptz := date_trunc('month', now());
  seven_days timestamptz := now() + interval '7 days';
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'shops', (SELECT count(*) FROM public.shops__bootstrap_placeholder),
    'pro', (SELECT count(*) FROM public.shops__bootstrap_placeholder WHERE plan = 'pro'),
    'pending', (SELECT count(*) FROM plan_invoices WHERE status = 'awaiting_review'),
    'mrr', COALESCE((SELECT sum(amount_idr) FROM plan_invoices WHERE status = 'paid' AND paid_at >= month_start), 0),
    'expiringSoon', (SELECT count(*) FROM public.shops__bootstrap_placeholder WHERE plan = 'pro' AND plan_expires_at >= now() AND plan_expires_at <= seven_days),
    'domainOffline', (SELECT count(*) FROM public.shops__bootstrap_placeholder WHERE custom_domain IS NOT NULL AND custom_domain_verified_at IS NULL),
    'suspended', (SELECT count(*) FROM public.shops__bootstrap_placeholder WHERE suspended_at IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;


--
-- Name: admin_remove_plan_feature(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_remove_plan_feature(_plan_id uuid, _feature_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  DELETE FROM plan_features WHERE plan_id = _plan_id AND feature_key = _feature_key;
END; $$;


--
-- Name: admin_remove_plan_theme(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_remove_plan_theme(_plan_id uuid, _theme_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  DELETE FROM plan_themes WHERE plan_id = _plan_id AND theme_key = _theme_key;
END; $$;


--
-- Name: admin_set_shop_plan(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  old_plan text;
  old_exp timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _plan NOT IN ('free','pro') THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;

  SELECT plan, plan_expires_at INTO old_plan, old_exp FROM public.shops__bootstrap_placeholder WHERE id = _shop_id;

  UPDATE public.shops__bootstrap_placeholder
    SET plan = _plan,
        plan_expires_at = CASE WHEN _plan = 'pro' THEN _expires_at ELSE NULL END,
        updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('plan_manual_set', _shop_id, auth.uid(),
    jsonb_build_object('old_plan', old_plan, 'old_expires_at', old_exp, 'new_plan', _plan, 'new_expires_at', _expires_at),
    'super-admin manual override');
END;
$$;


--
-- Name: admin_shop_detail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_shop_detail(_shop_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'shop', to_jsonb(s.*),
    'owner', jsonb_build_object(
      'id', s.owner_id,
      'display_name', p.display_name,
      'phone', p.phone
    ),
    'outlets_count', (SELECT count(*) FROM outlets WHERE shop_id = s.id),
    'orders_count', (SELECT count(*) FROM orders WHERE shop_id = s.id),
    'orders_30d', (SELECT count(*) FROM orders WHERE shop_id = s.id AND created_at >= now() - interval '30 days'),
    'menu_count', (SELECT count(*) FROM menu_items WHERE shop_id = s.id),
    'last_order_at', (SELECT max(created_at) FROM orders WHERE shop_id = s.id)
  ) INTO result
  FROM public.shops__bootstrap_placeholder s
  LEFT JOIN profiles p ON p.id = s.owner_id
  WHERE s.id = _shop_id;

  RETURN result;
END;
$$;


--
-- Name: admin_suspend_shop(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_suspend_shop(_shop_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.shops__bootstrap_placeholder
    SET suspended_at = now(), suspended_reason = _reason, is_active = false, updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('shop_suspended', _shop_id, auth.uid(), jsonb_build_object('reason', _reason), _reason);

  INSERT INTO owner_notifications (shop_id, type, severity, title, body, dedupe_key)
  VALUES (_shop_id, 'shop_suspended', 'error',
    'Toko Anda dinonaktifkan oleh admin',
    COALESCE(_reason, 'Hubungi admin untuk informasi lebih lanjut.'),
    'shop_suspended:' || to_char(now(), 'YYYY-MM-DD-HH24'))
  ON CONFLICT (shop_id, dedupe_key) DO NOTHING;
END;
$$;


--
-- Name: admin_unsuspend_shop(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_unsuspend_shop(_shop_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.shops__bootstrap_placeholder
    SET suspended_at = NULL, suspended_reason = NULL, is_active = true, updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('shop_unsuspended', _shop_id, auth.uid(), '{}'::jsonb, NULL);
END;
$$;


--
-- Name: admin_upsert_feature(text, text, text, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_upsert_feature(_key text, _name text, _description text, _category text, _is_active boolean, _sort_order integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO features (key, name, description, category, is_active, sort_order)
  VALUES (_key, _name, _description, COALESCE(_category, 'general'), COALESCE(_is_active, true), COALESCE(_sort_order, 0))
  ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = now();
END; $$;


--
-- Name: admin_upsert_plan_feature(uuid, text, integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_upsert_plan_feature(_plan_id uuid, _feature_key text, _requires_min_months integer, _limit_value integer, _meta jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO plan_features (plan_id, feature_key, requires_min_months, limit_value, meta)
  VALUES (_plan_id, _feature_key, COALESCE(_requires_min_months, 0), _limit_value, COALESCE(_meta, '{}'::jsonb))
  ON CONFLICT (plan_id, feature_key) DO UPDATE
    SET requires_min_months = EXCLUDED.requires_min_months,
        limit_value = EXCLUDED.limit_value,
        meta = EXCLUDED.meta;
END; $$;


--
-- Name: admin_upsert_plan_theme(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_upsert_plan_theme(_plan_id uuid, _theme_key text, _requires_min_months integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO plan_themes (plan_id, theme_key, requires_min_months)
  VALUES (_plan_id, _theme_key, COALESCE(_requires_min_months, 0))
  ON CONFLICT (plan_id, theme_key) DO UPDATE
    SET requires_min_months = EXCLUDED.requires_min_months;
END; $$;


--
-- Name: admin_upsert_theme(text, text, text, text, text, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.admin_upsert_theme(_key text, _name text, _description text, _component_id text, _preview_image_url text, _tier_hint text, _is_active boolean, _sort_order integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO themes (key, name, description, component_id, preview_image_url, tier_hint, is_active, sort_order)
  VALUES (_key, _name, _description, _component_id, _preview_image_url, _tier_hint, COALESCE(_is_active, true), COALESCE(_sort_order, 0))
  ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        component_id = EXCLUDED.component_id,
        preview_image_url = EXCLUDED.preview_image_url,
        tier_hint = EXCLUDED.tier_hint,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = now();
END; $$;


--
-- Name: apply_loyalty_post_order(uuid, uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.apply_loyalty_post_order(_shop_id uuid, _user_id uuid, _order_id uuid, _earned integer, _redeemed integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF _user_id IS NULL OR (_earned <= 0 AND _redeemed <= 0) THEN
    RETURN;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF v_order.shop_id <> _shop_id THEN
    RAISE EXCEPTION 'shop_mismatch';
  END IF;

  -- Authorization: caller must be the customer of this order, or have outlet access (POS)
  IF NOT (
    (v_order.customer_user_id IS NOT NULL AND v_order.customer_user_id = v_caller AND v_caller = _user_id)
    OR public.has_outlet_access(v_caller, v_order.outlet_id)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Upsert balance
  INSERT INTO public.loyalty_points (shop_id, user_id, balance, total_earned, total_redeemed)
  VALUES (_shop_id, _user_id, GREATEST(_earned - _redeemed, 0), GREATEST(_earned, 0), GREATEST(_redeemed, 0))
  ON CONFLICT (shop_id, user_id) DO UPDATE
    SET balance = public.loyalty_points.balance + (_earned - _redeemed),
        total_earned = public.loyalty_points.total_earned + GREATEST(_earned, 0),
        total_redeemed = public.loyalty_points.total_redeemed + GREATEST(_redeemed, 0),
        updated_at = now();

  IF _earned > 0 THEN
    INSERT INTO public.loyalty_ledger (shop_id, user_id, order_id, delta, reason)
    VALUES (_shop_id, _user_id, _order_id, _earned, 'earn');
  END IF;
  IF _redeemed > 0 THEN
    INSERT INTO public.loyalty_ledger (shop_id, user_id, order_id, delta, reason)
    VALUES (_shop_id, _user_id, _order_id, -_redeemed, 'redeem');
  END IF;
END;
$$;


--
-- Name: apply_stock_movement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.apply_stock_movement() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.type IN ('purchase','adjustment') THEN
    UPDATE public.ingredients SET current_stock = current_stock + NEW.quantity WHERE id = NEW.ingredient_id;
  ELSIF NEW.type IN ('sale','waste') THEN
    UPDATE public.ingredients SET current_stock = current_stock - NEW.quantity WHERE id = NEW.ingredient_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: approve_plan_invoice(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.approve_plan_invoice(_invoice_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inv plan_invoices%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_new_expiry timestamptz;
  v_base timestamptz;
BEGIN
  IF NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_inv FROM plan_invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status = 'paid' THEN RAISE EXCEPTION 'already_paid'; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_inv.plan_id;

  -- Extend from current expiry if still active, else from now
  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO v_base
    FROM public.shops__bootstrap_placeholder WHERE id = v_inv.shop_id;
  v_new_expiry := v_base + (v_plan.duration_days || ' days')::interval;

  UPDATE plan_invoices
    SET status = 'paid', paid_at = now(),
        reviewed_by = v_caller, reviewed_at = now(),
        updated_at = now()
    WHERE id = _invoice_id;

  UPDATE public.shops__bootstrap_placeholder
    SET plan = 'pro', plan_expires_at = v_new_expiry, updated_at = now()
    WHERE id = v_inv.shop_id;

  RETURN jsonb_build_object('shop_id', v_inv.shop_id, 'plan_expires_at', v_new_expiry);
END;
$$;


--
-- Name: approve_wallet_topup(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_topup_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _topup RECORD;
  _wallet_id UUID;
  _new_balance NUMERIC(14,2);
  _is_owner BOOLEAN;
BEGIN
  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up tidak ditemukan'; END IF;
  IF _topup.status <> 'pending' THEN RAISE EXCEPTION 'Top-up sudah diproses (status: %)', _topup.status; END IF;

  SELECT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _topup.shop_id AND owner_id = auth.uid()) INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Get or create wallet
  SELECT id INTO _wallet_id FROM public.customer_wallets
    WHERE customer_user_id = _topup.customer_user_id AND shop_id = _topup.shop_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    INSERT INTO public.customer_wallets (customer_user_id, shop_id, balance, total_topped_up)
      VALUES (_topup.customer_user_id, _topup.shop_id, 0, 0)
      RETURNING id INTO _wallet_id;
  END IF;

  -- Credit topup amount
  UPDATE public.customer_wallets
    SET balance = balance + _topup.amount,
        total_topped_up = total_topped_up + _topup.amount
    WHERE id = _wallet_id
    RETURNING balance INTO _new_balance;

  INSERT INTO public.customer_wallet_transactions
    (wallet_id, customer_user_id, shop_id, type, amount, balance_after, ref_topup_id, note)
    VALUES (_wallet_id, _topup.customer_user_id, _topup.shop_id, 'topup', _topup.amount, _new_balance, _topup.id, 'Top-up disetujui');

  -- Credit bonus if any
  IF _topup.bonus_amount > 0 THEN
    UPDATE public.customer_wallets
      SET balance = balance + _topup.bonus_amount
      WHERE id = _wallet_id
      RETURNING balance INTO _new_balance;
    INSERT INTO public.customer_wallet_transactions
      (wallet_id, customer_user_id, shop_id, type, amount, balance_after, ref_topup_id, note)
      VALUES (_wallet_id, _topup.customer_user_id, _topup.shop_id, 'bonus', _topup.bonus_amount, _new_balance, _topup.id, 'Bonus top-up');
  END IF;

  UPDATE public.wallet_topups SET status = 'paid', paid_at = now() WHERE id = _topup.id;
  RETURN _wallet_id;
END;
$$;


--
-- Name: approve_withdrawal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.approve_withdrawal(_id uuid, _proof_url text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE withdrawal_requests SET status='paid', proof_url=COALESCE(_proof_url,proof_url),
    reviewed_by=auth.uid(), reviewed_at=now(), paid_at=now(), updated_at=now()
    WHERE id=_id;

  UPDATE shop_wallets SET
    pending_balance = pending_balance - w.amount,
    total_withdrawn = total_withdrawn + w.amount,
    updated_at = now()
  WHERE shop_id = w.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (w.shop_id, 'withdrawal_paid', 0, _id, 'WD-'||substring(_id::text,1,8), 'Penarikan disetujui & dibayar', auth.uid());
END; $$;


--
-- Name: assign_courier_atomic(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.assign_courier_atomic(_order_id uuid, _courier_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_courier couriers%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_courier FROM couriers WHERE id = _courier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'courier_not_found'; END IF;

  -- Caller must be the courier's user OR have outlet access (owner/cashier assigning)
  IF NOT (
    v_courier.user_id = v_caller
    OR EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder s WHERE s.id = v_courier.shop_id AND s.owner_id = v_caller)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Lock the row to prevent double-claim
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF v_order.shop_id <> v_courier.shop_id THEN
    RAISE EXCEPTION 'shop_mismatch';
  END IF;

  IF v_order.courier_id IS NOT NULL AND v_order.courier_id <> _courier_id THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;

  IF v_order.status NOT IN ('ready', 'preparing') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE orders
    SET courier_id = _courier_id,
        updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('order_id', _order_id, 'courier_id', _courier_id);
END;
$$;


--
-- Name: auto_cancel_pending_deposit_bookings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_cancel_pending_deposit_bookings() RETURNS TABLE(cancelled_count integer, cutoff_hours integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: auto_release_escrow(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_release_escrow() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count int := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT o.id FROM orders o
    WHERE o.escrow_status = 'held'
      AND o.status = 'completed'
      AND o.delivered_at IS NOT NULL
      AND o.delivered_at < now() - interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM order_disputes d
        WHERE d.order_id = o.id AND d.status IN ('open','under_review')
      )
  LOOP
    PERFORM escrow_release_order(v_order.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('released', v_count);
END;
$$;


--
-- Name: auto_release_escrow_on_complete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_release_escrow_on_complete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.escrow_status = 'holding'
     AND NEW.status::text IN ('completed','delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_release_order(NEW.id);
  ELSIF NEW.escrow_status IN ('holding','released')
        AND NEW.status::text IN ('voided','cancelled')
        AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_refund_order(NEW.id, 'Order '||NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_unverify_domain(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.auto_unverify_domain(_shop_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.shops__bootstrap_placeholder
    SET custom_domain_verified_at = NULL,
        last_dns_check_at = now(),
        updated_at = now()
    WHERE id = _shop_id;
  INSERT INTO public.domain_audit (shop_id, action, notes)
    VALUES (_shop_id, 'auto_unverify', COALESCE(_reason, 'dns recheck failed'));
END;
$$;


--
-- Name: booking_cancel_by_token(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.booking_cancel_by_token(_token uuid, _reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_booking bookings%ROWTYPE; v_slot_dt timestamptz;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE cancel_token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_booking.status IN ('cancelled','completed','no_show') THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_booking.status);
  END IF;

  SELECT (slot_date + slot_time)::timestamptz INTO v_slot_dt
    FROM booking_slots WHERE id = v_booking.slot_id;
  IF v_slot_dt < now() + interval '24 hours' THEN
    RAISE EXCEPTION 'too_late_to_cancel';
  END IF;

  UPDATE bookings
    SET status = 'cancelled', cancelled_at = now(), cancelled_reason = _reason, updated_at = now()
    WHERE id = v_booking.id;

  PERFORM create_notification(
    (SELECT owner_id FROM public.shops__bootstrap_placeholder WHERE id = v_booking.shop_id),
    'booking_cancelled', 'Booking dibatalkan pelanggan',
    v_booking.customer_name || ' membatalkan booking',
    '/pos-app/booking', 'warning', v_booking.shop_id,
    'booking_cancelled:' || v_booking.id::text
  );
  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking.id);
END $$;


--
-- Name: bookings_fill_shop_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bookings_fill_shop_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    SELECT shop_id INTO NEW.shop_id FROM public.booking_slots WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: calc_attendance_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.calc_attendance_duration() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.duration_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in))::int / 60);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_booking_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.check_booking_capacity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_capacity int;
  v_type text;
  v_booked int;
BEGIN
  -- Only validate active bookings
  IF NEW.status IN ('cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT capacity, booking_type INTO v_capacity, v_type
  FROM public.booking_slots WHERE id = NEW.slot_id;

  IF v_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(party_size), 0) INTO v_booked
  FROM public.bookings
  WHERE slot_id = NEW.slot_id
    AND status IN ('pending','confirmed','completed')
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF (v_booked + NEW.party_size) > v_capacity THEN
    IF v_type = 'table' THEN
      RAISE EXCEPTION 'Meja/area ini sudah dipesan pada waktu tersebut. Pilih slot lain.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'Slot ini sudah penuh. Pilih slot lain.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: close_shift(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.close_shift(_shift_id uuid, _closing_cash numeric, _note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_shift cash_shifts%ROWTYPE;
  v_cash_sales numeric := 0;
  v_cash_in numeric := 0;
  v_cash_out numeric := 0;
  v_refunds numeric := 0;
  v_expected numeric;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_shift FROM public.cash_shifts WHERE id = _shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF v_shift.status = 'closed' THEN RAISE EXCEPTION 'shift_already_closed'; END IF;
  IF NOT public.has_outlet_access(v_caller, v_shift.outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Sum cash sales linked to this shift
  SELECT COALESCE(SUM(
    CASE
      WHEN o.payment_method = 'cash' THEN o.total
      WHEN jsonb_array_length(o.payment_split) > 0 THEN COALESCE((
        SELECT SUM((elem->>'amount')::numeric)
        FROM jsonb_array_elements(o.payment_split) elem
        WHERE elem->>'method' = 'cash'
      ), 0)
      ELSE 0
    END
  ), 0) INTO v_cash_sales
  FROM public.orders o
  WHERE o.shift_id = _shift_id AND o.status NOT IN ('voided','cancelled');

  SELECT COALESCE(SUM(amount),0) INTO v_cash_in
    FROM public.cash_movements WHERE shift_id = _shift_id AND type = 'in';
  SELECT COALESCE(SUM(amount),0) INTO v_cash_out
    FROM public.cash_movements WHERE shift_id = _shift_id AND type = 'out';
  SELECT COALESCE(SUM(amount),0) INTO v_refunds
    FROM public.cash_movements WHERE shift_id = _shift_id AND type = 'refund';

  v_expected := v_shift.opening_cash + v_cash_sales + v_cash_in - v_cash_out - v_refunds;

  UPDATE public.cash_shifts
    SET status = 'closed',
        closed_by = v_caller,
        closed_at = now(),
        closing_cash = COALESCE(_closing_cash, 0),
        expected_cash = v_expected,
        variance = COALESCE(_closing_cash, 0) - v_expected,
        note = COALESCE(_note, note),
        updated_at = now()
    WHERE id = _shift_id;

  INSERT INTO public.cash_movements (shift_id, type, amount, note, created_by)
  VALUES (_shift_id, 'closing', COALESCE(_closing_cash, 0), 'Tutup shift', v_caller);

  RETURN jsonb_build_object(
    'shift_id', _shift_id,
    'opening_cash', v_shift.opening_cash,
    'cash_sales', v_cash_sales,
    'cash_in', v_cash_in,
    'cash_out', v_cash_out,
    'refunds', v_refunds,
    'expected_cash', v_expected,
    'closing_cash', COALESCE(_closing_cash, 0),
    'variance', COALESCE(_closing_cash, 0) - v_expected
  );
END;
$$;


--
-- Name: compute_upsell_suggestions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.compute_upsell_suggestions() RETURNS TABLE(processed_products integer, inserted_pairs integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_processed int := 0;
  v_inserted  int := 0;
BEGIN
  DELETE FROM public.product_upsell_suggestions
   WHERE source = 'auto' AND is_pinned = false;

  WITH recent_items AS (
    SELECT DISTINCT oi.order_id, oi.menu_item_id
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
     WHERE oi.menu_item_id IS NOT NULL
       AND o.created_at >= now() - INTERVAL '90 days'
       AND COALESCE(o.status::text, '') NOT IN ('cancelled','refunded','draft','pending')
  ),
  pairs AS (
    SELECT a.menu_item_id AS product_id,
           b.menu_item_id AS suggested_id,
           COUNT(*)::numeric AS score
      FROM recent_items a
      JOIN recent_items b ON a.order_id = b.order_id AND a.menu_item_id <> b.menu_item_id
     GROUP BY a.menu_item_id, b.menu_item_id
    HAVING COUNT(*) >= 2
  ),
  ranked AS (
    SELECT p.*,
           m1.shop_id AS product_shop,
           m2.shop_id AS suggested_shop,
           ROW_NUMBER() OVER (PARTITION BY p.product_id ORDER BY p.score DESC) AS rn
      FROM pairs p
      JOIN public.menu_items m1 ON m1.id = p.product_id   AND m1.is_available = true
      JOIN public.menu_items m2 ON m2.id = p.suggested_id AND m2.is_available = true
  ),
  filtered AS (
    SELECT * FROM ranked WHERE rn <= 6 AND product_shop = suggested_shop
  ),
  ins AS (
    INSERT INTO public.product_upsell_suggestions
           (shop_id, product_id, suggested_id, score, position, source)
    SELECT product_shop, product_id, suggested_id, score, rn::smallint, 'auto'
      FROM filtered
    ON CONFLICT (product_id, suggested_id) DO UPDATE
      SET score = EXCLUDED.score, position = EXCLUDED.position, updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(DISTINCT product_id)::int, COUNT(*)::int FROM filtered
    INTO v_processed, v_inserted;

  RETURN QUERY SELECT v_processed, v_inserted;
END;
$$;


--
-- Name: consume_stock_for_order_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.consume_stock_for_order_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_track boolean;
  v_shop uuid;
  rec RECORD;
BEGIN
  IF NEW.menu_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.track_stock, m.shop_id INTO v_track, v_shop
  FROM public.menu_items m WHERE m.id = NEW.menu_item_id;

  IF NOT COALESCE(v_track, false) THEN
    RETURN NEW;
  END IF;

  FOR rec IN
    SELECT ingredient_id, quantity FROM public.recipes WHERE menu_item_id = NEW.menu_item_id
  LOOP
    INSERT INTO public.stock_movements (shop_id, ingredient_id, type, quantity, note, order_id)
    VALUES (v_shop, rec.ingredient_id, 'sale', rec.quantity * NEW.quantity, 'Auto from order', NEW.order_id);
  END LOOP;

  RETURN NEW;
END;
$$;


--
-- Name: courier_mark_delivered(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.courier_mark_delivered(_order_id uuid, _proof_url text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders o
    JOIN couriers c ON c.id = o.courier_id
    WHERE o.id = _order_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE orders
  SET status = 'completed'::order_status,
      delivery_proof_url = _proof_url,
      delivered_at = now(),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.create_notification(_recipient uuid, _type text, _title text, _body text DEFAULT NULL::text, _link text DEFAULT NULL::text, _severity text DEFAULT 'info'::text, _shop_id uuid DEFAULT NULL::uuid, _dedupe_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  IF _recipient IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications
    (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
  VALUES (_recipient, _shop_id, _type, _title, _body, _link, _severity, _dedupe_key)
  ON CONFLICT (recipient_user_id, dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: enforce_qr_table_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.enforce_qr_table_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only enforce on QR-table orders that remain QR-table.
  IF OLD.order_source = 'qr_table'
     AND NEW.order_source = 'qr_table'
     AND COALESCE(NEW.table_label, '') IS DISTINCT FROM COALESCE(OLD.table_label, '')
  THEN
    RAISE EXCEPTION
      'Meja terkunci untuk order QR. Batalkan QR (dengan alasan) terlebih dahulu.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ensure_shop_wallet(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.ensure_shop_wallet(_shop_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.shop_wallets (shop_id) VALUES (_shop_id)
  ON CONFLICT (shop_id) DO NOTHING;
END;
$$;


--
-- Name: escrow_hold_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.escrow_hold_order(_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_rate NUMERIC(5,2);
  v_commission NUMERIC(14,2);
  v_net NUMERIC(14,2);
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status <> 'none' THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_order.escrow_status);
  END IF;

  -- Resolve commission rate: shop override > category > global default 5%
  SELECT COALESCE(
    (SELECT (value->>'rate')::numeric FROM platform_settings WHERE key = 'commission_shop_'||v_order.shop_id::text),
    (SELECT (value->>'rate')::numeric FROM platform_settings WHERE key = 'commission_default'),
    5
  ) INTO v_rate;

  v_commission := ROUND(v_order.total * v_rate / 100, 2);
  v_net := v_order.total - v_commission;

  PERFORM public.ensure_shop_wallet(v_order.shop_id);

  UPDATE orders SET
    commission_rate = v_rate,
    commission_amount = v_commission,
    net_to_shop = v_net,
    escrow_status = 'holding',
    updated_at = now()
  WHERE id = _order_id;

  UPDATE shop_wallets SET
    pending_balance = pending_balance + v_net,
    updated_at = now()
  WHERE shop_id = v_order.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'sale_pending', v_net, _order_id, v_order.order_no,
          'Escrow hold: total '||v_order.total||' - komisi '||v_commission);

  RETURN jsonb_build_object('order_id', _order_id, 'commission', v_commission, 'net', v_net);
END; $$;


--
-- Name: escrow_refund_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.escrow_refund_order(_order_id uuid, _reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status NOT IN ('holding','released') THEN
    RETURN jsonb_build_object('skipped', true);
  END IF;

  IF v_order.escrow_status = 'holding' THEN
    UPDATE shop_wallets SET pending_balance = pending_balance - v_order.net_to_shop, updated_at=now()
      WHERE shop_id = v_order.shop_id;
  ELSE
    UPDATE shop_wallets SET available_balance = available_balance - v_order.net_to_shop,
      total_earned = GREATEST(total_earned - v_order.net_to_shop, 0), updated_at=now()
      WHERE shop_id = v_order.shop_id;
  END IF;

  UPDATE orders SET escrow_status='refunded', updated_at=now() WHERE id=_order_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'refund', -v_order.net_to_shop, _order_id, v_order.order_no, COALESCE(_reason,'Refund'));

  RETURN jsonb_build_object('order_id', _order_id, 'refunded', v_order.net_to_shop);
END; $$;


--
-- Name: escrow_release_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.escrow_release_order(_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller UUID := auth.uid();
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status <> 'holding' THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_order.escrow_status);
  END IF;

  IF NOT public.has_role(v_caller, 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder s WHERE s.id = v_order.shop_id AND s.owner_id = v_caller) THEN
    -- allow trigger / system call (no auth.uid())
    IF v_caller IS NOT NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  END IF;

  UPDATE shop_wallets SET
    pending_balance = pending_balance - v_order.net_to_shop,
    available_balance = available_balance + v_order.net_to_shop,
    total_earned = total_earned + v_order.net_to_shop,
    total_commission_paid = total_commission_paid + v_order.commission_amount,
    updated_at = now()
  WHERE shop_id = v_order.shop_id;

  UPDATE orders SET
    escrow_status = 'released',
    escrow_released_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'sale_release', v_order.net_to_shop, _order_id, v_order.order_no, 'Dana cair ke saldo');

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'commission', -v_order.commission_amount, _order_id, v_order.order_no,
          'Komisi platform '||v_order.commission_rate||'%');

  RETURN jsonb_build_object('order_id', _order_id, 'released', v_order.net_to_shop);
END; $$;


--
-- Name: expire_overdue_plans(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.expire_overdue_plans() RETURNS TABLE(shop_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH affected AS (
    UPDATE public.shops__bootstrap_placeholder
      SET plan = 'free',
          custom_domain_verified_at = NULL,
          updated_at = now()
      WHERE plan = 'pro'
        AND plan_expires_at IS NOT NULL
        AND plan_expires_at < now()
      RETURNING id
  )
  SELECT id FROM affected;
END;
$$;


--
-- Name: expire_stale_pending_invoices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.expire_stale_pending_invoices() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.plan_invoices
      SET status = 'expired', updated_at = now()
      WHERE status = 'pending'
        AND payment_proof_url IS NULL
        AND created_at < now() - INTERVAL '7 days'
      RETURNING id
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;


--
-- Name: fn_issue_course_certificate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.fn_issue_course_certificate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_course_id UUID;
  v_shop_id UUID;
  v_total INT;
  v_done INT;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cm.menu_item_id, mi.shop_id
    INTO v_course_id, v_shop_id
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  JOIN public.menu_items mi ON mi.id = cm.menu_item_id
  WHERE cl.id = NEW.lesson_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.menu_item_id = v_course_id;

  SELECT COUNT(*) INTO v_done
  FROM public.lesson_progress lp
  JOIN public.course_lessons cl ON cl.id = lp.lesson_id
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.menu_item_id = v_course_id
    AND lp.user_id = NEW.user_id
    AND lp.completed_at IS NOT NULL;

  IF v_total > 0 AND v_done >= v_total THEN
    INSERT INTO public.course_certificates (shop_id, course_id, user_id)
    VALUES (v_shop_id, v_course_id, NEW.user_id)
    ON CONFLICT (course_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_owner_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.generate_owner_reminders() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_expiring int := 0;
  v_expired int := 0;
  v_invoice int := 0;
  v_domain int := 0;
BEGIN
  -- Plan expiring within 7 days (still pro)
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT s.id, 'plan_expiring',
           'Plan Pro akan berakhir',
           'Plan Pro Anda akan berakhir pada ' || to_char(s.plan_expires_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI'),
           '/app/billing', 'warning',
           'plan_expiring:' || to_char(s.plan_expires_at, 'YYYY-MM-DD')
    FROM public.shops__bootstrap_placeholder s
    WHERE s.plan = 'pro'
      AND s.plan_expires_at IS NOT NULL
      AND s.plan_expires_at > now()
      AND s.plan_expires_at < now() + interval '7 days'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_expiring FROM ins;

  -- Plan expired (now free)
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT s.id, 'plan_expired',
           'Plan Pro telah berakhir',
           'Akun Anda otomatis turun ke Free. Custom domain dinonaktifkan sementara.',
           '/app/billing', 'danger',
           'plan_expired:' || to_char(COALESCE(s.plan_expires_at, now()), 'YYYY-MM-DD')
    FROM public.shops__bootstrap_placeholder s
    WHERE s.plan = 'free'
      AND s.plan_expires_at IS NOT NULL
      AND s.plan_expires_at < now()
      AND s.plan_expires_at > now() - interval '14 days'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_expired FROM ins;

  -- Invoice pending > 2 days without proof
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT i.shop_id, 'invoice_pending',
           'Invoice menunggu pembayaran',
           'Invoice ' || i.invoice_no || ' sudah ' || extract(day from now() - i.created_at)::int || ' hari menunggu bukti pembayaran.',
           '/app/billing', 'warning',
           'invoice_pending:' || i.id::text
    FROM plan_invoices i
    WHERE i.status = 'pending'
      AND i.payment_proof_url IS NULL
      AND i.created_at < now() - interval '2 days'
      AND i.created_at > now() - interval '7 days'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_invoice FROM ins;

  -- Domain offline (was verified, now auto-unverified)
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT s.id, 'domain_offline',
           'Custom domain offline',
           'Domain ' || s.custom_domain || ' tidak lagi terdeteksi. Periksa pengaturan DNS Anda.',
           '/app/domain', 'danger',
           'domain_offline:' || s.custom_domain || ':' || to_char(s.last_dns_check_at, 'YYYY-MM-DD')
    FROM public.shops__bootstrap_placeholder s
    WHERE s.custom_domain IS NOT NULL
      AND s.custom_domain_verified_at IS NULL
      AND s.last_dns_check_at IS NOT NULL
      AND s.last_dns_check_at > now() - interval '24 hours'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_domain FROM ins;

  RETURN jsonb_build_object(
    'plan_expiring', v_expiring,
    'plan_expired', v_expired,
    'invoice_pending', v_invoice,
    'domain_offline', v_domain
  );
END;
$$;


--
-- Name: get_billing_settings_public(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_billing_settings_public() RETURNS TABLE(bank_name text, account_no text, account_name text, instructions text, qris_image_url text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT bank_name, account_no, account_name, instructions, qris_image_url
  FROM public.billing_settings
  WHERE id = 1;
END;
$$;


--
-- Name: get_customer_custom_orders(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_customer_custom_orders(p_shop_slug text, p_contact text) RETURNS TABLE(id uuid, shop_id uuid, product_id uuid, product_name text, customer_name text, description text, budget_min numeric, budget_max numeric, deadline date, reference_image_url text, status text, owner_note text, created_at timestamp with time zone, updated_at timestamp with time zone, history jsonb)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY select cor.id, cor.shop_id, cor.product_id, mi.name as product_name,
         cor.customer_name, cor.description, cor.budget_min, cor.budget_max,
         cor.deadline, cor.reference_image_url, cor.status, cor.owner_note,
         cor.created_at, cor.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'from_status', h.from_status,
             'to_status', h.to_status,
             'note', h.note,
             'created_at', h.created_at
           ) order by h.created_at)
           from public.custom_order_status_history h
           where h.request_id = cor.id
         ), '[]'::jsonb) as history
  from public.custom_order_requests cor
  join public.shops__bootstrap_placeholder cs on cs.id = cor.shop_id
  left join public.menu_items mi on mi.id = cor.product_id
  where cs.slug = p_shop_slug
    and regexp_replace(cor.customer_contact, '\D', '', 'g')
        = regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')) >= 6
  order by cor.created_at desc
  limit 50;
END;
$$;


--
-- Name: get_marketplace_admin_daily(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(_from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
    COALESCE(SUM(total), 0)::numeric AS gmv,
    COALESCE(SUM(commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM orders
  WHERE marketplace_order = true
    AND status NOT IN ('cancelled', 'pending')
    AND created_at >= _from
    AND created_at <= _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;


--
-- Name: get_marketplace_admin_stats(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(_from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'gmv', COALESCE(SUM(total), 0),
    'commission', COALESCE(SUM(commission_amount), 0),
    'net_to_shops', COALESCE(SUM(net_to_shop), 0),
    'orders', COUNT(*),
    'aov', COALESCE(AVG(total), 0),
    'take_rate', CASE WHEN COALESCE(SUM(total),0) > 0
                      THEN ROUND((COALESCE(SUM(commission_amount),0) / SUM(total) * 100)::numeric, 2)
                      ELSE 0 END,
    'shops_active', COUNT(DISTINCT shop_id),
    'customers', COUNT(DISTINCT customer_user_id)
  )
  INTO v_result
  FROM orders
  WHERE marketplace_order = true
    AND status NOT IN ('cancelled', 'pending')
    AND created_at >= _from
    AND created_at <= _to;

  RETURN v_result;
END;
$$;


--
-- Name: get_marketplace_admin_top_shops(timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(_from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10) RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.shop_id,
    s.name AS shop_name,
    COALESCE(SUM(o.total), 0)::numeric AS gmv,
    COALESCE(SUM(o.commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM orders o
  JOIN public.shops__bootstrap_placeholder s ON s.id = o.shop_id
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY o.shop_id, s.name
  ORDER BY gmv DESC
  LIMIT _limit;
END;
$$;


--
-- Name: get_my_active_memberships(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_my_active_memberships(_shop_ids uuid[]) RETURNS TABLE(shop_id uuid, tier_id uuid, tier_name text, discount_percent numeric, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT cm.shop_id, t.id, t.name, t.discount_percent, cm.expires_at
  FROM customer_memberships cm
  JOIN shop_membership_tiers t ON t.id = cm.tier_id
  WHERE cm.customer_user_id = auth.uid()
    AND cm.shop_id = ANY(_shop_ids)
    AND cm.status = 'active'
    AND cm.expires_at > now()
  ORDER BY t.discount_percent DESC;
END;
$$;


--
-- Name: get_my_entitlements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_my_entitlements() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_theme_key text;
  v_plan_code text := 'basic';
  v_started timestamptz;
  v_months numeric := 0;
  v_themes jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT id, theme_key, plan_started_at INTO v_shop_id, v_theme_key, v_started
    FROM public.shops__bootstrap_placeholder WHERE owner_id = v_uid LIMIT 1;
  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'key', key,
    'name', name,
    'description', description,
    'preview_image_url', preview_image_url,
    'allowed', true,
    'reason', NULL,
    'component_id', component_id
  ) ORDER BY sort_order)
  INTO v_themes FROM public.themes WHERE is_active = true;
  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'months_active', v_months,
    'active_theme_key', COALESCE(v_theme_key, 'classic'),
    'features', '[]'::jsonb,
    'themes', COALESCE(v_themes, '[]'::jsonb)
  );
END $$;


--
-- Name: get_or_create_marketplace_cart(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_or_create_marketplace_cart() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cart_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;
  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN
    INSERT INTO marketplace_carts (user_id) VALUES (_user_id) RETURNING id INTO _cart_id;
  END IF;
  RETURN _cart_id;
END;
$$;


--
-- Name: get_order_tracking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_order_tracking(_order_id uuid) RETURNS TABLE(id uuid, order_no text, status public.order_status, fulfillment public.fulfillment_type, channel public.order_channel, total numeric, delivery_fee numeric, delivery_address text, customer_name text, created_at timestamp with time zone, updated_at timestamp with time zone, shop_name text, shop_slug text, courier_name text, courier_phone text, courier_plate text, delivery_proof_url text, delivered_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT
    o.id, o.order_no, o.status, o.fulfillment, o.channel,
    o.total, o.delivery_fee, o.delivery_address, o.customer_name,
    o.created_at, o.updated_at,
    s.name, s.slug,
    c.name, c.phone, c.plate_number,
    o.delivery_proof_url, o.delivered_at
  FROM public.orders o
  JOIN public.shops__bootstrap_placeholder s ON s.id = o.shop_id
  LEFT JOIN public.couriers c ON c.id = o.courier_id
  WHERE o.id = _order_id
    AND o.channel = 'online';
END;
$$;


--
-- Name: get_profit_report(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_profit_report(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_revenue numeric := 0;
  v_cogs numeric := 0;
  v_orders int := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = v_caller)
     AND NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT
    COALESCE(SUM(o.subtotal - COALESCE(o.discount,0)), 0),
    COUNT(*)
  INTO v_revenue, v_orders
  FROM orders o
  WHERE o.shop_id = _shop_id
    AND o.created_at >= _from
    AND o.created_at < _to
    AND o.status NOT IN ('voided','cancelled');

  SELECT COALESCE(SUM(oi.quantity * r.quantity * COALESCE(i.cost_per_unit, 0)), 0)
  INTO v_cogs
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN recipes r ON r.menu_item_id = oi.menu_item_id
  JOIN ingredients i ON i.id = r.ingredient_id
  WHERE o.shop_id = _shop_id
    AND o.created_at >= _from
    AND o.created_at < _to
    AND o.status NOT IN ('voided','cancelled');

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'gross_profit', v_revenue - v_cogs,
    'margin_percent', CASE WHEN v_revenue > 0 THEN ROUND((v_revenue - v_cogs) / v_revenue * 100, 2) ELSE 0 END,
    'orders', v_orders
  );
END;
$$;


--
-- Name: get_profit_report_daily(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_profit_report_daily(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, revenue numeric, cogs numeric, gross_profit numeric, orders integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = v_caller)
     AND NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH rev AS (
    SELECT o.business_date AS d,
           SUM(o.subtotal - COALESCE(o.discount,0)) AS rev,
           COUNT(*)::int AS ord
    FROM orders o
    WHERE o.shop_id = _shop_id
      AND o.created_at >= _from AND o.created_at < _to
      AND o.status NOT IN ('voided','cancelled')
    GROUP BY o.business_date
  ),
  cogs AS (
    SELECT o.business_date AS d,
           SUM(oi.quantity * r.quantity * COALESCE(i.cost_per_unit, 0)) AS c
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN recipes r ON r.menu_item_id = oi.menu_item_id
    JOIN ingredients i ON i.id = r.ingredient_id
    WHERE o.shop_id = _shop_id
      AND o.created_at >= _from AND o.created_at < _to
      AND o.status NOT IN ('voided','cancelled')
    GROUP BY o.business_date
  )
  SELECT rev.d, COALESCE(rev.rev,0), COALESCE(cogs.c,0),
         COALESCE(rev.rev,0) - COALESCE(cogs.c,0), COALESCE(rev.ord,0)
  FROM rev FULL OUTER JOIN cogs ON cogs.d = rev.d
  ORDER BY rev.d;
END;
$$;


--
-- Name: get_shop_entitlements(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_shop_entitlements(_shop_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_shop record;
  v_plan_code text;
  v_effective_plan_id uuid;
  v_months_active numeric;
  v_features jsonb;
  v_themes jsonb;
BEGIN
  SELECT * INTO v_shop FROM public.shops__bootstrap_placeholder WHERE id = _shop_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'shop_not_found');
  END IF;

  -- Resolve effective plan: kalau pro/pro_plus expired → fallback ke basic
  v_plan_code := v_shop.plan;
  IF v_shop.plan_expires_at IS NOT NULL AND v_shop.plan_expires_at < now() THEN
    v_plan_code := 'basic';
  END IF;
  IF v_plan_code IN ('free', 'basic') THEN
    v_plan_code := 'basic';
  END IF;

  SELECT id INTO v_effective_plan_id FROM plans WHERE code = v_plan_code;
  IF v_effective_plan_id IS NULL THEN
    SELECT id INTO v_effective_plan_id FROM plans WHERE code = 'basic';
  END IF;

  v_months_active := GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(v_shop.plan_started_at, v_shop.created_at))) / 2592000.0);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', f.key,
    'name', f.name,
    'description', f.description,
    'category', f.category,
    'requires_min_months', pf.requires_min_months,
    'limit_value', pf.limit_value,
    'allowed', v_months_active >= pf.requires_min_months,
    'reason', CASE WHEN v_months_active >= pf.requires_min_months THEN NULL
                   ELSE 'Tersedia setelah ' || pf.requires_min_months || ' bulan berlangganan' END
  ) ORDER BY f.sort_order), '[]'::jsonb)
  INTO v_features
  FROM plan_features pf
  JOIN features f ON f.key = pf.feature_key
  WHERE pf.plan_id = v_effective_plan_id AND f.is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', t.key,
    'name', t.name,
    'description', t.description,
    'preview_image_url', t.preview_image_url,
    'component_id', t.component_id,
    'requires_min_months', pt.requires_min_months,
    'allowed', v_months_active >= pt.requires_min_months,
    'reason', CASE WHEN v_months_active >= pt.requires_min_months THEN NULL
                   ELSE 'Tersedia setelah ' || pt.requires_min_months || ' bulan berlangganan' END
  ) ORDER BY t.sort_order), '[]'::jsonb)
  INTO v_themes
  FROM plan_themes pt
  JOIN themes t ON t.key = pt.theme_key
  WHERE pt.plan_id = v_effective_plan_id AND t.is_active = true;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'plan_expires_at', v_shop.plan_expires_at,
    'plan_started_at', v_shop.plan_started_at,
    'months_active', round(v_months_active, 2),
    'active_theme_key', v_shop.active_theme_key,
    'features', v_features,
    'themes', v_themes
  );
END;
$$;


--
-- Name: get_shop_marketplace_daily(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_daily(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, revenue numeric, orders bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
    COALESCE(SUM(o.total), 0)::numeric AS revenue,
    COUNT(*)::bigint AS orders
  FROM orders o
  WHERE o.shop_id = _shop_id
    AND o.marketplace_order = true
    AND o.status NOT IN ('cancelled','pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;


--
-- Name: get_shop_marketplace_stats(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_stats(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'gross_sales', COALESCE(SUM(total), 0),
    'commission_paid', COALESCE(SUM(commission_amount), 0),
    'net_revenue', COALESCE(SUM(net_to_shop), 0),
    'orders', COUNT(*),
    'aov', COALESCE(AVG(total), 0),
    'unique_customers', COUNT(DISTINCT customer_user_id),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))
  )
  INTO v_result
  FROM orders
  WHERE shop_id = _shop_id
    AND marketplace_order = true
    AND created_at >= _from
    AND created_at <= _to;

  RETURN v_result;
END;
$$;


--
-- Name: get_shop_marketplace_top_products(uuid, timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_top_products(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10) RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    oi.menu_item_id,
    COALESCE(mi.name, oi.name) AS item_name,
    SUM(oi.quantity)::bigint AS qty,
    SUM(oi.subtotal)::numeric AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.shop_id = _shop_id
    AND o.marketplace_order = true
    AND o.status NOT IN ('cancelled','pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY oi.menu_item_id, mi.name, oi.name
  ORDER BY revenue DESC
  LIMIT _limit;
END;
$$;


--
-- Name: handle_new_customer_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_customer_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'is_customer') = 'true' THEN
    INSERT INTO public.customer_profiles (user_id, display_name, email, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: has_outlet_access(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_outlet_access(_user_id uuid, _outlet_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.outlets o
    JOIN public.shops__bootstrap_placeholder s ON s.id = o.shop_id
    WHERE o.id = _outlet_id
      AND (
        s.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles r
          WHERE r.user_id = _user_id
            AND r.role IN ('cashier','barista','owner')
            AND (r.outlet_id = o.id OR r.shop_id = s.id)
        )
      )
  ) INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: has_shop_role(uuid, public.app_role, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_shop_role(_user_id uuid, _role public.app_role, _shop_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result boolean;
BEGIN
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role and (shop_id = _shop_id or shop_id is null)
  ) INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: increment_promo_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.increment_promo_usage(_promo_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.promos SET usage_count = usage_count + 1 WHERE id = _promo_id;
END;
$$;


--
-- Name: is_courier_of_shop(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_courier_of_shop(_user_id uuid, _shop_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.couriers
    WHERE user_id = _user_id AND shop_id = _shop_id AND is_active = true
  ) INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: is_shop_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid, _user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = _user_id
  ) INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: link_courier_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.link_courier_account() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _email text;
  _updated int;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN RETURN 0; END IF;

  UPDATE public.couriers
     SET user_id = auth.uid()
   WHERE lower(email) = lower(_email)
     AND user_id IS NULL;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;


--
-- Name: list_available_delivery_orders(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.list_available_delivery_orders(_courier_id uuid) RETURNS TABLE(id uuid, order_no text, status public.order_status, total numeric, delivery_fee numeric, delivery_address text, customer_name text, customer_phone text, note text, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT o.id, o.order_no, o.status, o.total, o.delivery_fee,
         o.delivery_address, o.customer_name, o.customer_phone, o.note, o.created_at
  FROM orders o
  JOIN couriers c ON c.id = _courier_id
  WHERE o.shop_id = c.shop_id
    AND o.courier_id IS NULL
    AND o.fulfillment = 'delivery'
    AND o.status IN ('ready', 'preparing')
    AND (
      c.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder s WHERE s.id = c.shop_id AND s.owner_id = auth.uid())
    )
  ORDER BY o.created_at ASC
  LIMIT 50;
END;
$$;


--
-- Name: log_custom_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_custom_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    insert into public.custom_order_status_history(request_id, from_status, to_status, note, changed_by)
    values (new.id, null, new.status, 'Permintaan dibuat', null);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.custom_order_status_history(request_id, from_status, to_status, note, changed_by)
    values (new.id, old.status, new.status, new.owner_note, auth.uid());
  end if;
  return new;
end;
$$;


--
-- Name: log_shift_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_shift_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action text;
  v_shop uuid;
  v_target uuid;
  v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'shift_create';
    v_shop := NEW.shop_id;
    v_target := NEW.user_id;
    v_meta := jsonb_build_object(
      'shift_id', NEW.id,
      'day_of_week', NEW.day_of_week,
      'outlet_id', NEW.outlet_id,
      'after', jsonb_build_object('start_time', NEW.start_time, 'end_time', NEW.end_time, 'note', NEW.note)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'shift_update';
    v_shop := NEW.shop_id;
    v_target := NEW.user_id;
    v_meta := jsonb_build_object(
      'shift_id', NEW.id,
      'day_of_week', NEW.day_of_week,
      'outlet_id', NEW.outlet_id,
      'before', jsonb_build_object('start_time', OLD.start_time, 'end_time', OLD.end_time, 'outlet_id', OLD.outlet_id, 'note', OLD.note),
      'after',  jsonb_build_object('start_time', NEW.start_time, 'end_time', NEW.end_time, 'outlet_id', NEW.outlet_id, 'note', NEW.note)
    );
  ELSE
    v_action := 'shift_delete';
    v_shop := OLD.shop_id;
    v_target := OLD.user_id;
    v_meta := jsonb_build_object(
      'shift_id', OLD.id,
      'day_of_week', OLD.day_of_week,
      'outlet_id', OLD.outlet_id,
      'before', jsonb_build_object('start_time', OLD.start_time, 'end_time', OLD.end_time, 'note', OLD.note)
    );
  END IF;

  INSERT INTO public.staff_audit_logs (shop_id, actor_id, target_user_id, action, meta)
  VALUES (v_shop, auth.uid(), v_target, v_action, v_meta);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_system_event(text, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.log_system_event(_event_type text, _shop_id uuid, _payload jsonb DEFAULT '{}'::jsonb, _notes text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result uuid;
BEGIN
  INSERT INTO public.system_audit (event_type, shop_id, payload, notes)
  VALUES (_event_type, _shop_id, COALESCE(_payload, '{}'::jsonb), _notes)
  RETURNING id INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: mark_all_notifications_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count INT;
BEGIN
  WITH upd AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE recipient_user_id = auth.uid() AND read_at IS NULL
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;


--
-- Name: mark_notification_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = _id AND recipient_user_id = auth.uid() AND read_at IS NULL;
END;
$$;


--
-- Name: marketplace_checkout(text, text, text, text, text, text, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.marketplace_checkout(_recipient_name text, _phone text, _address text, _fulfillment text DEFAULT 'delivery'::text, _payment_method text DEFAULT 'manual_transfer'::text, _notes text DEFAULT NULL::text, _shipping jsonb DEFAULT '{}'::jsonb, _shop_voucher_codes jsonb DEFAULT '{}'::jsonb, _platform_voucher_code text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cart_id UUID;
  _shop RECORD;
  _order_id UUID;
  _outlet_id UUID;
  _order_no TEXT;
  _subtotal NUMERIC;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
  _net_to_shop NUMERIC;
  _global_rate NUMERIC;
  _order_ids UUID[] := ARRAY[]::UUID[];
  _zone_id UUID;
  _delivery_fee NUMERIC;
  _total NUMERIC;
  _shop_voucher_code TEXT;
  _shop_voucher RECORD;
  _shop_discount NUMERIC;
  _platform_voucher RECORD;
  _platform_discount NUMERIC := 0;
  _platform_total_subtotal NUMERIC := 0;
  _used_count_user INTEGER;
  _shop_subtotals jsonb := '{}'::jsonb;
  _membership RECORD;
  _membership_discount NUMERIC;
  _membership_pct NUMERIC;
  _membership_tier_id UUID;
  _pm text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;

  -- Normalize payment method from client (transfer / cod / qris / cash / manual_transfer)
  _pm := lower(coalesce(_payment_method, 'manual_transfer'));
  IF _pm = 'transfer' THEN _pm := 'manual_transfer'; END IF;
  IF _pm NOT IN ('cash','qris','manual_transfer','cod') THEN
    _pm := 'manual_transfer';
  END IF;

  SELECT COALESCE((value)::numeric, 0.05) INTO _global_rate
  FROM platform_settings WHERE key = 'commission_global_rate';
  IF _global_rate IS NULL THEN _global_rate := 0.05; END IF;

  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN RAISE EXCEPTION 'Cart kosong'; END IF;

  IF _platform_voucher_code IS NOT NULL AND _platform_voucher_code <> '' THEN
    SELECT * INTO _platform_voucher FROM platform_vouchers
    WHERE code = _platform_voucher_code AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (expires_at IS NULL OR expires_at >= now());
    IF _platform_voucher.id IS NULL THEN
      RAISE EXCEPTION 'Voucher platform tidak valid';
    END IF;
    IF _platform_voucher.usage_limit IS NOT NULL AND _platform_voucher.usage_count >= _platform_voucher.usage_limit THEN
      RAISE EXCEPTION 'Voucher platform habis';
    END IF;
    SELECT COUNT(*) INTO _used_count_user FROM platform_voucher_redemptions
      WHERE voucher_id = _platform_voucher.id AND user_id = _user_id;
    IF _platform_voucher.per_user_limit IS NOT NULL AND _used_count_user >= _platform_voucher.per_user_limit THEN
      RAISE EXCEPTION 'Voucher platform sudah pernah dipakai';
    END IF;
  END IF;

  FOR _shop IN
    SELECT ci.shop_id
    FROM marketplace_cart_items ci
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END * ci.quantity
    ), 0)
    INTO _subtotal
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;
    _shop_subtotals := _shop_subtotals || jsonb_build_object(_shop.shop_id::text, _subtotal);
    _platform_total_subtotal := _platform_total_subtotal + _subtotal;
  END LOOP;

  FOR _shop IN
    SELECT ci.shop_id, s.commission_rate_override, s.business_category_id
    FROM marketplace_cart_items ci
    JOIN public.shops__bootstrap_placeholder s ON s.id = ci.shop_id
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id, s.commission_rate_override, s.business_category_id
  LOOP
    SELECT id INTO _outlet_id FROM outlets WHERE shop_id = _shop.shop_id AND is_active = true ORDER BY created_at LIMIT 1;
    IF _outlet_id IS NULL THEN
      INSERT INTO outlets (shop_id, name) VALUES (_shop.shop_id, 'Outlet Utama') RETURNING id INTO _outlet_id;
    END IF;

    _subtotal := COALESCE((_shop_subtotals->>(_shop.shop_id::text))::numeric, 0);

    _zone_id := NULL; _delivery_fee := 0;
    IF _fulfillment = 'delivery' THEN
      _zone_id := NULLIF(_shipping->>(_shop.shop_id::text), '')::uuid;
      IF _zone_id IS NOT NULL THEN
        SELECT fee INTO _delivery_fee FROM delivery_zones
        WHERE id = _zone_id AND shop_id = _shop.shop_id AND is_active = true;
        IF _delivery_fee IS NULL THEN _delivery_fee := 0; _zone_id := NULL; END IF;
      END IF;
      IF _zone_id IS NULL THEN
        SELECT COALESCE(base_fee, 0) INTO _delivery_fee FROM delivery_settings WHERE shop_id = _shop.shop_id;
        _delivery_fee := COALESCE(_delivery_fee, 0);
      END IF;
    END IF;

    _shop_voucher_code := _shop_voucher_codes->>(_shop.shop_id::text);
    _shop_discount := 0;
    IF _shop_voucher_code IS NOT NULL AND _shop_voucher_code <> '' THEN
      SELECT * INTO _shop_voucher FROM promos
      WHERE shop_id = _shop.shop_id AND code = _shop_voucher_code AND is_active = true
        AND channel IN ('online','all')
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (min_order IS NULL OR _subtotal >= min_order);
      IF _shop_voucher.id IS NOT NULL THEN
        IF _shop_voucher.type = 'percent' THEN
          _shop_discount := ROUND(_subtotal * _shop_voucher.value / 100, 2);
        ELSE
          _shop_discount := _shop_voucher.value;
        END IF;
        IF _shop_voucher.max_discount IS NOT NULL AND _shop_discount > _shop_voucher.max_discount THEN
          _shop_discount := _shop_voucher.max_discount;
        END IF;
        IF _shop_discount > _subtotal THEN _shop_discount := _subtotal; END IF;
        UPDATE promos SET usage_count = usage_count + 1 WHERE id = _shop_voucher.id;
      ELSE
        _shop_voucher_code := NULL;
      END IF;
    END IF;

    _membership_discount := 0;
    _membership_pct := 0;
    _membership_tier_id := NULL;
    SELECT cm.tier_id, t.discount_percent
      INTO _membership
      FROM customer_memberships cm
      JOIN shop_membership_tiers t ON t.id = cm.tier_id
      WHERE cm.customer_user_id = _user_id
        AND cm.shop_id = _shop.shop_id
        AND cm.status = 'active'
        AND cm.expires_at > now()
      ORDER BY t.discount_percent DESC
      LIMIT 1;
    IF _membership.tier_id IS NOT NULL AND _membership.discount_percent > 0 THEN
      _membership_tier_id := _membership.tier_id;
      _membership_pct := _membership.discount_percent;
      _membership_discount := ROUND((_subtotal - _shop_discount) * _membership_pct / 100, 2);
      IF _membership_discount < 0 THEN _membership_discount := 0; END IF;
    END IF;

    _platform_discount := 0;
    IF _platform_voucher.id IS NOT NULL AND _platform_total_subtotal >= COALESCE(_platform_voucher.min_order, 0) THEN
      DECLARE
        _platform_total_disc NUMERIC;
        _share NUMERIC;
      BEGIN
        IF _platform_voucher.discount_type = 'percent' THEN
          _platform_total_disc := ROUND(_platform_total_subtotal * _platform_voucher.value / 100, 2);
        ELSE
          _platform_total_disc := _platform_voucher.value;
        END IF;
        IF _platform_voucher.max_discount IS NOT NULL AND _platform_total_disc > _platform_voucher.max_discount THEN
          _platform_total_disc := _platform_voucher.max_discount;
        END IF;
        _share := CASE WHEN _platform_total_subtotal > 0
          THEN (_subtotal - _shop_discount - _membership_discount) / NULLIF(_platform_total_subtotal, 0) ELSE 0 END;
        _platform_discount := ROUND(_platform_total_disc * _share, 2);
        IF _platform_discount < 0 THEN _platform_discount := 0; END IF;
      END;
    END IF;

    _commission_rate := _shop.commission_rate_override;
    IF _commission_rate IS NULL AND _shop.business_category_id IS NOT NULL THEN
      SELECT commission_override INTO _commission_rate FROM business_categories WHERE id = _shop.business_category_id;
    END IF;
    IF _commission_rate IS NULL THEN _commission_rate := _global_rate; END IF;

    DECLARE _net_subtotal NUMERIC := _subtotal - _shop_discount - _membership_discount;
    BEGIN
      IF _net_subtotal < 0 THEN _net_subtotal := 0; END IF;
      _commission_amount := ROUND(_net_subtotal * _commission_rate, 2);
      _net_to_shop := _net_subtotal - _commission_amount;
      _total := _net_subtotal - _platform_discount + _delivery_fee;
      IF _total < 0 THEN _total := 0; END IF;
    END;

    _order_no := 'MKT-' || to_char(now(),'YYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6);

    INSERT INTO orders (
      shop_id, outlet_id, order_no, customer_name, customer_phone, customer_user_id,
      delivery_address, fulfillment, channel, status, payment_status, payment_method,
      subtotal, discount, total, delivery_fee, delivery_zone_id,
      commission_rate, commission_amount, net_to_shop,
      escrow_status, marketplace_order, note,
      shop_voucher_code, shop_voucher_discount,
      platform_voucher_code, platform_voucher_discount,
      membership_tier_id, membership_discount, membership_discount_percent
    ) VALUES (
      _shop.shop_id, _outlet_id, _order_no, _recipient_name, _phone, _user_id,
      _address, _fulfillment::fulfillment_type, 'online'::order_channel, 'pending'::order_status,
      'unpaid'::payment_status, _pm::payment_method,
      _subtotal, _shop_discount + _platform_discount + _membership_discount, _total, _delivery_fee, _zone_id,
      ROUND(_commission_rate * 100, 2), _commission_amount, _net_to_shop,
      'held', true, _notes,
      _shop_voucher_code, _shop_discount,
      CASE WHEN _platform_voucher.id IS NOT NULL THEN _platform_voucher.code ELSE NULL END,
      _platform_discount,
      _membership_tier_id, _membership_discount, _membership_pct
    ) RETURNING id INTO _order_id;

    INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, subtotal, note)
    SELECT _order_id, ci.product_id, mi.name,
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END,
      ci.quantity,
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END * ci.quantity,
      ci.notes
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    PERFORM escrow_hold_order(_order_id);
    _order_ids := _order_ids || _order_id;
  END LOOP;

  IF _platform_voucher.id IS NOT NULL THEN
    INSERT INTO platform_voucher_redemptions (voucher_id, user_id, order_ids, amount)
    VALUES (_platform_voucher.id, _user_id, _order_ids,
      (SELECT COALESCE(SUM(platform_voucher_discount),0) FROM orders WHERE id = ANY(_order_ids)));
    UPDATE platform_vouchers SET usage_count = usage_count + 1 WHERE id = _platform_voucher.id;
  END IF;

  DELETE FROM marketplace_cart_items WHERE cart_id = _cart_id;
  RETURN jsonb_build_object('order_ids', to_jsonb(_order_ids));
END;
$$;


--
-- Name: next_order_no(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.next_order_no(_outlet_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  bd date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  n int;
BEGIN
  SELECT COUNT(*) + 1 INTO n
  FROM public.orders
  WHERE outlet_id = _outlet_id AND business_date = bd;
  RETURN LPAD(n::text, 3, '0');
END;
$$;


--
-- Name: notify_dispute_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_dispute_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      DECLARE
        v_order orders%ROWTYPE;
        v_owner UUID;
      BEGIN
        SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
        IF NOT FOUND THEN RETURN NEW; END IF;
        SELECT owner_id INTO v_owner FROM public.shops__bootstrap_placeholder WHERE id = v_order.shop_id;

        IF TG_OP = 'INSERT' THEN
          PERFORM public.create_notification(
            v_owner, 'dispute_opened', 'Sengketa baru pada ' || v_order.order_no,
            'Customer melaporkan masalah, silakan tinjau.',
            '/pos-app/marketplace-orders', 'warning', v_order.shop_id,
            'dispute_open:' || NEW.id::text
          );
        ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
          IF NEW.status IN ('resolved','rejected') THEN
            PERFORM public.create_notification(
              v_order.customer_user_id, 'dispute_resolved',
              'Sengketa pesanan ' || v_order.order_no || ' diperbarui',
              'Status sengketa: ' || NEW.status,
              '/akun/pesanan/' || v_order.id::text,
              CASE WHEN NEW.status='resolved' THEN 'success' ELSE 'warning' END,
              v_order.shop_id,
              'dispute_resolved:' || NEW.id::text || ':' || NEW.status
            );
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;


--
-- Name: notify_low_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_low_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_today text := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
BEGIN
  IF NEW.is_active = false THEN RETURN NEW; END IF;
  IF NEW.min_stock IS NULL OR NEW.min_stock <= 0 THEN RETURN NEW; END IF;
  IF NEW.current_stock <= NEW.min_stock
     AND (TG_OP = 'INSERT' OR OLD.current_stock > OLD.min_stock OR OLD.current_stock > NEW.current_stock) THEN
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (
      NEW.shop_id,
      'low_stock',
      'Stok bahan menipis',
      NEW.name || ' tinggal ' || NEW.current_stock || ' ' || NEW.unit || ' (min ' || NEW.min_stock || ')',
      '/app/inventory',
      'warning',
      'low_stock:' || NEW.id::text || ':' || v_today
    )
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_membership_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_membership_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _shop_name TEXT;
  _owner_id UUID;
  _tier_name TEXT;
BEGIN
  SELECT name, owner_user_id INTO _shop_name, _owner_id
  FROM public.shops__bootstrap_placeholder WHERE id = NEW.shop_id;
  SELECT name INTO _tier_name FROM shop_membership_tiers WHERE id = NEW.tier_id;

  IF TG_OP = 'INSERT' THEN
    -- Notify customer (welcome)
    PERFORM create_notification(
      NEW.customer_user_id,
      'membership_active',
      format('Membership %s aktif!', COALESCE(_tier_name, 'baru')),
      format('Diskon otomatis berlaku di %s sampai %s.',
        COALESCE(_shop_name, 'toko'),
        to_char(NEW.expires_at, 'DD Mon YYYY')),
      '/akun/saldo',
      'success'
    );
    -- Notify owner
    IF _owner_id IS NOT NULL THEN
      PERFORM create_notification(
        _owner_id,
        'membership_purchased',
        'Member baru bergabung',
        format('Pelanggan baru aktif di tier %s.', COALESCE(_tier_name, '-')),
        '/pos-app/membership',
        'info'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_marketplace_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_new_marketplace_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_owner UUID;
BEGIN
  IF NEW.marketplace_order = true THEN
    SELECT owner_id INTO v_owner FROM public.shops__bootstrap_placeholder WHERE id = NEW.shop_id;
    PERFORM public.create_notification(
      v_owner,
      'order_new',
      'Pesanan baru: ' || NEW.order_no,
      'Total Rp ' || to_char(NEW.total, 'FM999G999G999'),
      '/pos-app/marketplace-orders',
      'info',
      NEW.shop_id,
      'order_new:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_label TEXT;
  v_sev TEXT := 'info';
BEGIN
  IF NEW.customer_user_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  v_label := CASE NEW.status::text
    WHEN 'preparing' THEN 'Pesanan sedang disiapkan'
    WHEN 'ready' THEN 'Pesanan siap'
    WHEN 'delivered' THEN 'Pesanan dikirim'
    WHEN 'completed' THEN 'Pesanan selesai'
    WHEN 'cancelled' THEN 'Pesanan dibatalkan'
    WHEN 'voided' THEN 'Pesanan dibatalkan'
    ELSE 'Status pesanan diperbarui'
  END;

  IF NEW.status::text IN ('cancelled','voided') THEN v_sev := 'warning'; END IF;

  PERFORM public.create_notification(
    NEW.customer_user_id,
    'order_status',
    v_label,
    'Pesanan ' || NEW.order_no,
    '/akun/pesanan/' || NEW.id::text,
    v_sev,
    NEW.shop_id,
    'order_status:' || NEW.id::text || ':' || NEW.status::text
  );
  RETURN NEW;
END;
$$;


--
-- Name: notify_wallet_topup_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_wallet_topup_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _shop_name TEXT;
  _owner_id UUID;
  _customer_name TEXT;
BEGIN
  SELECT name, owner_user_id INTO _shop_name, _owner_id
  FROM public.shops__bootstrap_placeholder WHERE id = NEW.shop_id;

  IF TG_OP = 'INSERT' AND _owner_id IS NOT NULL THEN
    -- Notify owner of new pending topup
    PERFORM create_notification(
      _owner_id,
      'wallet_topup_request',
      'Permintaan top-up saldo baru',
      format('Top-up Rp %s menunggu persetujuan.', to_char(NEW.amount, 'FM999G999G999')),
      '/pos-app/wallet-approvals',
      'info'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> OLD.status THEN
    -- Notify customer
    IF NEW.status = 'paid' THEN
      PERFORM create_notification(
        NEW.customer_user_id,
        'wallet_topup_approved',
        format('Top-up disetujui — %s', COALESCE(_shop_name, 'Toko')),
        format('Saldo Rp %s telah ditambahkan%s.',
          to_char(NEW.amount + COALESCE(NEW.bonus_amount,0), 'FM999G999G999'),
          CASE WHEN COALESCE(NEW.bonus_amount,0) > 0
               THEN format(' (termasuk bonus Rp %s)', to_char(NEW.bonus_amount, 'FM999G999G999'))
               ELSE '' END),
        '/akun/saldo',
        'success'
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM create_notification(
        NEW.customer_user_id,
        'wallet_topup_rejected',
        format('Top-up ditolak — %s', COALESCE(_shop_name, 'Toko')),
        COALESCE(NEW.notes, 'Hubungi toko untuk informasi lebih lanjut.'),
        '/akun/saldo',
        'warning'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_withdrawal_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_withdrawal_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      DECLARE v_owner UUID;
      BEGIN
        IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
        SELECT owner_id INTO v_owner FROM public.shops__bootstrap_placeholder WHERE id = NEW.shop_id;
        IF NEW.status IN ('approved','paid') THEN
          PERFORM public.create_notification(
            v_owner, 'withdrawal_'||NEW.status,
            CASE NEW.status WHEN 'approved' THEN 'Penarikan dana disetujui' ELSE 'Penarikan dana sudah dibayar' END,
            'Jumlah Rp '||to_char(NEW.amount,'FM999G999G999'),
            '/pos-app/wallet','success',NEW.shop_id,
            'withdrawal_'||NEW.status||':'||NEW.id::text
          );
        ELSIF NEW.status = 'rejected' THEN
          PERFORM public.create_notification(
            v_owner,'withdrawal_rejected','Penarikan dana ditolak',
            COALESCE(NEW.reject_reason,'Hubungi admin untuk detail.'),
            '/pos-app/wallet','warning',NEW.shop_id,
            'withdrawal_rejected:'||NEW.id::text
          );
        END IF;
        RETURN NEW;
      END;
      $$;


--
-- Name: open_dispute(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.open_dispute(_order_id uuid, _reason text, _description text DEFAULT NULL::text, _photos jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order tidak ditemukan';
  END IF;
  IF v_order.customer_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bukan pesanan Anda';
  END IF;
  IF v_order.status NOT IN ('completed','delivering','ready') THEN
    RAISE EXCEPTION 'Sengketa hanya dapat dibuka untuk pesanan yang sudah dikirim/selesai';
  END IF;
  IF EXISTS (SELECT 1 FROM order_disputes WHERE order_id = _order_id AND status IN ('open','under_review')) THEN
    RAISE EXCEPTION 'Sengketa untuk pesanan ini sudah ada';
  END IF;
  INSERT INTO order_disputes(order_id, shop_id, opened_by, reason, description, photos)
  VALUES (_order_id, v_order.shop_id, auth.uid(), _reason, _description, COALESCE(_photos, '[]'::jsonb))
  RETURNING id INTO v_id;
  -- Hold escrow if currently released? Mark escrow as held.
  UPDATE orders SET escrow_status = 'disputed', updated_at = now()
  WHERE id = _order_id AND escrow_status IN ('held','released');
  RETURN v_id;
END;
$$;


--
-- Name: open_shift(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.open_shift(_outlet_id uuid, _opening_cash numeric) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_shop uuid;
  v_existing uuid;
  v_shift_id uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_outlet_access(v_caller, _outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT shop_id INTO v_shop FROM public.outlets WHERE id = _outlet_id;
  IF v_shop IS NULL THEN RAISE EXCEPTION 'outlet_not_found'; END IF;

  SELECT id INTO v_existing FROM public.cash_shifts
   WHERE outlet_id = _outlet_id AND status = 'open' LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.cash_shifts (shop_id, outlet_id, opened_by, opening_cash)
  VALUES (v_shop, _outlet_id, v_caller, COALESCE(_opening_cash, 0))
  RETURNING id INTO v_shift_id;

  INSERT INTO public.cash_movements (shift_id, type, amount, note, created_by)
  VALUES (v_shift_id, 'opening', COALESCE(_opening_cash, 0), 'Modal awal', v_caller);

  RETURN v_shift_id;
END;
$$;


--
-- Name: process_booking_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_booking_reminders() RETURNS TABLE(h1_count integer, h1h_count integer, review_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_h1 INT := 0; v_h1h INT := 0; v_review INT := 0; v_booking RECORD;
BEGIN
  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN public.shops__bootstrap_placeholder cs ON cs.id=b.shop_id
    WHERE b.status IN ('pending','confirmed') AND b.reminded_h1_at IS NULL AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '23 hours') AND (now() + interval '25 hours')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1', 'Pengingat: booking besok',
      format('Booking %s di %s besok jam %s.', v_booking.service_name, v_booking.shop_name, to_char(v_booking.slot_time, 'HH24:MI')),
      '/akun/bookings', 'info', 'booking_h1_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1_at = now() WHERE id = v_booking.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN public.shops__bootstrap_placeholder cs ON cs.id=b.shop_id
    WHERE b.status IN ('pending','confirmed') AND b.reminded_h1h_at IS NULL AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '50 minutes') AND (now() + interval '70 minutes')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1h', 'Booking 1 jam lagi',
      format('%s di %s mulai 1 jam lagi.', v_booking.service_name, v_booking.shop_name),
      '/akun/bookings', 'warning', 'booking_h1h_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1h_at = now() WHERE id = v_booking.id;
    v_h1h := v_h1h + 1;
  END LOOP;

  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.customer_phone, b.shop_id, s.service_name, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN public.shops__bootstrap_placeholder cs ON cs.id=b.shop_id
    LEFT JOIN booking_reviews r ON r.booking_id = b.id
    WHERE b.status IN ('confirmed','completed') AND b.feedback_requested_at IS NULL AND r.id IS NULL
      AND (s.slot_date + s.slot_time + (s.duration_minutes || ' minutes')::interval) < (now() - interval '2 hours')
      AND (s.slot_date + s.slot_time) > (now() - interval '7 days')
  LOOP
    INSERT INTO booking_review_requests (booking_id, customer_phone, customer_user_id)
    VALUES (v_booking.id, v_booking.customer_phone, v_booking.customer_user_id)
    ON CONFLICT (booking_id) DO NOTHING;
    IF v_booking.customer_user_id IS NOT NULL THEN
      INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
      VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_review_request',
        'Bagaimana pengalamanmu di ' || v_booking.shop_name || '?',
        'Bagikan rating untuk booking ' || v_booking.service_name || '.',
        '/akun/bookings', 'info', 'booking_review_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    END IF;
    UPDATE bookings SET feedback_requested_at = now() WHERE id = v_booking.id;
    v_review := v_review + 1;
  END LOOP;

  RETURN QUERY SELECT v_h1, v_h1h, v_review;
END;
$$;


--
-- Name: process_subscription_renewals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.process_subscription_renewals() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: receive_purchase_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.receive_purchase_order(_po_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_po purchase_orders%ROWTYPE;
  rec RECORD;
  v_old_stock numeric;
  v_old_cost numeric;
  v_new_cost numeric;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_po FROM purchase_orders WHERE id = _po_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'po_not_found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder s WHERE s.id = v_po.shop_id AND s.owner_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_po.status = 'received' THEN RAISE EXCEPTION 'already_received'; END IF;

  FOR rec IN
    SELECT ingredient_id, quantity, unit_cost FROM purchase_order_items WHERE po_id = _po_id
  LOOP
    -- Insert stock movement (purchase) — trigger will increment ingredient stock
    INSERT INTO stock_movements (shop_id, ingredient_id, type, quantity, unit_cost, note, created_by)
    VALUES (v_po.shop_id, rec.ingredient_id, 'purchase', rec.quantity, rec.unit_cost,
            'PO ' || v_po.po_no, v_caller);

    -- Weighted moving average cost update
    SELECT current_stock, cost_per_unit INTO v_old_stock, v_old_cost
      FROM ingredients WHERE id = rec.ingredient_id;
    -- v_old_stock here is post-increment (trigger already applied)
    IF v_old_stock > 0 THEN
      v_new_cost := ROUND(((COALESCE(v_old_cost,0) * (v_old_stock - rec.quantity)) + (rec.unit_cost * rec.quantity)) / v_old_stock, 4);
      UPDATE ingredients SET cost_per_unit = GREATEST(v_new_cost, 0), updated_at = now()
        WHERE id = rec.ingredient_id;
    END IF;

    UPDATE purchase_order_items SET received_qty = rec.quantity WHERE po_id = _po_id AND ingredient_id = rec.ingredient_id;
  END LOOP;

  UPDATE purchase_orders
    SET status = 'received', received_date = (now() AT TIME ZONE 'Asia/Jakarta')::date, updated_at = now()
    WHERE id = _po_id;
END;
$$;


--
-- Name: refresh_product_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.refresh_product_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_product UUID := COALESCE(NEW.product_id, OLD.product_id);
  v_shop UUID := COALESCE(NEW.shop_id, OLD.shop_id);
BEGIN
  UPDATE public.menu_items SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM product_reviews WHERE product_id = v_product AND NOT is_hidden), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE product_id = v_product AND NOT is_hidden), 0)
  WHERE id = v_product;

  UPDATE public.shops__bootstrap_placeholder SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM product_reviews WHERE shop_id = v_shop AND NOT is_hidden), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE shop_id = v_shop AND NOT is_hidden), 0)
  WHERE id = v_shop;
  RETURN COALESCE(NEW, OLD);
END; $$;


--
-- Name: refund_order(uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.refund_order(_order_id uuid, _amount numeric, _reason text DEFAULT NULL::text, _method text DEFAULT 'cash'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_refund_id uuid;
  v_open_shift uuid;
  v_already_refunded numeric;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF NOT public.has_outlet_access(v_caller, v_order.outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_already_refunded
    FROM public.refunds WHERE order_id = _order_id;
  IF v_already_refunded + _amount > v_order.total THEN
    RAISE EXCEPTION 'amount_exceeds_total';
  END IF;

  INSERT INTO public.refunds (order_id, shop_id, outlet_id, amount, reason, refund_method, created_by)
  VALUES (_order_id, v_order.shop_id, v_order.outlet_id, _amount, _reason, COALESCE(_method,'cash'), v_caller)
  RETURNING id INTO v_refund_id;

  -- If cash refund and there's an open shift, log cash movement
  IF COALESCE(_method,'cash') = 'cash' THEN
    SELECT id INTO v_open_shift FROM public.cash_shifts
      WHERE outlet_id = v_order.outlet_id AND status = 'open' LIMIT 1;
    IF v_open_shift IS NOT NULL THEN
      INSERT INTO public.cash_movements (shift_id, type, amount, note, order_id, created_by)
      VALUES (v_open_shift, 'refund', _amount, COALESCE('Refund: ' || _reason, 'Refund'), _order_id, v_caller);
    END IF;
  END IF;

  -- Update order payment_status
  IF v_already_refunded + _amount >= v_order.total THEN
    UPDATE public.orders SET payment_status = 'refunded',
      note = COALESCE(note || ' | ', '') || 'REFUND ' || _amount || ': ' || COALESCE(_reason,''),
      updated_at = now()
    WHERE id = _order_id;
  ELSE
    UPDATE public.orders SET
      note = COALESCE(note || ' | ', '') || 'PARTIAL REFUND ' || _amount || ': ' || COALESCE(_reason,''),
      updated_at = now()
    WHERE id = _order_id;
  END IF;

  RETURN v_refund_id;
END;
$$;


--
-- Name: reject_plan_invoice(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reject_plan_invoice(_invoice_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE plan_invoices
    SET status = 'rejected', notes = COALESCE(_reason, notes),
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = _invoice_id;
END;
$$;


--
-- Name: reject_wallet_topup(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reject_wallet_topup(_topup_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _topup RECORD;
  _is_owner BOOLEAN;
BEGIN
  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up tidak ditemukan'; END IF;
  IF _topup.status <> 'pending' THEN RAISE EXCEPTION 'Top-up sudah diproses'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _topup.shop_id AND owner_id = auth.uid()) INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;
  UPDATE public.wallet_topups SET status = 'cancelled', note = COALESCE(_reason, note) WHERE id = _topup.id;
END;
$$;


--
-- Name: reject_withdrawal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE withdrawal_requests SET status='rejected', reject_reason=_reason,
    reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
    WHERE id=_id;

  -- Return funds: pending → available
  UPDATE shop_wallets SET
    pending_balance = pending_balance - w.amount,
    available_balance = available_balance + w.amount,
    updated_at = now()
  WHERE shop_id = w.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (w.shop_id, 'withdrawal_refund', w.amount, _id, 'WD-'||substring(_id::text,1,8),
          'Penarikan ditolak: '||_reason, auth.uid());
END; $$;


--
-- Name: reload_postgrest_schema(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.reload_postgrest_schema() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;


--
-- Name: request_withdrawal(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.request_withdrawal(_shop_id uuid, _amount numeric, _bank_name text, _bank_account_no text, _bank_account_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_wallet shop_wallets%ROWTYPE;
  v_min NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_id UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT COALESCE((value->>'amount')::numeric, 50000) INTO v_min FROM platform_settings WHERE key='withdrawal_min';
  SELECT COALESCE((value->>'amount')::numeric, 5000) INTO v_fee FROM platform_settings WHERE key='withdrawal_fee';

  IF _amount < v_min THEN RAISE EXCEPTION 'below_minimum: %', v_min; END IF;

  PERFORM public.ensure_shop_wallet(_shop_id);
  SELECT * INTO v_wallet FROM shop_wallets WHERE shop_id = _shop_id FOR UPDATE;
  IF v_wallet.available_balance < _amount THEN
    RAISE EXCEPTION 'insufficient_balance: available %', v_wallet.available_balance;
  END IF;

  v_net := _amount - v_fee;

  INSERT INTO withdrawal_requests (shop_id, amount, admin_fee, net_amount, bank_name, bank_account_no, bank_account_name, requested_by)
  VALUES (_shop_id, _amount, v_fee, v_net, _bank_name, _bank_account_no, _bank_account_name, v_caller)
  RETURNING id INTO v_id;

  UPDATE shop_wallets SET
    available_balance = available_balance - _amount,
    pending_balance = pending_balance + _amount,
    updated_at = now()
  WHERE shop_id = _shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (_shop_id, 'withdrawal_hold', -_amount, v_id, 'WD-'||substring(v_id::text,1,8), 'Tahan untuk request penarikan', v_caller);

  RETURN v_id;
END; $$;


--
-- Name: resolve_dispute(uuid, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.resolve_dispute(_dispute_id uuid, _status text, _resolution text DEFAULT NULL::text, _refund_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_d order_disputes%ROWTYPE;
  v_is_owner boolean;
  v_is_admin boolean;
BEGIN
  SELECT * INTO v_d FROM order_disputes WHERE id = _dispute_id;
  IF v_d.id IS NULL THEN RAISE EXCEPTION 'Sengketa tidak ditemukan'; END IF;
  v_is_admin := has_role(auth.uid(), 'super_admin'::app_role);
  SELECT EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = v_d.shop_id AND owner_id = auth.uid())
    INTO v_is_owner;
  IF NOT (v_is_owner OR v_is_admin) THEN
    RAISE EXCEPTION 'Tidak berwenang';
  END IF;
  IF _status NOT IN ('resolved','rejected','under_review') THEN
    RAISE EXCEPTION 'Status tidak valid';
  END IF;

  UPDATE order_disputes
  SET status = _status,
      resolution = _resolution,
      refund_amount = _refund_amount,
      resolved_by = CASE WHEN _status IN ('resolved','rejected') THEN auth.uid() ELSE resolved_by END,
      resolved_at = CASE WHEN _status IN ('resolved','rejected') THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = _dispute_id;

  -- If resolved with refund, trigger escrow refund (partial supported via amount)
  IF _status = 'resolved' AND COALESCE(_refund_amount, 0) > 0 THEN
    PERFORM escrow_refund_order(v_d.order_id);
  ELSIF _status = 'rejected' THEN
    -- Restore escrow status held -> released eligible
    UPDATE orders SET escrow_status = 'held', updated_at = now()
    WHERE id = v_d.order_id AND escrow_status = 'disputed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;


--
-- Name: run_expiry_reminders_v2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.run_expiry_reminders_v2() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  shop_row RECORD;
  rule_row RECORD;
  total_sent integer := 0;
  total_skipped integer := 0;
  use_override boolean;
  audience_now text;
  days_diff integer;
BEGIN
  FOR shop_row IN
    SELECT cs.id, cs.name, cs.owner_id, cs.plan_expires_at, cs.trial_ends_at,
           COALESCE(p.code,'free') AS plan_code, COALESCE(p.name,'Free') AS plan_name,
           COALESCE(s.override_rules, FALSE) AS override_rules
    FROM public.shops__bootstrap_placeholder cs
    LEFT JOIN public.plans p ON p.id = cs.plan_id
    LEFT JOIN public.expiry_reminder_shop_settings s ON s.shop_id = cs.id
    WHERE cs.plan_expires_at IS NOT NULL OR cs.trial_ends_at IS NOT NULL
  LOOP
    use_override := shop_row.override_rules;

    -- Determine audience per shop
    IF shop_row.trial_ends_at IS NOT NULL AND shop_row.trial_ends_at >= now() THEN
      audience_now := 'trial';
      days_diff := DATE(shop_row.trial_ends_at) - CURRENT_DATE;
    ELSIF shop_row.plan_expires_at IS NOT NULL THEN
      audience_now := 'paid';
      days_diff := DATE(shop_row.plan_expires_at) - CURRENT_DATE;
    ELSE
      CONTINUE;
    END IF;

    IF days_diff < 0 OR days_diff > 90 THEN CONTINUE; END IF;

    FOR rule_row IN
      SELECT * FROM (
        SELECT id, audience, days_before, channels, template_subject, template_body, is_active, sort_order
        FROM public.expiry_reminder_shop_rules
        WHERE shop_id = shop_row.id AND is_active = true AND use_override = true
        UNION ALL
        SELECT id, audience, days_before, channels, template_subject, template_body, is_active, sort_order
        FROM public.expiry_reminder_rules
        WHERE is_active = true AND NOT use_override
      ) r
      WHERE r.audience = audience_now AND r.days_before = days_diff
    LOOP
      BEGIN
        INSERT INTO public.notifications (shop_id, recipient_user_id, title, body, severity, category)
        VALUES (
          shop_row.id,
          shop_row.owner_id,
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_subject,'Paket akan habis'),
            '{{shop_name}}', shop_row.name),
            '{{plan_name}}', shop_row.plan_name),
            '{{days_left}}', rule_row.days_before::text),
            '{{expires_at}}', COALESCE(shop_row.plan_expires_at::text, shop_row.trial_ends_at::text)),
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_body,'Paket {{plan_name}} berakhir {{days_left}} hari lagi'),
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


--
-- Name: run_scheduled_publishes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.run_scheduled_publishes() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, shop_id, puck_data, title, is_published
    FROM public.page_layouts
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
      AND is_published = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.page_layout_versions
      (layout_id, shop_id, puck_data, title, is_published_snapshot, reason)
    VALUES (rec.id, rec.shop_id, rec.puck_data, rec.title, true, 'scheduled-publish');

    UPDATE public.page_layouts
      SET is_published = true,
          published_at = now(),
          scheduled_publish_at = NULL
      WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('published', v_count, 'ran_at', now());
END $$;


--
-- Name: send_booking_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.send_booking_reminders() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_h1 int := 0;
  v_h3 int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT b.id, b.customer_user_id, b.customer_name, b.shop_id,
           s.service_name, s.slot_date, s.slot_time,
           c.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN public.shops__bootstrap_placeholder c ON c.id = b.shop_id
    WHERE b.status = 'confirmed'
      AND b.reminded_h1_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND s.slot_date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1
  LOOP
    PERFORM create_notification(
      rec.customer_user_id, 'booking_reminder',
      'Pengingat: booking besok di ' || rec.shop_name,
      rec.service_name || ' - ' || to_char(rec.slot_date, 'DD Mon YYYY') || ' jam ' || to_char(rec.slot_time, 'HH24:MI'),
      '/akun/bookings', 'info', rec.shop_id,
      'booking_reminder_h1:' || rec.id::text
    );
    UPDATE bookings SET reminded_h1_at = now() WHERE id = rec.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  FOR rec IN
    SELECT b.id, b.customer_user_id, b.customer_name, b.shop_id,
           s.service_name, s.slot_date, s.slot_time,
           c.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN public.shops__bootstrap_placeholder c ON c.id = b.shop_id
    WHERE b.status = 'confirmed'
      AND b.reminded_h3_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND s.slot_date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 3
  LOOP
    PERFORM create_notification(
      rec.customer_user_id, 'booking_reminder',
      '3 hari lagi booking di ' || rec.shop_name,
      rec.service_name || ' - ' || to_char(rec.slot_date, 'DD Mon YYYY') || ' jam ' || to_char(rec.slot_time, 'HH24:MI'),
      '/akun/bookings', 'info', rec.shop_id,
      'booking_reminder_h3:' || rec.id::text
    );
    UPDATE bookings SET reminded_h3_at = now() WHERE id = rec.id;
    v_h3 := v_h3 + 1;
  END LOOP;

  RETURN jsonb_build_object('h1_sent', v_h1, 'h3_sent', v_h3, 'run_at', now());
END $$;


--
-- Name: send_membership_expiry_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.send_membership_expiry_reminders() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _row RECORD;
  _count INTEGER := 0;
  _shop_name TEXT;
  _days INTEGER;
BEGIN
  FOR _row IN
    SELECT cm.id, cm.customer_user_id, cm.shop_id, cm.expires_at,
           t.name AS tier_name
    FROM customer_memberships cm
    JOIN shop_membership_tiers t ON t.id = cm.tier_id
    WHERE cm.status = 'active'
      AND cm.expires_at BETWEEN now() AND now() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.recipient_user_id = cm.customer_user_id
          AND n.type = 'membership_expiring'
          AND n.created_at > now() - INTERVAL '3 days'
          AND (n.body LIKE '%' || cm.id::text || '%' OR n.link LIKE '%' || cm.shop_id::text || '%')
      )
  LOOP
    SELECT name INTO _shop_name FROM public.shops__bootstrap_placeholder WHERE id = _row.shop_id;
    _days := GREATEST(0, EXTRACT(DAY FROM (_row.expires_at - now()))::INTEGER);
    PERFORM create_notification(
      _row.customer_user_id,
      'membership_expiring',
      format('Membership akan kedaluwarsa dalam %s hari', _days),
      format('Membership %s di %s berakhir %s. Perpanjang sekarang agar tetap dapat diskon.',
        _row.tier_name, COALESCE(_shop_name, 'toko'),
        to_char(_row.expires_at, 'DD Mon YYYY')),
      '/akun/saldo',
      'warning'
    );
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;


--
-- Name: send_order_message(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.send_order_message(_order_id uuid, _body text, _attachment_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_role text;
  v_id uuid;
BEGIN
  IF length(trim(_body)) = 0 THEN RAISE EXCEPTION 'Pesan kosong'; END IF;
  IF length(_body) > 2000 THEN RAISE EXCEPTION 'Pesan terlalu panjang'; END IF;
  SELECT * INTO v_order FROM orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.customer_user_id = auth.uid() THEN
    v_role := 'customer';
  ELSIF EXISTS (SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = v_order.shop_id AND owner_id = auth.uid()) THEN
    v_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Bukan peserta percakapan';
  END IF;
  INSERT INTO order_messages(order_id, shop_id, sender_id, sender_role, body, attachment_url)
  VALUES (_order_id, v_order.shop_id, auth.uid(), v_role, _body, _attachment_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: set_booking_type_from_slot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_booking_type_from_slot() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.slot_id IS NOT NULL THEN
    SELECT booking_type INTO NEW.booking_type
    FROM public.booking_slots
    WHERE id = NEW.slot_id;
    IF NEW.booking_type IS NULL THEN
      NEW.booking_type := 'service';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_custom_domain_verified(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_custom_domain_verified(_shop_id uuid, _verified boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.shops__bootstrap_placeholder
    SET custom_domain_verified_at = CASE WHEN _verified THEN now() ELSE NULL END,
        updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO domain_audit (shop_id, action, actor_id, notes)
  VALUES (_shop_id, CASE WHEN _verified THEN 'verify' ELSE 'unverify' END, auth.uid(), 'super admin');
END;
$$;


--
-- Name: set_order_no(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_order_no() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_date text;
  v_seq int;
BEGIN
  IF NEW.order_no IS NOT NULL AND NEW.order_no <> '' THEN
    RETURN NEW;
  END IF;

  v_date := to_char(COALESCE(NEW.business_date, (now() AT TIME ZONE 'Asia/Jakarta')::date), 'YYYYMMDD');

  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no, '^.*-', ''), '')::int), 0) + 1
    INTO v_seq
  FROM public.orders
  WHERE outlet_id = NEW.outlet_id
    AND business_date = COALESCE(NEW.business_date, (now() AT TIME ZONE 'Asia/Jakarta')::date)
    AND order_no ~ ('^' || v_date || '-[0-9]+$');

  NEW.order_no := v_date || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$_$;


--
-- Name: set_shop_theme(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_shop_theme(_shop_id uuid, _theme_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_ent jsonb;
  v_allowed boolean := false;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT owner_id INTO v_owner FROM public.shops__bootstrap_placeholder WHERE id = _shop_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'shop_not_found'; END IF;
  IF v_owner <> v_caller AND NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_ent := public.get_shop_entitlements(_shop_id);

  SELECT bool_or((t->>'allowed')::boolean) INTO v_allowed
  FROM jsonb_array_elements(v_ent->'themes') t
  WHERE t->>'key' = _theme_key;

  IF NOT COALESCE(v_allowed, false) THEN
    RAISE EXCEPTION 'theme_not_entitled';
  END IF;

  UPDATE public.shops__bootstrap_placeholder SET active_theme_key = _theme_key, updated_at = now() WHERE id = _shop_id;
END;
$$;


--
-- Name: shop_chat_set_last_message_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.shop_chat_set_last_message_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.shop_chats SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;


--
-- Name: test_qr_table_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.test_qr_table_lock() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_shop uuid;
  v_outlet uuid;
  v_order uuid;
  v_after text;
  v_blocked boolean := false;
BEGIN
  SELECT s.id, o.id INTO v_shop, v_outlet
  FROM public.shops__bootstrap_placeholder s JOIN public.outlets o ON o.shop_id = s.id LIMIT 1;
  IF v_shop IS NULL THEN RETURN 'skipped — no shop/outlet'; END IF;

  INSERT INTO public.orders (shop_id, outlet_id, channel, fulfillment, order_source, table_label, payment_method, status)
  VALUES (v_shop, v_outlet, 'online', 'dine_in', 'qr_table', 'TEST-LOCK', 'cash', 'pending')
  RETURNING id INTO v_order;

  BEGIN
    UPDATE public.orders SET table_label = 'CHANGED' WHERE id = v_order;
  EXCEPTION WHEN check_violation THEN v_blocked := true;
  END;

  IF NOT v_blocked THEN
    DELETE FROM public.orders WHERE id = v_order;
    RAISE EXCEPTION 'FAILED — edit not blocked';
  END IF;

  UPDATE public.orders SET order_source = 'pos' WHERE id = v_order;
  UPDATE public.orders SET table_label = 'NEW' WHERE id = v_order;
  SELECT table_label INTO v_after FROM public.orders WHERE id = v_order;
  DELETE FROM public.orders WHERE id = v_order;

  IF v_after <> 'NEW' THEN RAISE EXCEPTION 'FAILED — post-unlock edit lost'; END IF;
  RETURN 'PASSED';
END;
$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: update_shop_chat_last_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_shop_chat_last_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.shop_chats
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: upsell_fill_shop_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.upsell_fill_shop_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    SELECT shop_id INTO NEW.shop_id FROM public.menu_items WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: upsert_shop_customer_on_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.upsert_shop_customer_on_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.customer_user_id IS NOT NULL AND NEW.status::text IN ('completed', 'delivered') THEN
    INSERT INTO public.shop_customers (shop_id, user_id, display_name, phone, total_orders, total_spent, last_order_at, first_order_at)
    VALUES (
      NEW.shop_id,
      NEW.customer_user_id,
      COALESCE(NEW.customer_name, ''),
      NEW.customer_phone,
      1,
      NEW.total,
      NEW.created_at,
      NEW.created_at
    )
    ON CONFLICT (shop_id, user_id) DO UPDATE SET
      display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), shop_customers.display_name),
      phone = COALESCE(EXCLUDED.phone, shop_customers.phone),
      total_orders = shop_customers.total_orders + 1,
      total_spent = shop_customers.total_spent + EXCLUDED.total_spent,
      last_order_at = GREATEST(shop_customers.last_order_at, EXCLUDED.last_order_at),
      first_order_at = LEAST(shop_customers.first_order_at, EXCLUDED.first_order_at),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: user_belongs_to_shop(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.user_belongs_to_shop(_user_id uuid, _shop_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.shops__bootstrap_placeholder WHERE id = _shop_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.staff_permissions WHERE shop_id = _shop_id AND user_id = _user_id
  ) INTO _result;
  RETURN _result;
END;
$$;


--
-- Name: validate_business_category_flow_types(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_business_category_flow_types() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v text;
BEGIN
  IF NEW.flow_types IS NULL THEN
    NEW.flow_types := '{}'::text[];
  END IF;
  FOREACH v IN ARRAY NEW.flow_types LOOP
    IF v NOT IN ('T1','T2','T3','T4','T5') THEN
      RAISE EXCEPTION 'Invalid flow_type "%": must be one of T1,T2,T3,T4,T5', v;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;


--
-- Name: validate_plan_feature_min_months(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_plan_feature_min_months() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.requires_min_months IS NOT NULL THEN
    IF NEW.requires_min_months < 0 OR NEW.requires_min_months > 120 THEN
      RAISE EXCEPTION 'requires_min_months must be between 0 and 120, got %', NEW.requires_min_months;
    END IF;
    IF NEW.requires_min_months != TRUNC(NEW.requires_min_months) THEN
      RAISE EXCEPTION 'requires_min_months must be an integer, got %', NEW.requires_min_months;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_plan_theme_min_months(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_plan_theme_min_months() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.requires_min_months IS NOT NULL THEN
    IF NEW.requires_min_months < 0 OR NEW.requires_min_months > 120 THEN
      RAISE EXCEPTION 'requires_min_months must be between 0 and 120, got %', NEW.requires_min_months;
    END IF;
    IF NEW.requires_min_months != TRUNC(NEW.requires_min_months) THEN
      RAISE EXCEPTION 'requires_min_months must be an integer, got %', NEW.requires_min_months;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_promo(uuid, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_promo(_shop_id uuid, _code text, _subtotal numeric, _channel text) RETURNS TABLE(promo_id uuid, code text, discount numeric, error text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  p promos%ROWTYPE;
  d numeric := 0;
BEGIN
  SELECT * INTO p FROM promos
  WHERE shop_id = _shop_id AND lower(code) = lower(_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, _code, 0::numeric, 'Kode promo tidak ditemukan';
    RETURN;
  END IF;

  IF p.starts_at IS NOT NULL AND p.starts_at > now() THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Promo belum berlaku';
    RETURN;
  END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < now() THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Promo sudah expired';
    RETURN;
  END IF;
  IF p.channel <> 'all' AND p.channel::text <> _channel THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Promo tidak berlaku untuk channel ini';
    RETURN;
  END IF;
  IF _subtotal < p.min_order THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Belum mencapai minimum order';
    RETURN;
  END IF;
  IF p.usage_limit IS NOT NULL AND p.usage_count >= p.usage_limit THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Kuota promo habis';
    RETURN;
  END IF;

  IF p.type = 'percent' THEN
    d := round(_subtotal * p.value / 100);
    IF p.max_discount IS NOT NULL AND d > p.max_discount THEN
      d := p.max_discount;
    END IF;
  ELSE
    d := p.value;
  END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;

  RETURN QUERY SELECT p.id, p.code, d, NULL::text;
END;
$$;


--
-- Name: validate_shift_no_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.validate_shift_no_overlap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_conflict RECORD;
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'shift_invalid_range: jam selesai harus setelah jam mulai';
  END IF;

  SELECT s.id, s.start_time, s.end_time
    INTO v_conflict
    FROM public.shifts s
   WHERE s.shop_id = NEW.shop_id
     AND s.user_id = NEW.user_id
     AND s.day_of_week = NEW.day_of_week
     AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND s.start_time < NEW.end_time
     AND s.end_time   > NEW.start_time
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'shift_overlap: bentrok dengan shift % – %',
      to_char(v_conflict.start_time, 'HH24:MI'),
      to_char(v_conflict.end_time, 'HH24:MI');
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: void_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.void_order(_order_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller uuid := auth.uid();
  rec RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF NOT public.has_outlet_access(v_caller, v_order.outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_order.status IN ('voided','cancelled') THEN
    RETURN;
  END IF;

  -- Reverse stock for tracked menu items
  FOR rec IN
    SELECT oi.menu_item_id, oi.quantity AS sold_qty, r.ingredient_id, r.quantity AS recipe_qty, m.shop_id, m.track_stock
    FROM public.order_items oi
    JOIN public.menu_items m ON m.id = oi.menu_item_id
    JOIN public.recipes r ON r.menu_item_id = m.id
    WHERE oi.order_id = _order_id AND m.track_stock = true
  LOOP
    INSERT INTO public.stock_movements (shop_id, ingredient_id, type, quantity, note, order_id, created_by)
    VALUES (rec.shop_id, rec.ingredient_id, 'adjustment', rec.recipe_qty * rec.sold_qty,
            COALESCE('Void order: ' || _reason, 'Void order'),
            _order_id, v_caller);
  END LOOP;

  -- Reverse loyalty points if any (best effort)
  IF v_order.customer_user_id IS NOT NULL AND (v_order.points_earned > 0 OR v_order.points_redeemed > 0) THEN
    INSERT INTO public.loyalty_points (shop_id, user_id, balance, total_earned, total_redeemed)
    VALUES (v_order.shop_id, v_order.customer_user_id,
            v_order.points_redeemed - v_order.points_earned, 0, 0)
    ON CONFLICT (shop_id, user_id) DO UPDATE
      SET balance = public.loyalty_points.balance + (v_order.points_redeemed - v_order.points_earned),
          updated_at = now();

    INSERT INTO public.loyalty_ledger (shop_id, user_id, order_id, delta, reason)
    VALUES (v_order.shop_id, v_order.customer_user_id, _order_id,
            v_order.points_redeemed - v_order.points_earned, 'void');
  END IF;

  UPDATE public.orders
  SET status = 'voided',
      payment_status = 'refunded',
      note = COALESCE(note || ' | ', '') || 'VOID: ' || COALESCE(_reason, ''),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ad_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid,
    ad_type text DEFAULT 'product'::text,
    target_id uuid,
    target_name text,
    target_image text,
    "position" text,
    budget_idr numeric DEFAULT 0,
    duration_days integer DEFAULT 7,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    status text DEFAULT 'payment_pending'::text,
    reject_reason text,
    payment_method text,
    payment_tx_id text,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ad_requests_ad_type_check CHECK ((ad_type = ANY (ARRAY['product'::text, 'shop'::text]))),
    CONSTRAINT ad_requests_position_check CHECK (("position" = ANY (ARRAY['hero_carousel'::text, 'homepage_middle'::text, 'search_top'::text, 'category_top'::text, 'product_sidebar'::text]))),
    CONSTRAINT ad_requests_status_check CHECK ((status = ANY (ARRAY['payment_pending'::text, 'pending'::text, 'active'::text, 'rejected'::text, 'expired'::text, 'paused'::text])))
);


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.attendances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    clock_in timestamp with time zone DEFAULT now() NOT NULL,
    clock_out timestamp with time zone,
    duration_minutes integer,
    business_date date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backup_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.backup_schedules (
    shop_id uuid NOT NULL,
    frequency text DEFAULT 'weekly'::text NOT NULL,
    retention_days integer DEFAULT 30 NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone DEFAULT (now() + '1 day'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    cta_text text,
    cta_link text,
    image_url text,
    bg_color text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.billing_settings (
    id integer DEFAULT 1 NOT NULL,
    bank_name text,
    account_no text,
    account_name text,
    qris_image_url text,
    instructions text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cron_secret text,
    CONSTRAINT billing_settings_id_check CHECK ((id = 1))
);


--
-- Name: booking_reschedule_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.booking_reschedule_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_review_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.booking_review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    customer_phone text,
    customer_user_id uuid,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    clicked_at timestamp with time zone
);


--
-- Name: booking_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.booking_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    body text,
    customer_phone text,
    CONSTRAINT booking_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: booking_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.booking_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    service_name text NOT NULL,
    slot_date date NOT NULL,
    slot_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    price numeric(12,2),
    deposit_percent integer DEFAULT 0 NOT NULL,
    staff_user_id uuid,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    booking_type text DEFAULT 'service'::text NOT NULL,
    CONSTRAINT booking_slots_booking_type_check CHECK ((booking_type = ANY (ARRAY['service'::text, 'table'::text]))),
    CONSTRAINT booking_slots_deposit_percent_check CHECK (((deposit_percent >= 0) AND (deposit_percent <= 100)))
);


--
-- Name: booking_waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.booking_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    slot_id uuid,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    party_size integer DEFAULT 1 NOT NULL,
    requested_date date,
    requested_time time without time zone,
    status text DEFAULT 'waiting'::text NOT NULL,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    queue_number integer,
    served_at timestamp with time zone,
    estimated_wait_minutes integer,
    CONSTRAINT booking_waitlist_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'notified'::text, 'converted'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    customer_email text,
    party_size integer DEFAULT 1 NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    deposit_amount numeric(12,2) DEFAULT 0 NOT NULL,
    deposit_paid boolean DEFAULT false NOT NULL,
    deposit_paid_at timestamp with time zone,
    cancel_token uuid DEFAULT gen_random_uuid() NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_reason text,
    reminded_h3_at timestamp with time zone,
    reminded_h1_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_id uuid,
    location_address text,
    location_name text,
    location_type text,
    location_fee numeric DEFAULT 0 NOT NULL,
    booking_type text DEFAULT 'service'::text NOT NULL,
    reminded_h1h_at timestamp with time zone,
    feedback_requested_at timestamp with time zone,
    rating_submitted_at timestamp with time zone,
    deposit_required boolean DEFAULT false NOT NULL,
    deposit_status text DEFAULT 'none'::text NOT NULL,
    photographer_id uuid,
    CONSTRAINT bookings_booking_type_check CHECK ((booking_type = ANY (ARRAY['service'::text, 'table'::text]))),
    CONSTRAINT bookings_deposit_status_check CHECK ((deposit_status = ANY (ARRAY['none'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'expired'::text, 'refunded'::text]))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text])))
);


--
-- Name: branding_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.branding_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bulk_pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bulk_pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    min_qty integer NOT NULL,
    max_qty integer,
    price numeric(10,2) NOT NULL,
    label text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_id uuid NOT NULL,
    component_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bundle_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.business_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    icon_url text,
    banner_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    commission_override numeric(5,4),
    product_attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled_features text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    booking_enabled boolean DEFAULT false NOT NULL,
    booking_type text,
    booking_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    flow_types text[] DEFAULT '{}'::text[] NOT NULL,
    recommended_theme_key text,
    subtypes jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT business_categories_booking_type_check CHECK (((booking_type IS NULL) OR (booking_type = ANY (ARRAY['session'::text, 'rental'::text, 'both'::text]))))
);


--
-- Name: campaign_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    type public.cash_movement_type NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    note text,
    order_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cash_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    opening_cash numeric DEFAULT 0 NOT NULL,
    closed_by uuid,
    closed_at timestamp with time zone,
    closing_cash numeric,
    expected_cash numeric,
    variance numeric,
    status public.shift_status DEFAULT 'open'::public.shift_status NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kds_station text,
    printer_id uuid
);


--
-- Name: couriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.couriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    phone text NOT NULL,
    plate_number text,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    order_no text NOT NULL,
    business_date date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
    customer_name text,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method public.payment_method NOT NULL,
    amount_tendered numeric(12,2),
    change_due numeric(12,2) DEFAULT 0 NOT NULL,
    status public.order_status DEFAULT 'completed'::public.order_status NOT NULL,
    cashier_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    channel public.order_channel DEFAULT 'pos'::public.order_channel NOT NULL,
    fulfillment public.fulfillment_type DEFAULT 'dine_in'::public.fulfillment_type NOT NULL,
    customer_user_id uuid,
    customer_phone text,
    delivery_address text,
    delivery_fee numeric DEFAULT 0 NOT NULL,
    scheduled_for timestamp with time zone,
    delivery_zone_id uuid,
    courier_id uuid,
    promo_id uuid,
    promo_code text,
    points_earned integer DEFAULT 0 NOT NULL,
    points_redeemed integer DEFAULT 0 NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    payment_proof_url text,
    paid_at timestamp with time zone,
    shift_id uuid,
    tip_amount numeric DEFAULT 0 NOT NULL,
    service_charge numeric DEFAULT 0 NOT NULL,
    payment_split jsonb DEFAULT '[]'::jsonb NOT NULL,
    commission_rate numeric(5,2) DEFAULT 0,
    commission_amount numeric(14,2) DEFAULT 0,
    net_to_shop numeric(14,2) DEFAULT 0,
    escrow_status text DEFAULT 'none'::text,
    escrow_released_at timestamp with time zone,
    marketplace_order boolean DEFAULT false,
    delivery_proof_url text,
    delivered_at timestamp with time zone,
    shop_voucher_code text,
    shop_voucher_discount numeric DEFAULT 0 NOT NULL,
    platform_voucher_code text,
    platform_voucher_discount numeric DEFAULT 0 NOT NULL,
    tracking_number text,
    courier_name text,
    tracking_url text,
    tracking_set_at timestamp with time zone,
    membership_tier_id uuid,
    membership_discount numeric(14,2) DEFAULT 0 NOT NULL,
    membership_discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    requires_deposit boolean DEFAULT false NOT NULL,
    deposit_amount numeric DEFAULT 0 NOT NULL,
    deposit_paid boolean DEFAULT false NOT NULL,
    deposit_paid_at timestamp with time zone,
    balance_due numeric DEFAULT 0 NOT NULL,
    balance_paid boolean DEFAULT false NOT NULL,
    balance_paid_at timestamp with time zone,
    client_idempotency_key text,
    table_label text,
    order_source text,
    assigned_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    customer_signature_url text,
    order_mode text,
    CONSTRAINT orders_order_mode_check CHECK (((order_mode IS NULL) OR (order_mode = ANY (ARRAY['dine_in'::text, 'takeaway'::text, 'delivery'::text, 'online'::text])))),
    CONSTRAINT orders_order_source_check CHECK (((order_source IS NULL) OR (order_source = ANY (ARRAY['pos'::text, 'qr_table'::text, 'website'::text, 'marketplace'::text]))))
);

ALTER TABLE ONLY public.orders REPLICA IDENTITY FULL;


--
-- Name: courier_earnings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.courier_earnings WITH (security_invoker='true') AS
 SELECT c.id AS courier_id,
    c.user_id,
    c.shop_id,
    date_trunc('day'::text, o.delivered_at) AS day,
    count(*) AS deliveries,
    COALESCE(sum(o.delivery_fee), (0)::numeric) AS gross_fee
   FROM (public.couriers c
     JOIN public.orders o ON ((o.courier_id = c.id)))
  WHERE ((o.status = 'completed'::public.order_status) AND (o.delivered_at IS NOT NULL))
  GROUP BY c.id, c.user_id, c.shop_id, (date_trunc('day'::text, o.delivered_at));


--
-- Name: course_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.course_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    certificate_number text DEFAULT ((('CERT-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.course_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    video_url text,
    duration_minutes integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_free_preview boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT course_lessons_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.course_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT course_modules_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: cron_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cron_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    duration_ms integer
);


--
-- Name: custom_order_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.custom_order_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    total numeric NOT NULL,
    breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    valid_until date,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_order_quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: custom_order_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.custom_order_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid,
    customer_name text NOT NULL,
    customer_contact text NOT NULL,
    description text NOT NULL,
    budget_min numeric,
    budget_max numeric,
    deadline date,
    reference_image_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    owner_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    attachment_urls text[] DEFAULT ARRAY[]::text[],
    contract_id uuid
);

ALTER TABLE ONLY public.custom_order_requests REPLICA IDENTITY FULL;


--
-- Name: custom_order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.custom_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    note text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.custom_order_status_history REPLICA IDENTITY FULL;


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text DEFAULT 'Rumah'::text NOT NULL,
    recipient_name text NOT NULL,
    phone text NOT NULL,
    address_line text NOT NULL,
    notes text,
    latitude numeric,
    longitude numeric,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    tier_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    payment_method text,
    auto_renew boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sessions_total integer,
    sessions_remaining integer,
    CONSTRAINT customer_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_address text,
    default_city text,
    default_postal_code text
);


--
-- Name: customer_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1'::text,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_auto boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    service_name text NOT NULL,
    staff_name text,
    formula text,
    allergies_noted text,
    before_photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    after_photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(14,2) NOT NULL,
    balance_after numeric(14,2) NOT NULL,
    ref_order_id uuid,
    ref_topup_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_wallet_transactions_type_check CHECK ((type = ANY (ARRAY['topup'::text, 'bonus'::text, 'spend'::text, 'refund'::text, 'adjustment'::text])))
);


--
-- Name: customer_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customer_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    balance numeric(14,2) DEFAULT 0 NOT NULL,
    total_topped_up numeric(14,2) DEFAULT 0 NOT NULL,
    total_spent numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_wallets_balance_check CHECK ((balance >= (0)::numeric))
);


--
-- Name: delivery_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.delivery_settings (
    shop_id uuid NOT NULL,
    mode public.delivery_mode DEFAULT 'flat'::public.delivery_mode NOT NULL,
    base_fee numeric DEFAULT 0 NOT NULL,
    free_above numeric,
    min_order numeric DEFAULT 0 NOT NULL,
    pickup_enabled boolean DEFAULT true NOT NULL,
    delivery_enabled boolean DEFAULT true NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    min_eta_minutes integer DEFAULT 30 NOT NULL,
    max_eta_minutes integer DEFAULT 60 NOT NULL
);


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    fee numeric DEFAULT 0 NOT NULL,
    area_note text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    min_eta_minutes integer DEFAULT 30 NOT NULL,
    max_eta_minutes integer DEFAULT 60 NOT NULL
);


--
-- Name: domain_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.domain_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    old_domain text,
    new_domain text,
    action text NOT NULL,
    actor_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.domain_blacklist (
    domain text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_verify_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.domain_verify_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    actor_id uuid,
    domain text,
    result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expiry_reminder_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.expiry_reminder_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audience text NOT NULL,
    days_before integer NOT NULL,
    channels text[] DEFAULT ARRAY['inapp'::text] NOT NULL,
    template_subject text NOT NULL,
    template_body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expiry_reminder_rules_audience_check CHECK ((audience = ANY (ARRAY['trial'::text, 'paid'::text]))),
    CONSTRAINT expiry_reminder_rules_days_before_check CHECK (((days_before >= 0) AND (days_before <= 90)))
);


--
-- Name: expiry_reminder_shop_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.expiry_reminder_shop_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    audience text NOT NULL,
    days_before integer NOT NULL,
    channels text[] DEFAULT ARRAY['inapp'::text] NOT NULL,
    template_subject text NOT NULL,
    template_body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expiry_reminder_shop_rules_audience_check CHECK ((audience = ANY (ARRAY['trial'::text, 'paid'::text]))),
    CONSTRAINT expiry_reminder_shop_rules_days_before_check CHECK (((days_before >= 0) AND (days_before <= 90)))
);


--
-- Name: expiry_reminder_shop_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.expiry_reminder_shop_settings (
    shop_id uuid NOT NULL,
    override_schedule boolean DEFAULT false NOT NULL,
    override_rules boolean DEFAULT false NOT NULL,
    send_hour_local integer DEFAULT 9 NOT NULL,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    max_per_shop_per_day integer DEFAULT 2 NOT NULL,
    on_expiry_action text DEFAULT 'grace_then_suspend'::text NOT NULL,
    grace_days integer DEFAULT 3 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expiry_reminder_shop_settings_grace_days_check CHECK (((grace_days >= 0) AND (grace_days <= 90))),
    CONSTRAINT expiry_reminder_shop_settings_max_per_shop_per_day_check CHECK (((max_per_shop_per_day >= 1) AND (max_per_shop_per_day <= 20))),
    CONSTRAINT expiry_reminder_shop_settings_on_expiry_action_check CHECK ((on_expiry_action = ANY (ARRAY['none'::text, 'suspend'::text, 'grace_then_suspend'::text]))),
    CONSTRAINT expiry_reminder_shop_settings_send_hour_local_check CHECK (((send_hour_local >= 0) AND (send_hour_local <= 23)))
);


--
-- Name: features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.features (
    key text NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flash_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.flash_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    flash_price numeric(10,2) NOT NULL,
    original_price numeric(10,2) NOT NULL,
    stock_limit integer,
    stock_sold integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flyers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.flyers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    image_url text NOT NULL,
    file_url text,
    linked_id uuid,
    linked_type text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fnb_combos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fnb_combos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    combo_price numeric(12,2) NOT NULL,
    original_price numeric(12,2) DEFAULT 0 NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    tag text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: freelance_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.freelance_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    client_name text NOT NULL,
    client_phone text,
    client_email text,
    project_name text NOT NULL,
    project_description text NOT NULL,
    total_value numeric(12,2) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    deliverables text NOT NULL,
    revision_count integer DEFAULT 2 NOT NULL,
    payment_terms text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signature_url text,
    signed_by_name text,
    signed_ip text,
    sign_token text DEFAULT encode(extensions.gen_random_bytes(18), 'hex'::text)
);


--
-- Name: icd10_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.icd10_codes (
    code text NOT NULL,
    label_id text NOT NULL,
    category text
);


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    current_stock numeric DEFAULT 0 NOT NULL,
    min_stock numeric DEFAULT 0 NOT NULL,
    cost_per_unit numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    default_supplier_id uuid
);


--
-- Name: job_deliverables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.job_deliverables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    custom_order_id uuid,
    customer_name text NOT NULL,
    customer_contact text NOT NULL,
    title text NOT NULL,
    description text,
    file_url text,
    file_name text,
    file_size_bytes bigint,
    external_url text,
    delivery_token text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text) NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT job_deliverables_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'received'::text, 'revision'::text, 'completed'::text])))
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    source text DEFAULT 'sales_inquiry'::text NOT NULL,
    linked_id uuid,
    linked_type text,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    message text,
    status text DEFAULT 'new'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    watch_seconds integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    total_redeemed integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    shop_id uuid NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    rupiah_per_point numeric DEFAULT 10000 NOT NULL,
    point_value numeric DEFAULT 1000 NOT NULL,
    min_redeem_points integer DEFAULT 10 NOT NULL,
    max_redeem_percent integer DEFAULT 50 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    template text DEFAULT ''::text NOT NULL,
    audience_segment text,
    audience_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.marketplace_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(14,2) NOT NULL,
    notes text,
    options jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: marketplace_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.marketplace_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    generic_name text,
    dose text,
    unit text,
    form text,
    stock integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 10 NOT NULL,
    expiry_date date,
    price numeric(12,2),
    manufacturer text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_hpp_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.menu_hpp_view AS
SELECT
    NULL::uuid AS menu_item_id,
    NULL::uuid AS shop_id,
    NULL::text AS name,
    NULL::numeric(12,2) AS price,
    NULL::numeric AS hpp,
    NULL::numeric AS margin,
    NULL::numeric AS margin_percent,
    NULL::timestamp with time zone AS last_updated,
    NULL::bigint AS recipe_count;


--
-- Name: menu_item_option_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.menu_item_option_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    max_select integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_item_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.menu_item_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    price_adjustment numeric DEFAULT 0 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_item_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.menu_item_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    price numeric DEFAULT 0 NOT NULL,
    stock integer,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    barcode text
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    image_url text,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    track_stock boolean DEFAULT false NOT NULL,
    recipe_yield numeric DEFAULT 1 NOT NULL,
    slug text,
    sku text,
    compare_price numeric(15,2),
    cost_price numeric(15,2),
    stock integer,
    low_stock_threshold integer DEFAULT 5,
    weight_grams integer,
    length_cm numeric(8,2),
    width_cm numeric(8,2),
    height_cm numeric(8,2),
    is_digital boolean DEFAULT false NOT NULL,
    digital_file_url text,
    digital_file_name text,
    is_pre_order boolean DEFAULT false NOT NULL,
    pre_order_days integer,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    video_url text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    total_sold integer DEFAULT 0 NOT NULL,
    total_views integer DEFAULT 0 NOT NULL,
    average_rating numeric(3,2),
    review_count integer DEFAULT 0 NOT NULL,
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    flash_price numeric,
    flash_starts_at timestamp with time zone,
    flash_ends_at timestamp with time zone,
    pre_order_open_at timestamp with time zone,
    pre_order_close_at timestamp with time zone,
    pre_order_estimated_ship_at date,
    pre_order_min_qty integer,
    pre_order_current_qty integer DEFAULT 0 NOT NULL,
    accepts_custom_order boolean DEFAULT false NOT NULL,
    skin_type_tags text[],
    restock_deadline timestamp with time zone,
    nutrition_info jsonb,
    production_days integer,
    condition_grade text,
    auto_disable_on_empty boolean DEFAULT false NOT NULL,
    item_type text DEFAULT 'regular'::text NOT NULL,
    allergens text[] DEFAULT '{}'::text[] NOT NULL,
    is_halal boolean,
    nutrition jsonb DEFAULT '{}'::jsonb NOT NULL,
    available_modes text[] DEFAULT ARRAY['dine-in'::text, 'takeaway'::text, 'delivery'::text] NOT NULL,
    barcode text,
    CONSTRAINT menu_items_recipe_yield_positive CHECK ((recipe_yield > (0)::numeric))
);


--
-- Name: menu_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.menu_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT menu_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_user_id uuid NOT NULL,
    shop_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    severity text DEFAULT 'info'::text NOT NULL,
    read_at timestamp with time zone,
    dedupe_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: open_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.open_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outlet_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    label text DEFAULT 'Cart'::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.order_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    order_id uuid,
    order_no text,
    action text NOT NULL,
    reason text,
    previous_status text,
    new_status text,
    total numeric(14,2),
    actor_id uuid,
    actor_name text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_audit_log_action_check CHECK ((action = ANY (ARRAY['void'::text, 'cancel'::text, 'refund'::text, 'reopen'::text, 'edit'::text, 'qr_unlock'::text])))
);


--
-- Name: order_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.order_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    reason text NOT NULL,
    description text,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    refund_amount numeric,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid,
    name text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);

ALTER TABLE ONLY public.order_items REPLICA IDENTITY FULL;


--
-- Name: order_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.order_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    attachment_url text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outlet_couriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.outlet_couriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    courier_name text NOT NULL,
    service_type text DEFAULT 'regular'::text NOT NULL,
    logo_url text,
    base_fee numeric(12,2) DEFAULT 0 NOT NULL,
    per_km_fee numeric(12,2) DEFAULT 0 NOT NULL,
    min_order numeric(12,2) DEFAULT 0 NOT NULL,
    free_above numeric(12,2),
    max_distance_km numeric(8,2),
    eta_min_minutes integer DEFAULT 30 NOT NULL,
    eta_max_minutes integer DEFAULT 90 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outlets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.outlets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: owner_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.owner_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    severity text DEFAULT 'info'::text NOT NULL,
    read_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dedupe_key text
);

ALTER TABLE ONLY public.owner_notifications REPLICA IDENTITY FULL;


--
-- Name: page_layout_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.page_layout_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    layout_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    puck_data jsonb NOT NULL,
    title text,
    is_published_snapshot boolean DEFAULT false NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.page_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    page_type text NOT NULL,
    slug text,
    title text DEFAULT 'Halaman'::text NOT NULL,
    puck_data jsonb DEFAULT '{"root": {"props": {}}, "content": []}'::jsonb NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_publish_at timestamp with time zone,
    CONSTRAINT page_layouts_page_type_check CHECK ((page_type = ANY (ARRAY['home'::text, 'menu_detail'::text, 'cart'::text, 'checkout'::text, 'custom'::text])))
);


--
-- Name: parked_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.parked_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    label text DEFAULT 'Cart'::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patient_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    patient_name text NOT NULL,
    patient_contact text,
    birth_date date,
    gender text,
    blood_type text,
    allergies text,
    medical_history text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nik text,
    bpjs_number text,
    payer_type text,
    CONSTRAINT patient_records_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['L'::text, 'P'::text, 'other'::text])))),
    CONSTRAINT patient_records_payer_type_check CHECK (((payer_type IS NULL) OR (payer_type = ANY (ARRAY['umum'::text, 'bpjs'::text, 'asuransi'::text]))))
);


--
-- Name: patient_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patient_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    visit_date timestamp with time zone DEFAULT now() NOT NULL,
    complaint text,
    diagnosis text,
    treatment text,
    prescription text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    icd10_code text,
    icd10_label text,
    icd10_secondary jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.plan_features (
    plan_id uuid NOT NULL,
    feature_key text NOT NULL,
    requires_min_months integer DEFAULT 0 NOT NULL,
    limit_value integer,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.plan_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    invoice_no text NOT NULL,
    amount_idr integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    payment_proof_url text,
    paid_at timestamp with time zone,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_ref text,
    checkout_url text,
    subscription_id uuid
);


--
-- Name: plan_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    plan_id uuid,
    plan_code text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_interval text DEFAULT 'monthly'::text NOT NULL,
    next_billing_at timestamp with time zone NOT NULL,
    payment_provider text,
    provider_subscription_id text,
    provider_token text,
    amount_idr integer DEFAULT 0 NOT NULL,
    last_invoice_id uuid,
    last_charge_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.plan_themes (
    plan_id uuid NOT NULL,
    theme_key text NOT NULL,
    requires_min_months integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    price_idr integer NOT NULL,
    duration_days integer NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    value_encrypted text,
    is_encrypted boolean DEFAULT false NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: platform_voucher_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.platform_voucher_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.platform_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    min_order numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    usage_limit integer,
    per_user_limit integer DEFAULT 1,
    usage_count integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'nominal'::text])))
);


--
-- Name: po_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.po_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    action text NOT NULL,
    from_status text,
    to_status text,
    reason text,
    metadata jsonb,
    actor_id uuid,
    actor_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pos_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pos_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    order_id uuid,
    order_no text,
    action text NOT NULL,
    reason text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    cashier_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pos_audit_log_action_check CHECK ((action = ANY (ARRAY['checkout_error'::text, 'checkout_retry'::text, 'checkout_success'::text, 'void'::text, 'cancel'::text])))
);


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prescription_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    medication_id uuid,
    name_snapshot text NOT NULL,
    dose text,
    frequency text,
    duration text,
    qty integer DEFAULT 1 NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    patient_id uuid,
    visit_id uuid,
    doctor_name text,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    diagnosis text,
    notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescriptions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'dispensed'::text, 'cancelled'::text])))
);


--
-- Name: printers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.printers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'thermal'::text NOT NULL,
    connection_type text NOT NULL,
    address text,
    paper_size text DEFAULT '58'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT printers_connection_type_check CHECK ((connection_type = ANY (ARRAY['bluetooth'::text, 'usb'::text, 'wifi'::text, 'network'::text])))
);


--
-- Name: product_attribute_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_attribute_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    key text NOT NULL,
    field_type text DEFAULT 'text'::text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    placeholder text,
    unit text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_qa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_qa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    question text NOT NULL,
    answer text,
    answered_by uuid,
    answered_at timestamp with time zone,
    is_hidden boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    order_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    reason text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    refund_amount numeric(12,2),
    refund_method text,
    restock boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    processed_at timestamp with time zone,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_returns_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])))
);


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    order_id uuid,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    photos text[] DEFAULT '{}'::text[],
    is_verified_purchase boolean DEFAULT false NOT NULL,
    shop_reply text,
    shop_replied_at timestamp with time zone,
    is_hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: product_upsell_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_upsell_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    suggested_id uuid NOT NULL,
    score numeric(10,2) DEFAULT 0 NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    source text DEFAULT 'auto'::text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_upsell_suggestions_source_check CHECK ((source = ANY (ARRAY['auto'::text, 'manual'::text]))),
    CONSTRAINT upsell_no_self CHECK ((product_id <> suggested_id))
);


--
-- Name: products; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products WITH (security_invoker='on') AS
 SELECT id,
    shop_id,
    category_id AS product_category_id,
    name,
    slug,
    description,
    price,
    compare_price,
    cost_price,
    sku,
    weight_grams,
    length_cm,
    width_cm,
    height_cm,
    stock,
    low_stock_threshold,
    is_digital,
    digital_file_url,
    digital_file_name,
    is_pre_order,
    pre_order_days,
    images,
    video_url,
    attributes,
    tags,
    is_available,
    is_featured,
    sort_order,
    total_sold,
    total_views,
    average_rating,
    review_count,
    track_stock,
    recipe_yield,
    image_url,
    created_at,
    updated_at
   FROM public.menu_items;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    display_name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promo_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promo_id uuid NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.promos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    type public.promo_type DEFAULT 'percent'::public.promo_type NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    min_order numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    channel public.promo_channel DEFAULT 'all'::public.promo_channel NOT NULL,
    usage_limit integer,
    usage_count integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    received_qty numeric DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    supplier_id uuid,
    po_no text NOT NULL,
    status public.po_status DEFAULT 'draft'::public.po_status NOT NULL,
    order_date date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
    expected_date date,
    received_date date,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    subscription jsonb NOT NULL,
    user_agent text,
    shop_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    reason text,
    refund_method text DEFAULT 'cash'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rental_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.rental_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    total_days integer GENERATED ALWAYS AS ((end_date - start_date)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kyc_status text DEFAULT 'pending'::text NOT NULL,
    kyc_id_url text,
    kyc_drivers_license_url text,
    kyc_selfie_url text,
    kyc_verified_at timestamp with time zone,
    addons jsonb DEFAULT '[]'::jsonb NOT NULL,
    deposit_paid numeric(12,2),
    total_amount numeric(12,2),
    CONSTRAINT rental_bookings_check CHECK ((end_date > start_date)),
    CONSTRAINT rental_bookings_kyc_status_check CHECK ((kyc_status = ANY (ARRAY['pending'::text, 'submitted'::text, 'verified'::text, 'rejected'::text]))),
    CONSTRAINT rental_bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: rental_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.rental_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    booking_id uuid NOT NULL,
    kind text NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    checklist jsonb DEFAULT '{}'::jsonb NOT NULL,
    condition_score integer,
    notes text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_by uuid,
    CONSTRAINT rental_inspections_condition_score_check CHECK (((condition_score >= 1) AND (condition_score <= 10))),
    CONSTRAINT rental_inspections_kind_check CHECK ((kind = ANY (ARRAY['before'::text, 'after'::text])))
);


--
-- Name: rental_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.rental_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    unit_code text,
    category text,
    description text,
    condition text DEFAULT 'good'::text NOT NULL,
    daily_price numeric(12,2),
    deposit_amount numeric(12,2),
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subtype text,
    plate_number text,
    production_year integer,
    transmission text,
    fuel_type text,
    capacity integer,
    color text,
    odometer integer,
    next_service_at date,
    CONSTRAINT rental_units_condition_check CHECK ((condition = ANY (ARRAY['excellent'::text, 'good'::text, 'fair'::text, 'maintenance'::text])))
);


--
-- Name: restock_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.restock_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    customer_wa text NOT NULL,
    customer_name text,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone
);


--
-- Name: sales_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.sales_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    title text NOT NULL,
    short_desc text,
    long_desc text,
    price_label text,
    cover_image_url text,
    category text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.service_bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_id uuid NOT NULL,
    service_name text NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    unit_price_idr integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: service_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.service_bundles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    total_price_idr integer DEFAULT 0 NOT NULL,
    original_price_idr integer DEFAULT 0 NOT NULL,
    duration_min integer DEFAULT 60 NOT NULL,
    max_uses integer,
    validity_days integer DEFAULT 30,
    is_active boolean DEFAULT true NOT NULL,
    cover_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shifts_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);

ALTER TABLE ONLY public.shifts REPLICA IDENTITY FULL;


--
-- Name: shop_about; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_about (
    shop_id uuid NOT NULL,
    story text,
    vision text,
    certifications jsonb DEFAULT '[]'::jsonb NOT NULL,
    team jsonb DEFAULT '[]'::jsonb NOT NULL,
    credentials jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    file_path text,
    size_bytes bigint,
    includes jsonb DEFAULT '[]'::jsonb NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: shop_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    attachment_type text,
    product_id uuid,
    CONSTRAINT shop_chat_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['buyer'::text, 'seller'::text])))
);


--
-- Name: shop_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    buyer_user_id uuid NOT NULL,
    last_message_at timestamp with time zone,
    buyer_archived boolean DEFAULT false NOT NULL,
    seller_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    phone text,
    email text,
    total_orders integer DEFAULT 0 NOT NULL,
    total_spent numeric DEFAULT 0 NOT NULL,
    last_order_at timestamp with time zone,
    first_order_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    segment text DEFAULT 'new'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shops__bootstrap_placeholder cleanup; Type: TABLE; Schema: public; Owner: -
--

DROP TABLE public.shops__bootstrap_placeholder;


-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    phone text,
    email text,
    address text,
    instagram text,
    whatsapp text,
    tagline text,
    currency text DEFAULT 'IDR'::text NOT NULL,
    open_hours jsonb DEFAULT '{"fri": {"open": "08:00", "close": "22:00", "closed": false}, "mon": {"open": "08:00", "close": "22:00", "closed": false}, "sat": {"open": "08:00", "close": "22:00", "closed": false}, "sun": {"open": "08:00", "close": "22:00", "closed": false}, "thu": {"open": "08:00", "close": "22:00", "closed": false}, "tue": {"open": "08:00", "close": "22:00", "closed": false}, "wed": {"open": "08:00", "close": "22:00", "closed": false}}'::jsonb NOT NULL,
    qris_image_url text,
    qris_merchant_name text,
    payment_methods_enabled text[] DEFAULT ARRAY['cash'::text, 'qris'::text] NOT NULL,
    prep_minutes integer DEFAULT 20 NOT NULL,
    tax_percent numeric DEFAULT 0 NOT NULL,
    service_charge_percent numeric DEFAULT 0 NOT NULL,
    tax_inclusive boolean DEFAULT false NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    plan_expires_at timestamp with time zone,
    custom_domain text,
    custom_domain_verified_at timestamp with time zone,
    custom_domain_verify_token text,
    last_dns_check_at timestamp with time zone,
    suspended_at timestamp with time zone,
    suspended_reason text,
    active_theme_key text DEFAULT 'classic'::text NOT NULL,
    plan_started_at timestamp with time zone,
    receipt_header text,
    receipt_footer text,
    business_category_id uuid,
    marketplace_visible boolean DEFAULT true NOT NULL,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    verified_at timestamp with time zone,
    total_sales_count integer DEFAULT 0 NOT NULL,
    total_gmv numeric(15,2) DEFAULT 0 NOT NULL,
    average_rating numeric(3,2),
    review_count integer DEFAULT 0 NOT NULL,
    commission_rate_override numeric(5,4),
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    is_featured boolean DEFAULT false NOT NULL,
    kyc_status text,
    kyc_document_url text,
    kyc_submitted_at timestamp with time zone,
    kyc_reviewed_at timestamp with time zone,
    kyc_reviewer_id uuid,
    kyc_reject_reason text,
    deposit_enabled boolean DEFAULT false NOT NULL,
    deposit_min_total numeric DEFAULT 0 NOT NULL,
    auto_reply_enabled boolean DEFAULT false NOT NULL,
    auto_reply_message text,
    business_subtype text,
    trial_ends_at timestamp with time zone,
    latitude numeric,
    longitude numeric,
    city text,
    deposit_notes text,
    deposit_percentage numeric DEFAULT 0 NOT NULL,
    require_id_upload boolean DEFAULT false NOT NULL,
    feature_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    theme_key text DEFAULT 'classic'::text NOT NULL,
    onboarded_at timestamp with time zone,
    watermark_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT coffee_shops_kyc_status_check CHECK (((kyc_status IS NULL) OR (kyc_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])))),
    CONSTRAINT coffee_shops_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))),
    CONSTRAINT shops_deposit_percentage_check CHECK (((deposit_percentage >= (0)::numeric) AND (deposit_percentage <= (100)::numeric)))
);


--
-- Name: shop_health_score; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.shop_health_score WITH (security_invoker='true') AS
 SELECT s.id AS shop_id,
    s.name AS shop_name,
    s.slug,
    s.owner_id,
    (COALESCE(prod.cnt, (0)::bigint))::integer AS product_count,
    (COALESCE(ord30.cnt, (0)::bigint))::integer AS orders_last_30d,
    COALESCE(ord30.total, (0)::numeric) AS revenue_last_30d,
    (COALESCE(rev.avg_rating, (0)::numeric))::numeric(3,2) AS avg_rating,
    (COALESCE(rev.cnt, (0)::bigint))::integer AS review_count,
    s.created_at AS shop_created_at,
    (LEAST((100)::bigint, (((
        CASE
            WHEN (COALESCE(prod.cnt, (0)::bigint) >= 5) THEN (20)::bigint
            ELSE (COALESCE(prod.cnt, (0)::bigint) * 4)
        END +
        CASE
            WHEN (COALESCE(ord30.cnt, (0)::bigint) >= 20) THEN 30
            ELSE (((COALESCE(ord30.cnt, (0)::bigint))::numeric * 1.5))::integer
        END) +
        CASE
            WHEN (COALESCE(rev.avg_rating, (0)::numeric) >= (4)::numeric) THEN 25
            ELSE ((COALESCE(rev.avg_rating, (0)::numeric) * (5)::numeric))::integer
        END) +
        CASE
            WHEN ((now() - s.created_at) < '30 days'::interval) THEN 25
            ELSE 15
        END)))::integer AS health_score
   FROM (((public.shops s
     LEFT JOIN ( SELECT menu_items.shop_id,
            count(*) AS cnt
           FROM public.menu_items
          WHERE (menu_items.is_available = true)
          GROUP BY menu_items.shop_id) prod ON ((prod.shop_id = s.id)))
     LEFT JOIN ( SELECT orders.shop_id,
            count(*) AS cnt,
            sum(orders.total) AS total
           FROM public.orders
          WHERE ((orders.created_at > (now() - '30 days'::interval)) AND ((orders.status)::text <> ALL (ARRAY['cancelled'::text, 'refunded'::text])))
          GROUP BY orders.shop_id) ord30 ON ((ord30.shop_id = s.id)))
     LEFT JOIN ( SELECT product_reviews.shop_id,
            avg(product_reviews.rating) AS avg_rating,
            count(*) AS cnt
           FROM public.product_reviews
          WHERE (product_reviews.is_hidden = false)
          GROUP BY product_reviews.shop_id) rev ON ((rev.shop_id = s.id)));


--
-- Name: shop_membership_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_membership_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(14,2) NOT NULL,
    duration_days integer DEFAULT 30 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    perks jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_membership_tiers_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT shop_membership_tiers_duration_days_check CHECK ((duration_days > 0)),
    CONSTRAINT shop_membership_tiers_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: shop_portfolio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_portfolio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    image_url text NOT NULL,
    caption text,
    category text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    before_image_url text,
    after_image_url text,
    is_before_after boolean DEFAULT false NOT NULL
);


--
-- Name: shop_size_charts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_size_charts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    unit text DEFAULT 'cm'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    rows jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    ktp_url text NOT NULL,
    ktp_full_name text,
    ktp_number text,
    selfie_ktp_url text,
    npwp_url text,
    business_license_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    notes text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_verifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: shop_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    value numeric NOT NULL,
    min_order numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    usage_limit integer,
    per_user_limit integer,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text]))),
    CONSTRAINT shop_vouchers_value_check CHECK ((value > (0)::numeric))
);


--
-- Name: shop_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.shop_wallets (
    shop_id uuid NOT NULL,
    available_balance numeric(14,2) DEFAULT 0 NOT NULL,
    pending_balance numeric(14,2) DEFAULT 0 NOT NULL,
    total_earned numeric(14,2) DEFAULT 0 NOT NULL,
    total_withdrawn numeric(14,2) DEFAULT 0 NOT NULL,
    total_commission_paid numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    actor_id uuid,
    target_user_id uuid,
    target_email text,
    target_name text,
    action text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    email text NOT NULL,
    role public.app_role NOT NULL,
    token text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text) NOT NULL,
    invited_by uuid NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    allowed_modules text[]
);


--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    name text NOT NULL,
    role public.app_role DEFAULT 'cashier'::public.app_role NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    hire_date date,
    hourly_rate numeric,
    notes text,
    user_id uuid
);

ALTER TABLE ONLY public.staff_members REPLICA IDENTITY FULL;


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.staff_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'cashier'::text NOT NULL,
    allowed_modules text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    type public.stock_movement_type NOT NULL,
    quantity numeric NOT NULL,
    unit_cost numeric,
    note text,
    order_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_opname_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.stock_opname_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_opname_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    system_stock numeric DEFAULT 0 NOT NULL,
    actual_stock numeric DEFAULT 0 NOT NULL,
    adjustment numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_opnames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.stock_opnames (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    notes text,
    status text DEFAULT 'completed'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.studio_galleries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    title text NOT NULL,
    client_name text,
    client_email text,
    share_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    expires_at timestamp with time zone,
    watermark_enabled boolean DEFAULT true NOT NULL,
    max_selections integer,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photographer_id uuid,
    CONSTRAINT studio_galleries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'reviewed'::text, 'closed'::text])))
);


--
-- Name: studio_gallery_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.studio_gallery_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gallery_id uuid NOT NULL,
    photo_url text NOT NULL,
    thumbnail_url text,
    is_selected boolean DEFAULT false NOT NULL,
    customer_note text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.studio_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    location_type text NOT NULL,
    address text,
    description text,
    extra_fee numeric DEFAULT 0 NOT NULL,
    travel_radius_km numeric,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT studio_locations_location_type_check CHECK ((location_type = ANY (ARRAY['studio'::text, 'outdoor'::text, 'client'::text])))
);


--
-- Name: studio_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.studio_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    includes text[] DEFAULT '{}'::text[] NOT NULL,
    max_capacity integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_photographers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.studio_photographers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    role text DEFAULT 'photographer'::text NOT NULL,
    color text DEFAULT '#6366f1'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    address text,
    note text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lead_time_days integer DEFAULT 0 NOT NULL,
    payment_terms text
);


--
-- Name: system_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.system_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    shop_id uuid,
    actor_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    role_or_trip text,
    quote text NOT NULL,
    photo_url text,
    rating smallint,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.themes (
    key text NOT NULL,
    name text NOT NULL,
    description text,
    preview_image_url text,
    component_id text NOT NULL,
    tier_hint text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: travel_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.travel_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    package_id uuid,
    jamaah_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    total_amount numeric(14,2) NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    schedule jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_installments_status_check CHECK ((status = ANY (ARRAY['open'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: travel_itineraries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.travel_itineraries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    package_id uuid NOT NULL,
    day_number integer NOT NULL,
    time_label text,
    title text NOT NULL,
    description text,
    location text,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_itineraries_day_number_check CHECK ((day_number >= 1))
);


--
-- Name: travel_jamaah_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.travel_jamaah_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    jamaah_id uuid NOT NULL,
    doc_type text NOT NULL,
    doc_number text,
    issued_at date,
    expiry_date date,
    file_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_jamaah_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['paspor'::text, 'visa'::text, 'vaksin'::text, 'ktp'::text, 'identitas_lain'::text]))),
    CONSTRAINT travel_jamaah_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: travel_jamaah_manifest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.travel_jamaah_manifest (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    package_id uuid,
    full_name text NOT NULL,
    nik text,
    passport_number text,
    passport_expiry date,
    birth_date date,
    gender text,
    phone text,
    email text,
    address text,
    emergency_contact text,
    special_needs text,
    room_assignment text,
    document_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_jamaah_manifest_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['L'::text, 'P'::text])))),
    CONSTRAINT travel_jamaah_manifest_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'docs-incomplete'::text, 'ready'::text, 'departed'::text, 'returned'::text, 'cancelled'::text])))
);


--
-- Name: umroh_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.umroh_facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    icon text DEFAULT 'Star'::text NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: umroh_faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.umroh_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: umroh_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.umroh_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    departure_date date,
    return_date date,
    duration_days integer,
    hotel_makkah text,
    hotel_madinah text,
    airline text,
    room_type text,
    price_quad numeric(14,2),
    price_triple numeric(14,2),
    price_double numeric(14,2),
    currency text DEFAULT 'IDR'::text NOT NULL,
    includes text[] DEFAULT ARRAY[]::text[],
    excludes text[] DEFAULT ARRAY[]::text[],
    cover_image_url text,
    brochure_pdf_url text,
    quota_total integer,
    quota_filled integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    package_type text DEFAULT 'umroh'::text NOT NULL,
    itinerary jsonb DEFAULT '[]'::jsonb NOT NULL,
    price_single numeric(14,2),
    CONSTRAINT umroh_packages_package_type_check CHECK ((package_type = ANY (ARRAY['umroh'::text, 'hajj'::text, 'tour-domestic'::text, 'tour-international'::text, 'event'::text])))
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid NOT NULL,
    default_outlet_id uuid,
    active_carts jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    shop_id uuid,
    outlet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY public.user_roles REPLICA IDENTITY FULL;


--
-- Name: v_shop_capabilities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_shop_capabilities WITH (security_invoker='true') AS
 SELECT s.id AS shop_id,
    s.business_category_id,
    s.business_subtype,
    bc.slug AS category_slug,
    bc.name AS category_name,
    COALESCE(bc.flow_types, '{}'::text[]) AS flow_types,
    bc.booking_type,
    bc.booking_config,
    ( SELECT COALESCE(array_agg(DISTINCT u.f ORDER BY u.f), '{}'::text[]) AS "coalesce"
           FROM ( SELECT unnest(COALESCE(bc.enabled_features, '{}'::text[])) AS f
                UNION
                 SELECT jsonb_array_elements_text(COALESCE((s.feature_overrides -> 'enable'::text), '[]'::jsonb)) AS jsonb_array_elements_text) u
          WHERE (NOT (u.f IN ( SELECT jsonb_array_elements_text(COALESCE((s.feature_overrides -> 'disable'::text), '[]'::jsonb)) AS jsonb_array_elements_text)))) AS enabled_features
   FROM (public.shops s
     LEFT JOIN public.business_categories bc ON ((bc.id = s.business_category_id)));


--
-- Name: wallet_topup_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wallet_topup_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    label text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_topup_presets_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT wallet_topup_presets_bonus_amount_check CHECK ((bonus_amount >= (0)::numeric))
);


--
-- Name: wallet_topups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wallet_topups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    preset_id uuid,
    amount numeric(14,2) NOT NULL,
    bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_credit numeric(14,2) NOT NULL,
    payment_method text,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    payment_proof_url text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_topups_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT wallet_topups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    type public.wallet_txn_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    balance_after numeric(14,2),
    order_id uuid,
    withdrawal_id uuid,
    reference text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    event_id text NOT NULL,
    payload_summary jsonb,
    status text DEFAULT 'received'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    admin_fee numeric(14,2) DEFAULT 0 NOT NULL,
    net_amount numeric(14,2) NOT NULL,
    bank_name text NOT NULL,
    bank_account_no text NOT NULL,
    bank_account_name text NOT NULL,
    status public.withdrawal_status DEFAULT 'pending'::public.withdrawal_status NOT NULL,
    notes text,
    reject_reason text,
    proof_url text,
    requested_by uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: ad_requests ad_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: backup_schedules backup_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_pkey PRIMARY KEY (shop_id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: billing_settings billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_pkey PRIMARY KEY (id);


--
-- Name: booking_reschedule_tokens booking_reschedule_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reschedule_tokens
    ADD CONSTRAINT booking_reschedule_tokens_pkey PRIMARY KEY (id);


--
-- Name: booking_reschedule_tokens booking_reschedule_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reschedule_tokens
    ADD CONSTRAINT booking_reschedule_tokens_token_key UNIQUE (token);


--
-- Name: booking_review_requests booking_review_requests_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_booking_id_key UNIQUE (booking_id);


--
-- Name: booking_review_requests booking_review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_pkey PRIMARY KEY (id);


--
-- Name: booking_reviews booking_reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: booking_reviews booking_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_pkey PRIMARY KEY (id);


--
-- Name: booking_slots booking_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT booking_slots_pkey PRIMARY KEY (id);


--
-- Name: booking_waitlist booking_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: branding_audit branding_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_audit
    ADD CONSTRAINT branding_audit_pkey PRIMARY KEY (id);


--
-- Name: bulk_pricing_rules bulk_pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: bundle_items bundle_items_bundle_id_component_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_component_id_key UNIQUE (bundle_id, component_id);


--
-- Name: bundle_items bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_slug_key UNIQUE (slug);


--
-- Name: campaign_recipients campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: cash_movements cash_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_pkey PRIMARY KEY (id);


--
-- Name: cash_shifts cash_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: shops coffee_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_pkey PRIMARY KEY (id);


--
-- Name: shops coffee_shops_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_slug_key UNIQUE (slug);


--
-- Name: couriers couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_pkey PRIMARY KEY (id);


--
-- Name: course_certificates course_certificates_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: course_certificates course_certificates_course_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_course_id_user_id_key UNIQUE (course_id, user_id);


--
-- Name: course_certificates course_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_user_id_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_menu_item_id_key UNIQUE (user_id, menu_item_id);


--
-- Name: course_lessons course_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_pkey PRIMARY KEY (id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: cron_runs cron_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_runs
    ADD CONSTRAINT cron_runs_pkey PRIMARY KEY (id);


--
-- Name: custom_order_quotes custom_order_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_pkey PRIMARY KEY (id);


--
-- Name: custom_order_requests custom_order_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_pkey PRIMARY KEY (id);


--
-- Name: custom_order_status_history custom_order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_status_history
    ADD CONSTRAINT custom_order_status_history_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_favorites customer_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorites
    ADD CONSTRAINT customer_favorites_pkey PRIMARY KEY (id);


--
-- Name: customer_favorites customer_favorites_user_id_shop_id_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorites
    ADD CONSTRAINT customer_favorites_user_id_shop_id_menu_item_id_key UNIQUE (user_id, shop_id, menu_item_id);


--
-- Name: customer_memberships customer_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_user_id_key UNIQUE (user_id);


--
-- Name: customer_segments customer_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_pkey PRIMARY KEY (id);


--
-- Name: customer_segments customer_segments_shop_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_shop_id_name_key UNIQUE (shop_id, name);


--
-- Name: customer_treatments customer_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_pkey PRIMARY KEY (id);


--
-- Name: customer_wallet_transactions customer_wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallet_transactions
    ADD CONSTRAINT customer_wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: customer_wallets customer_wallets_customer_user_id_shop_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_customer_user_id_shop_id_key UNIQUE (customer_user_id, shop_id);


--
-- Name: customer_wallets customer_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_pkey PRIMARY KEY (id);


--
-- Name: delivery_settings delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_settings
    ADD CONSTRAINT delivery_settings_pkey PRIMARY KEY (shop_id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: domain_audit domain_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_audit
    ADD CONSTRAINT domain_audit_pkey PRIMARY KEY (id);


--
-- Name: domain_blacklist domain_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_blacklist
    ADD CONSTRAINT domain_blacklist_pkey PRIMARY KEY (domain);


--
-- Name: domain_verify_attempts domain_verify_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_verify_attempts
    ADD CONSTRAINT domain_verify_attempts_pkey PRIMARY KEY (id);


--
-- Name: expiry_reminder_rules expiry_reminder_rules_audience_days_before_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_rules
    ADD CONSTRAINT expiry_reminder_rules_audience_days_before_key UNIQUE (audience, days_before);


--
-- Name: expiry_reminder_rules expiry_reminder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_rules
    ADD CONSTRAINT expiry_reminder_rules_pkey PRIMARY KEY (id);


--
-- Name: expiry_reminder_shop_rules expiry_reminder_shop_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_pkey PRIMARY KEY (id);


--
-- Name: expiry_reminder_shop_rules expiry_reminder_shop_rules_shop_id_audience_days_before_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_shop_id_audience_days_before_key UNIQUE (shop_id, audience, days_before);


--
-- Name: expiry_reminder_shop_settings expiry_reminder_shop_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_settings
    ADD CONSTRAINT expiry_reminder_shop_settings_pkey PRIMARY KEY (shop_id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (key);


--
-- Name: flash_sales flash_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_pkey PRIMARY KEY (id);


--
-- Name: flyers flyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyers
    ADD CONSTRAINT flyers_pkey PRIMARY KEY (id);


--
-- Name: fnb_combos fnb_combos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fnb_combos
    ADD CONSTRAINT fnb_combos_pkey PRIMARY KEY (id);


--
-- Name: freelance_contracts freelance_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_pkey PRIMARY KEY (id);


--
-- Name: freelance_contracts freelance_contracts_sign_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_sign_token_key UNIQUE (sign_token);


--
-- Name: icd10_codes icd10_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icd10_codes
    ADD CONSTRAINT icd10_codes_pkey PRIMARY KEY (code);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: job_deliverables job_deliverables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: loyalty_ledger loyalty_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_ledger
    ADD CONSTRAINT loyalty_ledger_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_shop_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_shop_id_user_id_key UNIQUE (shop_id, user_id);


--
-- Name: loyalty_points loyalty_points_shop_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_shop_user_unique UNIQUE (shop_id, user_id);


--
-- Name: loyalty_settings loyalty_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_settings
    ADD CONSTRAINT loyalty_settings_pkey PRIMARY KEY (shop_id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketplace_cart_items marketplace_cart_items_cart_id_product_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_cart_id_product_id_variant_id_key UNIQUE (cart_id, product_id, variant_id);


--
-- Name: marketplace_cart_items marketplace_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_pkey PRIMARY KEY (id);


--
-- Name: marketplace_carts marketplace_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_pkey PRIMARY KEY (id);


--
-- Name: marketplace_carts marketplace_carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_user_id_key UNIQUE (user_id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: menu_item_option_groups menu_item_option_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_option_groups
    ADD CONSTRAINT menu_item_option_groups_pkey PRIMARY KEY (id);


--
-- Name: menu_item_options menu_item_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_pkey PRIMARY KEY (id);


--
-- Name: menu_item_variants menu_item_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_reviews menu_reviews_order_id_menu_item_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_reviews
    ADD CONSTRAINT menu_reviews_order_id_menu_item_id_user_id_key UNIQUE (order_id, menu_item_id, user_id);


--
-- Name: menu_reviews menu_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_reviews
    ADD CONSTRAINT menu_reviews_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_recipient_user_id_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_dedupe_key_key UNIQUE (recipient_user_id, dedupe_key);


--
-- Name: open_bills open_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_pkey PRIMARY KEY (id);


--
-- Name: order_audit_log order_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_pkey PRIMARY KEY (id);


--
-- Name: order_disputes order_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_disputes
    ADD CONSTRAINT order_disputes_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_messages order_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_messages
    ADD CONSTRAINT order_messages_pkey PRIMARY KEY (id);


--
-- Name: orders orders_outlet_id_business_date_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_outlet_id_business_date_order_no_key UNIQUE (outlet_id, business_date, order_no);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: outlet_couriers outlet_couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_pkey PRIMARY KEY (id);


--
-- Name: outlets outlets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_pkey PRIMARY KEY (id);


--
-- Name: owner_notifications owner_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_notifications
    ADD CONSTRAINT owner_notifications_pkey PRIMARY KEY (id);


--
-- Name: owner_notifications owner_notifications_shop_dedupe_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_notifications
    ADD CONSTRAINT owner_notifications_shop_dedupe_unique UNIQUE (shop_id, dedupe_key);


--
-- Name: page_layout_versions page_layout_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layout_versions
    ADD CONSTRAINT page_layout_versions_pkey PRIMARY KEY (id);


--
-- Name: page_layouts page_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layouts
    ADD CONSTRAINT page_layouts_pkey PRIMARY KEY (id);


--
-- Name: parked_carts parked_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_pkey PRIMARY KEY (id);


--
-- Name: patient_records patient_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_records
    ADD CONSTRAINT patient_records_pkey PRIMARY KEY (id);


--
-- Name: patient_visits patient_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (plan_id, feature_key);


--
-- Name: plan_invoices plan_invoices_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_invoice_no_key UNIQUE (invoice_no);


--
-- Name: plan_invoices plan_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_pkey PRIMARY KEY (id);


--
-- Name: plan_subscriptions plan_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: plan_subscriptions plan_subscriptions_shop_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_shop_id_key UNIQUE (shop_id);


--
-- Name: plan_themes plan_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_pkey PRIMARY KEY (plan_id, theme_key);


--
-- Name: plans plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_code_key UNIQUE (code);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_key_key UNIQUE (key);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: platform_voucher_redemptions platform_voucher_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_voucher_redemptions
    ADD CONSTRAINT platform_voucher_redemptions_pkey PRIMARY KEY (id);


--
-- Name: platform_vouchers platform_vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_vouchers
    ADD CONSTRAINT platform_vouchers_code_key UNIQUE (code);


--
-- Name: platform_vouchers platform_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_vouchers
    ADD CONSTRAINT platform_vouchers_pkey PRIMARY KEY (id);


--
-- Name: po_audit_log po_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_audit_log
    ADD CONSTRAINT po_audit_log_pkey PRIMARY KEY (id);


--
-- Name: pos_audit_log pos_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_pkey PRIMARY KEY (id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);


--
-- Name: product_attribute_defs product_attribute_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_pkey PRIMARY KEY (id);


--
-- Name: product_attribute_defs product_attribute_defs_shop_id_category_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_shop_id_category_id_key_key UNIQUE (shop_id, category_id, key);


--
-- Name: product_qa product_qa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_pkey PRIMARY KEY (id);


--
-- Name: product_returns product_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_product_id_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_user_id_order_id_key UNIQUE (product_id, user_id, order_id);


--
-- Name: product_upsell_suggestions product_upsell_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_pkey PRIMARY KEY (id);


--
-- Name: product_upsell_suggestions product_upsell_suggestions_product_id_suggested_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_product_id_suggested_id_key UNIQUE (product_id, suggested_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: promo_redemptions promo_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id);


--
-- Name: promos promos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promos
    ADD CONSTRAINT promos_pkey PRIMARY KEY (id);


--
-- Name: promos promos_shop_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promos
    ADD CONSTRAINT promos_shop_id_code_key UNIQUE (shop_id, code);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: recipes recipes_menu_item_id_ingredient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_menu_item_id_ingredient_id_key UNIQUE (menu_item_id, ingredient_id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: rental_bookings rental_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_pkey PRIMARY KEY (id);


--
-- Name: rental_inspections rental_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_pkey PRIMARY KEY (id);


--
-- Name: rental_units rental_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_units
    ADD CONSTRAINT rental_units_pkey PRIMARY KEY (id);


--
-- Name: restock_subscribers restock_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_pkey PRIMARY KEY (id);


--
-- Name: restock_subscribers restock_subscribers_product_id_customer_wa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_product_id_customer_wa_key UNIQUE (product_id, customer_wa);


--
-- Name: sales_offerings sales_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_offerings
    ADD CONSTRAINT sales_offerings_pkey PRIMARY KEY (id);


--
-- Name: service_bundle_items service_bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundle_items
    ADD CONSTRAINT service_bundle_items_pkey PRIMARY KEY (id);


--
-- Name: service_bundles service_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundles
    ADD CONSTRAINT service_bundles_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: shop_about shop_about_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_about
    ADD CONSTRAINT shop_about_pkey PRIMARY KEY (shop_id);


--
-- Name: shop_backups shop_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_backups
    ADD CONSTRAINT shop_backups_pkey PRIMARY KEY (id);


--
-- Name: shop_chat_messages shop_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: shop_chats shop_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_pkey PRIMARY KEY (id);


--
-- Name: shop_chats shop_chats_shop_id_buyer_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_shop_id_buyer_user_id_key UNIQUE (shop_id, buyer_user_id);


--
-- Name: shop_customers shop_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customers
    ADD CONSTRAINT shop_customers_pkey PRIMARY KEY (id);


--
-- Name: shop_customers shop_customers_shop_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customers
    ADD CONSTRAINT shop_customers_shop_id_user_id_key UNIQUE (shop_id, user_id);


--
-- Name: shop_membership_tiers shop_membership_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_membership_tiers
    ADD CONSTRAINT shop_membership_tiers_pkey PRIMARY KEY (id);


--
-- Name: shop_portfolio shop_portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_portfolio
    ADD CONSTRAINT shop_portfolio_pkey PRIMARY KEY (id);


--
-- Name: shop_size_charts shop_size_charts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_size_charts
    ADD CONSTRAINT shop_size_charts_pkey PRIMARY KEY (id);


--
-- Name: shop_verifications shop_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_verifications
    ADD CONSTRAINT shop_verifications_pkey PRIMARY KEY (id);


--
-- Name: shop_vouchers shop_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_pkey PRIMARY KEY (id);


--
-- Name: shop_vouchers shop_vouchers_shop_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_shop_id_code_key UNIQUE (shop_id, code);


--
-- Name: shop_wallets shop_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_wallets
    ADD CONSTRAINT shop_wallets_pkey PRIMARY KEY (shop_id);


--
-- Name: staff_audit_logs staff_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audit_logs
    ADD CONSTRAINT staff_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: staff_invitations staff_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_pkey PRIMARY KEY (id);


--
-- Name: staff_invitations staff_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_token_key UNIQUE (token);


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_shop_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_shop_id_user_id_key UNIQUE (shop_id, user_id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_opname_items stock_opname_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_pkey PRIMARY KEY (id);


--
-- Name: stock_opnames stock_opnames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_pkey PRIMARY KEY (id);


--
-- Name: studio_galleries studio_galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_pkey PRIMARY KEY (id);


--
-- Name: studio_galleries studio_galleries_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_share_token_key UNIQUE (share_token);


--
-- Name: studio_gallery_photos studio_gallery_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_gallery_photos
    ADD CONSTRAINT studio_gallery_photos_pkey PRIMARY KEY (id);


--
-- Name: studio_locations studio_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_locations
    ADD CONSTRAINT studio_locations_pkey PRIMARY KEY (id);


--
-- Name: studio_packages studio_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_packages
    ADD CONSTRAINT studio_packages_pkey PRIMARY KEY (id);


--
-- Name: studio_photographers studio_photographers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_photographers
    ADD CONSTRAINT studio_photographers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_audit system_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit
    ADD CONSTRAINT system_audit_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (key);


--
-- Name: travel_installments travel_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_pkey PRIMARY KEY (id);


--
-- Name: travel_itineraries travel_itineraries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_pkey PRIMARY KEY (id);


--
-- Name: travel_jamaah_documents travel_jamaah_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_pkey PRIMARY KEY (id);


--
-- Name: travel_jamaah_manifest travel_jamaah_manifest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_pkey PRIMARY KEY (id);


--
-- Name: umroh_facilities umroh_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_facilities
    ADD CONSTRAINT umroh_facilities_pkey PRIMARY KEY (id);


--
-- Name: umroh_faqs umroh_faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_faqs
    ADD CONSTRAINT umroh_faqs_pkey PRIMARY KEY (id);


--
-- Name: umroh_packages umroh_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_packages
    ADD CONSTRAINT umroh_packages_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_shop_id_outlet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_shop_id_outlet_id_key UNIQUE (user_id, role, shop_id, outlet_id);


--
-- Name: wallet_topup_presets wallet_topup_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topup_presets
    ADD CONSTRAINT wallet_topup_presets_pkey PRIMARY KEY (id);


--
-- Name: wallet_topups wallet_topups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_unique UNIQUE (provider, event_id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_menu_item_id_key UNIQUE (user_id, menu_item_id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -

-- =============================================================================
-- BEGIN: 02_indexes_views_triggers.sql
-- =============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--

ALTER TABLE ONLY public.withdrawal_requests
    DROP CONSTRAINT IF EXISTS withdrawal_requests_pkey;
ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: coffee_shops_custom_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS coffee_shops_custom_domain_key ON public.shops USING btree (lower(custom_domain)) WHERE (custom_domain IS NOT NULL);


--
-- Name: couriers_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS couriers_email_unique ON public.couriers USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: domain_audit_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS domain_audit_shop_idx ON public.domain_audit USING btree (shop_id);


--
-- Name: idx_ad_requests_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ad_requests_shop ON public.ad_requests USING btree (shop_id);


--
-- Name: idx_ad_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON public.ad_requests USING btree (status);


--
-- Name: idx_attendances_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendances_shop ON public.attendances USING btree (shop_id, business_date DESC);


--
-- Name: idx_attendances_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendances_user ON public.attendances USING btree (user_id, business_date DESC);


--
-- Name: idx_banners_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON public.banners USING btree (is_active, sort_order);


--
-- Name: idx_booking_slots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_booking_slots_active ON public.booking_slots USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_booking_slots_shop_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_booking_slots_shop_date ON public.booking_slots USING btree (shop_id, slot_date);


--
-- Name: idx_booking_slots_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_booking_slots_type ON public.booking_slots USING btree (shop_id, booking_type, slot_date);


--
-- Name: idx_bookings_cancel_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_cancel_token ON public.bookings USING btree (cancel_token);


--
-- Name: idx_bookings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings USING btree (customer_user_id) WHERE (customer_user_id IS NOT NULL);


--
-- Name: idx_bookings_photographer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_photographer ON public.bookings USING btree (photographer_id);


--
-- Name: idx_bookings_shop_deposit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_shop_deposit_status ON public.bookings USING btree (shop_id, deposit_status);


--
-- Name: idx_bookings_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_shop_status ON public.bookings USING btree (shop_id, status);


--
-- Name: idx_bookings_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.bookings USING btree (slot_id);


--
-- Name: idx_bookings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_type ON public.bookings USING btree (shop_id, booking_type, status);


--
-- Name: idx_branding_audit_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branding_audit_shop ON public.branding_audit USING btree (shop_id, created_at DESC);


--
-- Name: idx_bulk_pricing_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_menu ON public.bulk_pricing_rules USING btree (menu_item_id);


--
-- Name: idx_bulk_pricing_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_shop ON public.bulk_pricing_rules USING btree (shop_id);


--
-- Name: idx_bundle_items_bundle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON public.bundle_items USING btree (bundle_id);


--
-- Name: idx_bundle_items_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bundle_items_component_id ON public.bundle_items USING btree (component_id);


--
-- Name: idx_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.marketplace_cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cart_items_shop ON public.marketplace_cart_items USING btree (cart_id, shop_id);


--
-- Name: idx_cash_movements_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON public.cash_movements USING btree (shift_id);


--
-- Name: idx_cash_shifts_outlet_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cash_shifts_outlet_status ON public.cash_shifts USING btree (outlet_id, status);


--
-- Name: idx_cash_shifts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cash_shifts_shop ON public.cash_shifts USING btree (shop_id);


--
-- Name: idx_categories_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_shop ON public.categories USING btree (shop_id, sort_order);


--
-- Name: idx_categories_shop_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_shop_active ON public.categories USING btree (shop_id, is_active);


--
-- Name: idx_cert_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cert_course ON public.course_certificates USING btree (course_id);


--
-- Name: idx_cert_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cert_user ON public.course_certificates USING btree (user_id);


--
-- Name: idx_coffee_shops_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coffee_shops_is_featured ON public.shops USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_coffee_shops_kyc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coffee_shops_kyc_status ON public.shops USING btree (kyc_status);


--
-- Name: idx_cor_history_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cor_history_request ON public.custom_order_status_history USING btree (request_id, created_at);


--
-- Name: idx_couriers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_couriers_shop ON public.couriers USING btree (shop_id);


--
-- Name: idx_couriers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_couriers_user ON public.couriers USING btree (user_id);


--
-- Name: idx_course_enrollments_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_enrollments_menu_item ON public.course_enrollments USING btree (menu_item_id);


--
-- Name: idx_course_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments USING btree (user_id);


--
-- Name: idx_course_lessons_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON public.course_lessons USING btree (module_id);


--
-- Name: idx_course_lessons_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_lessons_status ON public.course_lessons USING btree (status);


--
-- Name: idx_course_modules_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_modules_menu_item ON public.course_modules USING btree (menu_item_id);


--
-- Name: idx_course_modules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_modules_status ON public.course_modules USING btree (status);


--
-- Name: idx_cron_runs_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON public.cron_runs USING btree (job_name, started_at DESC);


--
-- Name: idx_cron_runs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON public.cron_runs USING btree (started_at DESC);


--
-- Name: idx_cust_memberships_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_memberships_active ON public.customer_memberships USING btree (customer_user_id, shop_id) WHERE (status = 'active'::text);


--
-- Name: idx_cust_memberships_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_memberships_shop ON public.customer_memberships USING btree (shop_id);


--
-- Name: idx_cust_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_memberships_user ON public.customer_memberships USING btree (customer_user_id);


--
-- Name: idx_custom_order_quotes_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_order_quotes_request ON public.custom_order_quotes USING btree (request_id, created_at DESC);


--
-- Name: idx_custom_order_requests_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_order_requests_contract ON public.custom_order_requests USING btree (contract_id);


--
-- Name: idx_custom_orders_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_orders_shop ON public.custom_order_requests USING btree (shop_id, created_at DESC);


--
-- Name: idx_custom_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_orders_user ON public.custom_order_requests USING btree (user_id, created_at DESC);


--
-- Name: idx_customer_addresses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON public.customer_addresses USING btree (user_id);


--
-- Name: idx_delivery_zones_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_delivery_zones_shop ON public.delivery_zones USING btree (shop_id);


--
-- Name: idx_disputes_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.order_disputes USING btree (order_id);


--
-- Name: idx_disputes_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_disputes_shop_status ON public.order_disputes USING btree (shop_id, status);


--
-- Name: idx_dva_shop_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dva_shop_time ON public.domain_verify_attempts USING btree (shop_id, created_at DESC);


--
-- Name: idx_expiry_reminder_shop_rules_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expiry_reminder_shop_rules_shop ON public.expiry_reminder_shop_rules USING btree (shop_id, audience, is_active);


--
-- Name: idx_flash_sales_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_flash_sales_shop ON public.flash_sales USING btree (shop_id);


--
-- Name: idx_flash_sales_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_flash_sales_window ON public.flash_sales USING btree (starts_at, ends_at);


--
-- Name: idx_flyers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_flyers_shop ON public.flyers USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_fnb_combos_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fnb_combos_shop ON public.fnb_combos USING btree (shop_id, sort_order);


--
-- Name: idx_freelance_contracts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_freelance_contracts_shop ON public.freelance_contracts USING btree (shop_id, created_at DESC);


--
-- Name: idx_freelance_contracts_sign_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_freelance_contracts_sign_token ON public.freelance_contracts USING btree (sign_token);


--
-- Name: idx_galleries_photographer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_galleries_photographer ON public.studio_galleries USING btree (photographer_id);


--
-- Name: idx_galleries_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_galleries_shop ON public.studio_galleries USING btree (shop_id);


--
-- Name: idx_galleries_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_galleries_token ON public.studio_galleries USING btree (share_token);


--
-- Name: idx_gallery_photos_gallery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON public.studio_gallery_photos USING btree (gallery_id);


--
-- Name: idx_ingredients_default_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ingredients_default_supplier ON public.ingredients USING btree (default_supplier_id);


--
-- Name: idx_ingredients_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ingredients_shop ON public.ingredients USING btree (shop_id);


--
-- Name: idx_jamaah_docs_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_jamaah_docs_expiry ON public.travel_jamaah_documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_jamaah_docs_jamaah; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_jamaah_docs_jamaah ON public.travel_jamaah_documents USING btree (jamaah_id);


--
-- Name: idx_job_deliverables_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_deliverables_shop ON public.job_deliverables USING btree (shop_id, created_at DESC);


--
-- Name: idx_job_deliverables_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_deliverables_token ON public.job_deliverables USING btree (delivery_token);


--
-- Name: idx_leads_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_shop ON public.leads USING btree (shop_id, status, created_at DESC);


--
-- Name: idx_lesson_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress USING btree (user_id);


--
-- Name: idx_loyalty_ledger_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user ON public.loyalty_ledger USING btree (user_id, shop_id);


--
-- Name: idx_medications_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_medications_shop ON public.medications USING btree (shop_id, is_active);


--
-- Name: idx_membership_tiers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_membership_tiers_shop ON public.shop_membership_tiers USING btree (shop_id) WHERE (is_active = true);


--
-- Name: idx_menu_item_variants_attributes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_attributes ON public.menu_item_variants USING gin (attributes);


--
-- Name: idx_menu_item_variants_barcode_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_barcode_shop ON public.menu_item_variants USING btree (shop_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_menu_item_variants_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON public.menu_item_variants USING btree (menu_item_id);


--
-- Name: idx_menu_item_variants_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_shop ON public.menu_item_variants USING btree (shop_id);


--
-- Name: idx_menu_item_variants_sku_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_sku_shop ON public.menu_item_variants USING btree (shop_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_menu_items_barcode_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_barcode_shop ON public.menu_items USING btree (shop_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_menu_items_flash_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_flash_active ON public.menu_items USING btree (flash_ends_at) WHERE (flash_price IS NOT NULL);


--
-- Name: idx_menu_items_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_is_featured ON public.menu_items USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_menu_items_item_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_item_type ON public.menu_items USING btree (item_type);


--
-- Name: idx_menu_items_preorder_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_preorder_window ON public.menu_items USING btree (is_pre_order, pre_order_close_at) WHERE (is_pre_order = true);


--
-- Name: idx_menu_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_shop ON public.menu_items USING btree (shop_id, category_id, sort_order);


--
-- Name: idx_menu_items_shop_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_shop_available ON public.menu_items USING btree (shop_id, is_available);


--
-- Name: idx_menu_items_sku_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_sku_shop ON public.menu_items USING btree (shop_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_menu_reviews_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_reviews_menu ON public.menu_reviews USING btree (menu_item_id, created_at DESC);


--
-- Name: idx_menu_reviews_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_reviews_shop ON public.menu_reviews USING btree (shop_id, created_at DESC);


--
-- Name: idx_menu_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_reviews_user ON public.menu_reviews USING btree (user_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications USING btree (recipient_user_id, created_at DESC);


--
-- Name: idx_notifications_recipient_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications USING btree (recipient_user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: idx_open_bills_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_open_bills_outlet ON public.open_bills USING btree (outlet_id, updated_at DESC);


--
-- Name: idx_option_groups_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_option_groups_menu_item ON public.menu_item_option_groups USING btree (menu_item_id);


--
-- Name: idx_options_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_options_group ON public.menu_item_options USING btree (group_id);


--
-- Name: idx_order_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_audit_log_actor ON public.order_audit_log USING btree (actor_id);


--
-- Name: idx_order_audit_log_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_audit_log_order ON public.order_audit_log USING btree (order_id);


--
-- Name: idx_order_audit_log_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_audit_log_shop_created ON public.order_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_messages_order_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_messages_order_created ON public.order_messages USING btree (order_id, created_at);


--
-- Name: idx_orders_channel_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_channel_status ON public.orders USING btree (channel, status);


--
-- Name: idx_orders_customer_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_customer_user ON public.orders USING btree (customer_user_id);


--
-- Name: idx_orders_escrow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders USING btree (escrow_status) WHERE (escrow_status = ANY (ARRAY['holding'::text, 'released'::text]));


--
-- Name: idx_orders_order_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_order_source ON public.orders USING btree (shop_id, business_date, order_source);


--
-- Name: idx_orders_outlet_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_outlet_date ON public.orders USING btree (outlet_id, business_date DESC, created_at DESC);


--
-- Name: idx_orders_outlet_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_outlet_status_created ON public.orders USING btree (outlet_id, status, created_at DESC);


--
-- Name: idx_orders_requires_deposit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_requires_deposit ON public.orders USING btree (shop_id, requires_deposit) WHERE (requires_deposit = true);


--
-- Name: idx_orders_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_shift ON public.orders USING btree (shift_id);


--
-- Name: idx_orders_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON public.orders USING btree (shop_id, created_at DESC);


--
-- Name: idx_orders_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders USING btree (tracking_number) WHERE (tracking_number IS NOT NULL);


--
-- Name: idx_outlet_couriers_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_outlet_couriers_outlet ON public.outlet_couriers USING btree (outlet_id, sort_order);


--
-- Name: idx_outlet_couriers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_outlet_couriers_shop ON public.outlet_couriers USING btree (shop_id);


--
-- Name: idx_owner_notif_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_notif_dedupe ON public.owner_notifications USING btree (shop_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: idx_owner_notif_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_owner_notif_shop ON public.owner_notifications USING btree (shop_id, created_at DESC);


--
-- Name: idx_owner_notif_shop_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_owner_notif_shop_dismissed ON public.owner_notifications USING btree (shop_id, dismissed_at) WHERE (dismissed_at IS NULL);


--
-- Name: idx_page_layout_versions_layout; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_page_layout_versions_layout ON public.page_layout_versions USING btree (layout_id, created_at DESC);


--
-- Name: idx_page_layouts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_page_layouts_scheduled ON public.page_layouts USING btree (scheduled_publish_at) WHERE ((scheduled_publish_at IS NOT NULL) AND (is_published = false));


--
-- Name: idx_parked_carts_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_parked_carts_outlet ON public.parked_carts USING btree (outlet_id, created_at DESC);


--
-- Name: idx_parked_carts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_parked_carts_shop ON public.parked_carts USING btree (shop_id);


--
-- Name: idx_patient_records_bpjs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_records_bpjs ON public.patient_records USING btree (shop_id, bpjs_number);


--
-- Name: idx_patient_records_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_records_shop ON public.patient_records USING btree (shop_id, patient_name);


--
-- Name: idx_patient_visits_icd10; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_visits_icd10 ON public.patient_visits USING btree (shop_id, icd10_code);


--
-- Name: idx_patient_visits_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON public.patient_visits USING btree (patient_id, visit_date DESC);


--
-- Name: idx_photographers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_photographers_shop ON public.studio_photographers USING btree (shop_id);


--
-- Name: idx_plan_subs_next_billing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_plan_subs_next_billing ON public.plan_subscriptions USING btree (next_billing_at) WHERE (status = 'active'::text);


--
-- Name: idx_po_audit_log_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_audit_log_po_id ON public.po_audit_log USING btree (po_id, created_at DESC);


--
-- Name: idx_po_audit_log_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_audit_log_shop_id ON public.po_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_po_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shop ON public.purchase_orders USING btree (shop_id, status);


--
-- Name: idx_poi_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poi_po ON public.purchase_order_items USING btree (po_id);


--
-- Name: idx_portfolio_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_portfolio_shop ON public.shop_portfolio USING btree (shop_id, sort_order);


--
-- Name: idx_pos_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pos_audit_action ON public.pos_audit_log USING btree (shop_id, action, created_at DESC);


--
-- Name: idx_pos_audit_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pos_audit_outlet ON public.pos_audit_log USING btree (outlet_id, created_at DESC);


--
-- Name: idx_pos_audit_shop_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pos_audit_shop_date ON public.pos_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_presc_items_presc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_presc_items_presc ON public.prescription_items USING btree (prescription_id);


--
-- Name: idx_prescriptions_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_prescriptions_shop ON public.prescriptions USING btree (shop_id, issued_at DESC);


--
-- Name: idx_printers_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_printers_outlet ON public.printers USING btree (outlet_id);


--
-- Name: idx_printers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_printers_shop ON public.printers USING btree (shop_id);


--
-- Name: idx_product_attribute_defs_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_attribute_defs_cat ON public.product_attribute_defs USING btree (category_id);


--
-- Name: idx_product_attribute_defs_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_attribute_defs_shop ON public.product_attribute_defs USING btree (shop_id);


--
-- Name: idx_product_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews USING btree (product_id, created_at DESC) WHERE (NOT is_hidden);


--
-- Name: idx_product_reviews_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_reviews_shop ON public.product_reviews USING btree (shop_id, created_at DESC) WHERE (NOT is_hidden);


--
-- Name: idx_product_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews USING btree (user_id, created_at DESC);


--
-- Name: idx_promo_red_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_promo_red_order ON public.promo_redemptions USING btree (order_id);


--
-- Name: idx_promo_red_promo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_promo_red_promo ON public.promo_redemptions USING btree (promo_id);


--
-- Name: idx_promos_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_promos_shop ON public.promos USING btree (shop_id);


--
-- Name: idx_push_subscriptions_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_shop ON public.push_subscriptions USING btree (shop_id);


--
-- Name: idx_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_pvr_voucher_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pvr_voucher_user ON public.platform_voucher_redemptions USING btree (voucher_id, user_id);


--
-- Name: idx_qa_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_product ON public.product_qa USING btree (product_id);


--
-- Name: idx_qa_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_shop ON public.product_qa USING btree (shop_id);


--
-- Name: idx_recipes_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON public.recipes USING btree (ingredient_id);


--
-- Name: idx_recipes_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recipes_menu ON public.recipes USING btree (menu_item_id);


--
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds USING btree (order_id);


--
-- Name: idx_refunds_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_refunds_shop ON public.refunds USING btree (shop_id);


--
-- Name: idx_rental_bookings_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_bookings_shop ON public.rental_bookings USING btree (shop_id, start_date);


--
-- Name: idx_rental_bookings_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_bookings_unit ON public.rental_bookings USING btree (unit_id, start_date, end_date);


--
-- Name: idx_rental_insp_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_insp_booking ON public.rental_inspections USING btree (booking_id);


--
-- Name: idx_rental_units_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_units_shop ON public.rental_units USING btree (shop_id);


--
-- Name: idx_reschedule_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_token ON public.booking_reschedule_tokens USING btree (token);


--
-- Name: idx_restock_sub_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_restock_sub_shop ON public.restock_subscribers USING btree (shop_id);


--
-- Name: idx_returns_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_returns_shop ON public.product_returns USING btree (shop_id, status);


--
-- Name: idx_sales_offerings_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_offerings_shop ON public.sales_offerings USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_service_bundle_items_bundle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_service_bundle_items_bundle ON public.service_bundle_items USING btree (bundle_id, sort_order);


--
-- Name: idx_service_bundles_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_service_bundles_shop ON public.service_bundles USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_shifts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_shop ON public.shifts USING btree (shop_id);


--
-- Name: idx_shifts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_user ON public.shifts USING btree (user_id);


--
-- Name: idx_shop_chat_messages_chat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_chat ON public.shop_chat_messages USING btree (chat_id, created_at);


--
-- Name: idx_shop_chat_messages_unread_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_unread_buyer ON public.shop_chat_messages USING btree (chat_id) WHERE ((read_at IS NULL) AND (sender_role = 'seller'::text));


--
-- Name: idx_shop_chats_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chats_buyer ON public.shop_chats USING btree (buyer_user_id, last_message_at DESC);


--
-- Name: idx_shop_chats_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chats_shop ON public.shop_chats USING btree (shop_id, last_message_at DESC);


--
-- Name: idx_shop_customers_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_customers_segment ON public.shop_customers USING btree (shop_id, segment);


--
-- Name: idx_shop_customers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_customers_shop ON public.shop_customers USING btree (shop_id);


--
-- Name: idx_shop_customers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_customers_user ON public.shop_customers USING btree (user_id);


--
-- Name: idx_shop_size_charts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_size_charts_shop ON public.shop_size_charts USING btree (shop_id);


--
-- Name: idx_shop_verifications_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_verifications_shop_id ON public.shop_verifications USING btree (shop_id);


--
-- Name: idx_shop_verifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_verifications_status ON public.shop_verifications USING btree (status);


--
-- Name: idx_shop_vouchers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_vouchers_shop ON public.shop_vouchers USING btree (shop_id);


--
-- Name: idx_staff_audit_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_audit_shop_created ON public.staff_audit_logs USING btree (shop_id, created_at DESC);


--
-- Name: idx_staff_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON public.staff_invitations USING btree (email);


--
-- Name: idx_staff_invitations_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_invitations_shop ON public.staff_invitations USING btree (shop_id);


--
-- Name: idx_staff_members_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_members_shop ON public.staff_members USING btree (shop_id);


--
-- Name: idx_staff_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_members_user ON public.staff_members USING btree (user_id);


--
-- Name: idx_stock_movements_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON public.stock_movements USING btree (ingredient_id, created_at DESC);


--
-- Name: idx_stock_movements_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON public.stock_movements USING btree (shop_id, created_at DESC);


--
-- Name: idx_stock_opname_items_opname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname ON public.stock_opname_items USING btree (stock_opname_id);


--
-- Name: idx_stock_opnames_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_opnames_shop ON public.stock_opnames USING btree (shop_id, created_at DESC);


--
-- Name: idx_studio_locations_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_studio_locations_shop ON public.studio_locations USING btree (shop_id, sort_order);


--
-- Name: idx_studio_packages_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_studio_packages_shop ON public.studio_packages USING btree (shop_id, sort_order);


--
-- Name: idx_system_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_system_audit_created ON public.system_audit USING btree (created_at DESC);


--
-- Name: idx_system_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_system_audit_event ON public.system_audit USING btree (event_type, created_at DESC);


--
-- Name: idx_system_audit_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_system_audit_shop ON public.system_audit USING btree (shop_id, created_at DESC);


--
-- Name: idx_testimonials_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_testimonials_shop ON public.testimonials USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_topup_presets_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topup_presets_shop ON public.wallet_topup_presets USING btree (shop_id) WHERE (is_active = true);


--
-- Name: idx_topups_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topups_shop ON public.wallet_topups USING btree (shop_id, created_at DESC);


--
-- Name: idx_topups_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topups_status ON public.wallet_topups USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_topups_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topups_user ON public.wallet_topups USING btree (customer_user_id, created_at DESC);


--
-- Name: idx_travel_inst_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_inst_shop ON public.travel_installments USING btree (shop_id);


--
-- Name: idx_travel_itineraries_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_itineraries_pkg ON public.travel_itineraries USING btree (package_id, day_number, sort_order);


--
-- Name: idx_travel_manifest_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_manifest_pkg ON public.travel_jamaah_manifest USING btree (package_id);


--
-- Name: idx_travel_manifest_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_manifest_shop ON public.travel_jamaah_manifest USING btree (shop_id);


--
-- Name: idx_treatments_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_treatments_shop ON public.customer_treatments USING btree (shop_id, performed_at DESC);


--
-- Name: idx_umroh_facilities_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_umroh_facilities_shop ON public.umroh_facilities USING btree (shop_id, sort_order);


--
-- Name: idx_umroh_faqs_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_umroh_faqs_shop ON public.umroh_faqs USING btree (shop_id, category, sort_order);


--
-- Name: idx_umroh_packages_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_umroh_packages_shop ON public.umroh_packages USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_upsell_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_upsell_product ON public.product_upsell_suggestions USING btree (product_id, "position");


--
-- Name: idx_upsell_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_upsell_shop ON public.product_upsell_suggestions USING btree (shop_id);


--
-- Name: idx_upsell_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_upsell_source ON public.product_upsell_suggestions USING btree (source);


--
-- Name: idx_waitlist_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_waitlist_shop_status ON public.booking_waitlist USING btree (shop_id, status);


--
-- Name: idx_wallet_tx_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.customer_wallet_transactions USING btree (customer_user_id, created_at DESC);


--
-- Name: idx_wallet_tx_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.customer_wallet_transactions USING btree (wallet_id, created_at DESC);


--
-- Name: idx_wallet_txn_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_order ON public.wallet_transactions USING btree (order_id);


--
-- Name: idx_wallet_txn_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_shop_created ON public.wallet_transactions USING btree (shop_id, created_at DESC);


--
-- Name: idx_webhook_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON public.webhook_events USING btree (created_at DESC);


--
-- Name: idx_wishlists_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wishlists_menu_item ON public.wishlists USING btree (menu_item_id);


--
-- Name: idx_wishlists_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists USING btree (user_id);


--
-- Name: idx_withdrawals_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawals_shop_status ON public.withdrawal_requests USING btree (shop_id, status, created_at DESC);


--
-- Name: idx_withdrawals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests USING btree (status, created_at DESC);


--
-- Name: orders_courier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS orders_courier_id_idx ON public.orders USING btree (courier_id);


--
-- Name: orders_shop_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS orders_shop_status_idx ON public.orders USING btree (shop_id, status);


--
-- Name: page_layouts_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS page_layouts_published_idx ON public.page_layouts USING btree (shop_id, page_type) WHERE (is_published = true);


--
-- Name: page_layouts_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS page_layouts_shop_idx ON public.page_layouts USING btree (shop_id);


--
-- Name: page_layouts_shop_page_slug_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS page_layouts_shop_page_slug_uniq ON public.page_layouts USING btree (shop_id, page_type, COALESCE(slug, ''::text));


--
-- Name: plan_invoices_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS plan_invoices_shop_idx ON public.plan_invoices USING btree (shop_id);


--
-- Name: plan_invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS plan_invoices_status_idx ON public.plan_invoices USING btree (status);


--
-- Name: shop_backups_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS shop_backups_shop_idx ON public.shop_backups USING btree (shop_id, created_at DESC);


--
-- Name: uq_orders_idem_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idem_shop ON public.orders USING btree (shop_id, client_idempotency_key) WHERE (client_idempotency_key IS NOT NULL);


--
-- Name: uq_orders_outlet_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_outlet_order_no ON public.orders USING btree (outlet_id, order_no);


--
-- Name: menu_hpp_view _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.menu_hpp_view WITH (security_invoker='true') AS
 SELECT m.id AS menu_item_id,
    m.shop_id,
    m.name,
    m.price,
    COALESCE(sum((r.quantity * i.cost_per_unit)), (0)::numeric) AS hpp,
    (m.price - COALESCE(sum((r.quantity * i.cost_per_unit)), (0)::numeric)) AS margin,
        CASE
            WHEN (m.price > (0)::numeric) THEN round((((m.price - COALESCE(sum((r.quantity * i.cost_per_unit)), (0)::numeric)) / m.price) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS margin_percent,
    GREATEST(m.updated_at, COALESCE(max(i.updated_at), m.updated_at)) AS last_updated,
    count(r.id) AS recipe_count
   FROM ((public.menu_items m
     LEFT JOIN public.recipes r ON ((r.menu_item_id = m.id)))
     LEFT JOIN public.ingredients i ON ((i.id = r.ingredient_id)))
  GROUP BY m.id;


--
-- Name: backup_schedules backup_schedules_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS backup_schedules_touch_updated_at ON public.backup_schedules;
CREATE TRIGGER backup_schedules_touch_updated_at BEFORE UPDATE ON public.backup_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: cash_shifts cash_shifts_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS cash_shifts_touch ON public.cash_shifts;
CREATE TRIGGER cash_shifts_touch BEFORE UPDATE ON public.cash_shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: categories categories_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS categories_touch ON public.categories;
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: loyalty_settings loyalty_settings_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS loyalty_settings_touch ON public.loyalty_settings;
CREATE TRIGGER loyalty_settings_touch BEFORE UPDATE ON public.loyalty_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: menu_items menu_items_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS menu_items_touch ON public.menu_items;
CREATE TRIGGER menu_items_touch BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: open_bills open_bills_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS open_bills_touch ON public.open_bills;
CREATE TRIGGER open_bills_touch BEFORE UPDATE ON public.open_bills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders orders_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS orders_touch ON public.orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: plan_invoices plan_invoices_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS plan_invoices_touch ON public.plan_invoices;
CREATE TRIGGER plan_invoices_touch BEFORE UPDATE ON public.plan_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: plans plans_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS plans_touch ON public.plans;
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: promos promos_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS promos_touch ON public.promos;
CREATE TRIGGER promos_touch BEFORE UPDATE ON public.promos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: push_subscriptions push_subscriptions_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS push_subscriptions_touch ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_touch BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shop_verifications shop_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS shop_verifications_updated_at ON public.shop_verifications;
CREATE TRIGGER shop_verifications_updated_at BEFORE UPDATE ON public.shop_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_requests trg_ad_requests_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_ad_requests_updated ON public.ad_requests;
CREATE TRIGGER trg_ad_requests_updated BEFORE UPDATE ON public.ad_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: stock_movements trg_apply_stock_movement; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();


--
-- Name: attendances trg_attendances_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_attendances_updated ON public.attendances;
CREATE TRIGGER trg_attendances_updated BEFORE UPDATE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders trg_auto_release_escrow; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_auto_release_escrow ON public.orders;
CREATE TRIGGER trg_auto_release_escrow AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_release_escrow_on_complete();


--
-- Name: booking_slots trg_booking_slots_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_booking_slots_updated ON public.booking_slots;
CREATE TRIGGER trg_booking_slots_updated BEFORE UPDATE ON public.booking_slots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bookings trg_bookings_fill_shop; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_bookings_fill_shop ON public.bookings;
CREATE TRIGGER trg_bookings_fill_shop BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_fill_shop_id();


--
-- Name: bookings trg_bookings_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_bookings_updated ON public.bookings;
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: attendances trg_calc_attendance_duration; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_calc_attendance_duration ON public.attendances;
CREATE TRIGGER trg_calc_attendance_duration BEFORE INSERT OR UPDATE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.calc_attendance_duration();


--
-- Name: marketplace_cart_items trg_cart_items_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cart_items_updated ON public.marketplace_cart_items;
CREATE TRIGGER trg_cart_items_updated BEFORE UPDATE ON public.marketplace_cart_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: marketplace_carts trg_carts_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_carts_updated ON public.marketplace_carts;
CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.marketplace_carts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bookings trg_check_booking_capacity; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_check_booking_capacity ON public.bookings;
CREATE TRIGGER trg_check_booking_capacity BEFORE INSERT OR UPDATE OF slot_id, party_size, status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.check_booking_capacity();


--
-- Name: order_items trg_consume_stock_for_order_item; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_consume_stock_for_order_item ON public.order_items;
CREATE TRIGGER trg_consume_stock_for_order_item AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.consume_stock_for_order_item();


--
-- Name: custom_order_requests trg_cor_status_history_ins; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cor_status_history_ins ON public.custom_order_requests;
CREATE TRIGGER trg_cor_status_history_ins AFTER INSERT ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.log_custom_order_status_change();


--
-- Name: custom_order_requests trg_cor_status_history_upd; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cor_status_history_upd ON public.custom_order_requests;
CREATE TRIGGER trg_cor_status_history_upd AFTER UPDATE OF status ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.log_custom_order_status_change();


--
-- Name: couriers trg_couriers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_couriers_updated ON public.couriers;
CREATE TRIGGER trg_couriers_updated BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_memberships trg_cust_memberships_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cust_memberships_updated ON public.customer_memberships;
CREATE TRIGGER trg_cust_memberships_updated BEFORE UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_wallets trg_cust_wallets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cust_wallets_updated ON public.customer_wallets;
CREATE TRIGGER trg_cust_wallets_updated BEFORE UPDATE ON public.customer_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: custom_order_quotes trg_custom_order_quotes_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_custom_order_quotes_updated ON public.custom_order_quotes;
CREATE TRIGGER trg_custom_order_quotes_updated BEFORE UPDATE ON public.custom_order_quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_addresses trg_customer_addresses_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_customer_addresses_updated ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_updated BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_profiles trg_customer_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_customer_profiles_updated ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: delivery_settings trg_delivery_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_delivery_settings_updated ON public.delivery_settings;
CREATE TRIGGER trg_delivery_settings_updated BEFORE UPDATE ON public.delivery_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: delivery_zones trg_delivery_zones_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_delivery_zones_updated ON public.delivery_zones;
CREATE TRIGGER trg_delivery_zones_updated BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: order_disputes trg_disputes_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_disputes_updated ON public.order_disputes;
CREATE TRIGGER trg_disputes_updated BEFORE UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders trg_enforce_qr_table_lock; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_enforce_qr_table_lock ON public.orders;
CREATE TRIGGER trg_enforce_qr_table_lock BEFORE UPDATE OF table_label, order_source ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_qr_table_lock();


--
-- Name: features trg_features_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_features_touch ON public.features;
CREATE TRIGGER trg_features_touch BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: flyers trg_flyers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_flyers_updated ON public.flyers;
CREATE TRIGGER trg_flyers_updated BEFORE UPDATE ON public.flyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: studio_galleries trg_galleries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_galleries_updated_at ON public.studio_galleries;
CREATE TRIGGER trg_galleries_updated_at BEFORE UPDATE ON public.studio_galleries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ingredients trg_ingredients_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_ingredients_updated ON public.ingredients;
CREATE TRIGGER trg_ingredients_updated BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: lesson_progress trg_issue_course_certificate; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_issue_course_certificate ON public.lesson_progress;
CREATE TRIGGER trg_issue_course_certificate AFTER INSERT OR UPDATE OF completed_at ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.fn_issue_course_certificate();


--
-- Name: travel_jamaah_documents trg_jamaah_docs_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_jamaah_docs_updated ON public.travel_jamaah_documents;
CREATE TRIGGER trg_jamaah_docs_updated BEFORE UPDATE ON public.travel_jamaah_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_deliverables trg_job_deliverables_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_job_deliverables_updated ON public.job_deliverables;
CREATE TRIGGER trg_job_deliverables_updated BEFORE UPDATE ON public.job_deliverables FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: leads trg_leads_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_leads_updated ON public.leads;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts trg_log_shift_change; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_log_shift_change ON public.shifts;
CREATE TRIGGER trg_log_shift_change AFTER INSERT OR DELETE OR UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.log_shift_change();


--
-- Name: medications trg_medications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_medications_updated_at ON public.medications;
CREATE TRIGGER trg_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_membership_tiers trg_membership_tiers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_membership_tiers_updated ON public.shop_membership_tiers;
CREATE TRIGGER trg_membership_tiers_updated BEFORE UPDATE ON public.shop_membership_tiers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: order_disputes trg_notify_dispute_event; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_dispute_event ON public.order_disputes;
CREATE TRIGGER trg_notify_dispute_event AFTER INSERT OR UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_event();


--
-- Name: ingredients trg_notify_low_stock; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.ingredients;
CREATE TRIGGER trg_notify_low_stock AFTER INSERT OR UPDATE OF current_stock, min_stock ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();


--
-- Name: customer_memberships trg_notify_membership; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_membership ON public.customer_memberships;
CREATE TRIGGER trg_notify_membership AFTER INSERT ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.notify_membership_event();


--
-- Name: orders trg_notify_new_marketplace_order; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_new_marketplace_order ON public.orders;
CREATE TRIGGER trg_notify_new_marketplace_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_marketplace_order();


--
-- Name: orders trg_notify_order_status_change; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: wallet_topups trg_notify_wallet_topup; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_wallet_topup ON public.wallet_topups;
CREATE TRIGGER trg_notify_wallet_topup AFTER INSERT OR UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_topup_event();


--
-- Name: withdrawal_requests trg_notify_withdrawal_status; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER trg_notify_withdrawal_status AFTER UPDATE OF status ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();


--
-- Name: outlet_couriers trg_outlet_couriers_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_outlet_couriers_touch ON public.outlet_couriers;
CREATE TRIGGER trg_outlet_couriers_touch BEFORE UPDATE ON public.outlet_couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: outlets trg_outlets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_outlets_updated ON public.outlets;
CREATE TRIGGER trg_outlets_updated BEFORE UPDATE ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: parked_carts trg_parked_carts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_parked_carts_updated_at ON public.parked_carts;
CREATE TRIGGER trg_parked_carts_updated_at BEFORE UPDATE ON public.parked_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patient_records trg_patient_records_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_patient_records_updated ON public.patient_records;
CREATE TRIGGER trg_patient_records_updated BEFORE UPDATE ON public.patient_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: studio_photographers trg_photographers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_photographers_updated_at ON public.studio_photographers;
CREATE TRIGGER trg_photographers_updated_at BEFORE UPDATE ON public.studio_photographers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_vouchers trg_platform_vouchers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_platform_vouchers_updated ON public.platform_vouchers;
CREATE TRIGGER trg_platform_vouchers_updated BEFORE UPDATE ON public.platform_vouchers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: purchase_orders trg_po_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_po_updated ON public.purchase_orders;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: user_preferences trg_prefs_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_prefs_updated ON public.user_preferences;
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: prescriptions trg_prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_qa trg_product_qa_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_product_qa_updated ON public.product_qa;
CREATE TRIGGER trg_product_qa_updated BEFORE UPDATE ON public.product_qa FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: product_reviews trg_product_reviews_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_product_reviews_updated ON public.product_reviews;
CREATE TRIGGER trg_product_reviews_updated BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles trg_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: product_reviews trg_refresh_product_rating; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_refresh_product_rating ON public.product_reviews;
CREATE TRIGGER trg_refresh_product_rating AFTER INSERT OR DELETE OR UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();


--
-- Name: restock_subscribers trg_restock_sub_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_restock_sub_updated ON public.restock_subscribers;
CREATE TRIGGER trg_restock_sub_updated BEFORE UPDATE ON public.restock_subscribers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: sales_offerings trg_sales_offerings_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_sales_offerings_updated ON public.sales_offerings;
CREATE TRIGGER trg_sales_offerings_updated BEFORE UPDATE ON public.sales_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings trg_set_booking_type; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_set_booking_type ON public.bookings;
CREATE TRIGGER trg_set_booking_type BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_type_from_slot();


--
-- Name: orders trg_set_order_no; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_set_order_no ON public.orders;
CREATE TRIGGER trg_set_order_no BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_no();


--
-- Name: shifts trg_shifts_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shifts_updated ON public.shifts;
CREATE TRIGGER trg_shifts_updated BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shop_about trg_shop_about_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shop_about_updated ON public.shop_about;
CREATE TRIGGER trg_shop_about_updated BEFORE UPDATE ON public.shop_about FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_chat_messages trg_shop_chat_last_msg; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shop_chat_last_msg ON public.shop_chat_messages;
CREATE TRIGGER trg_shop_chat_last_msg AFTER INSERT ON public.shop_chat_messages FOR EACH ROW EXECUTE FUNCTION public.shop_chat_set_last_message_at();


--
-- Name: shop_wallets trg_shop_wallets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shop_wallets_updated ON public.shop_wallets;
CREATE TRIGGER trg_shop_wallets_updated BEFORE UPDATE ON public.shop_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shops trg_shops_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shops_updated ON public.shops;
CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: studio_locations trg_studio_locations_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_studio_locations_updated ON public.studio_locations;
CREATE TRIGGER trg_studio_locations_updated BEFORE UPDATE ON public.studio_locations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: suppliers trg_suppliers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: testimonials trg_testimonials_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_testimonials_updated ON public.testimonials;
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: themes trg_themes_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_themes_touch ON public.themes;
CREATE TRIGGER trg_themes_touch BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: wallet_topup_presets trg_topup_presets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_topup_presets_updated ON public.wallet_topup_presets;
CREATE TRIGGER trg_topup_presets_updated BEFORE UPDATE ON public.wallet_topup_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: travel_installments trg_travel_inst_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_travel_inst_updated_at ON public.travel_installments;
CREATE TRIGGER trg_travel_inst_updated_at BEFORE UPDATE ON public.travel_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_itineraries trg_travel_itineraries_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_travel_itineraries_updated ON public.travel_itineraries;
CREATE TRIGGER trg_travel_itineraries_updated BEFORE UPDATE ON public.travel_itineraries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_jamaah_manifest trg_travel_manifest_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_travel_manifest_updated_at ON public.travel_jamaah_manifest;
CREATE TRIGGER trg_travel_manifest_updated_at BEFORE UPDATE ON public.travel_jamaah_manifest FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_facilities trg_umroh_facilities_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_umroh_facilities_updated ON public.umroh_facilities;
CREATE TRIGGER trg_umroh_facilities_updated BEFORE UPDATE ON public.umroh_facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_faqs trg_umroh_faqs_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_umroh_faqs_updated ON public.umroh_faqs;
CREATE TRIGGER trg_umroh_faqs_updated BEFORE UPDATE ON public.umroh_faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_packages trg_umroh_packages_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_umroh_packages_updated ON public.umroh_packages;
CREATE TRIGGER trg_umroh_packages_updated BEFORE UPDATE ON public.umroh_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_chat_messages trg_update_shop_chat_last_message; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_shop_chat_last_message ON public.shop_chat_messages;
CREATE TRIGGER trg_update_shop_chat_last_message AFTER INSERT ON public.shop_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_shop_chat_last_message();


--
-- Name: product_upsell_suggestions trg_upsell_fill_shop; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_upsell_fill_shop ON public.product_upsell_suggestions;
CREATE TRIGGER trg_upsell_fill_shop BEFORE INSERT ON public.product_upsell_suggestions FOR EACH ROW EXECUTE FUNCTION public.upsell_fill_shop_id();


--
-- Name: product_upsell_suggestions trg_upsell_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_upsell_updated_at ON public.product_upsell_suggestions;
CREATE TRIGGER trg_upsell_updated_at BEFORE UPDATE ON public.product_upsell_suggestions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders trg_upsert_shop_customer; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_upsert_shop_customer ON public.orders;
CREATE TRIGGER trg_upsert_shop_customer AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.upsert_shop_customer_on_order();


--
-- Name: business_categories trg_validate_business_category_flow_types; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_business_category_flow_types ON public.business_categories;
CREATE TRIGGER trg_validate_business_category_flow_types BEFORE INSERT OR UPDATE ON public.business_categories FOR EACH ROW EXECUTE FUNCTION public.validate_business_category_flow_types();


--
-- Name: plan_features trg_validate_plan_feature_min_months; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_plan_feature_min_months ON public.plan_features;
CREATE TRIGGER trg_validate_plan_feature_min_months BEFORE INSERT OR UPDATE ON public.plan_features FOR EACH ROW EXECUTE FUNCTION public.validate_plan_feature_min_months();


--
-- Name: plan_themes trg_validate_plan_theme_min_months; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_plan_theme_min_months ON public.plan_themes;
CREATE TRIGGER trg_validate_plan_theme_min_months BEFORE INSERT OR UPDATE ON public.plan_themes FOR EACH ROW EXECUTE FUNCTION public.validate_plan_theme_min_months();


--
-- Name: shifts trg_validate_shift_no_overlap; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_shift_no_overlap ON public.shifts;
CREATE TRIGGER trg_validate_shift_no_overlap BEFORE INSERT OR UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.validate_shift_no_overlap();


--
-- Name: wallet_topups trg_wallet_topups_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_wallet_topups_updated ON public.wallet_topups;
CREATE TRIGGER trg_wallet_topups_updated BEFORE UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: withdrawal_requests trg_withdrawals_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_withdrawals_updated ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: banners update_banners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bulk_pricing_rules update_bulk_pricing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_bulk_pricing_rules_updated_at ON public.bulk_pricing_rules;
CREATE TRIGGER update_bulk_pricing_rules_updated_at BEFORE UPDATE ON public.bulk_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_order_requests update_custom_order_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_custom_order_requests_updated_at ON public.custom_order_requests;
CREATE TRIGGER update_custom_order_requests_updated_at BEFORE UPDATE ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_segments update_customer_segments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_customer_segments_updated_at ON public.customer_segments;
CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_rules update_expiry_reminder_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_expiry_reminder_rules_updated_at ON public.expiry_reminder_rules;
CREATE TRIGGER update_expiry_reminder_rules_updated_at BEFORE UPDATE ON public.expiry_reminder_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_shop_rules update_expiry_reminder_shop_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_expiry_reminder_shop_rules_updated_at ON public.expiry_reminder_shop_rules;
CREATE TRIGGER update_expiry_reminder_shop_rules_updated_at BEFORE UPDATE ON public.expiry_reminder_shop_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_shop_settings update_expiry_reminder_shop_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_expiry_reminder_shop_settings_updated_at ON public.expiry_reminder_shop_settings;
CREATE TRIGGER update_expiry_reminder_shop_settings_updated_at BEFORE UPDATE ON public.expiry_reminder_shop_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: flash_sales update_flash_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_flash_sales_updated_at ON public.flash_sales;
CREATE TRIGGER update_flash_sales_updated_at BEFORE UPDATE ON public.flash_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketing_campaigns update_marketing_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_variants update_menu_item_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_menu_item_variants_updated_at ON public.menu_item_variants;
CREATE TRIGGER update_menu_item_variants_updated_at BEFORE UPDATE ON public.menu_item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_reviews update_menu_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_menu_reviews_updated_at ON public.menu_reviews;
CREATE TRIGGER update_menu_reviews_updated_at BEFORE UPDATE ON public.menu_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_option_groups update_option_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_option_groups_updated_at ON public.menu_item_option_groups;
CREATE TRIGGER update_option_groups_updated_at BEFORE UPDATE ON public.menu_item_option_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_options update_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_options_updated_at ON public.menu_item_options;
CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON public.menu_item_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: page_layouts update_page_layouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_page_layouts_updated_at ON public.page_layouts;
CREATE TRIGGER update_page_layouts_updated_at BEFORE UPDATE ON public.page_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plan_subscriptions update_plan_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_plan_subscriptions_updated_at ON public.plan_subscriptions;
CREATE TRIGGER update_plan_subscriptions_updated_at BEFORE UPDATE ON public.plan_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: printers update_printers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_printers_updated_at ON public.printers;
CREATE TRIGGER update_printers_updated_at BEFORE UPDATE ON public.printers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_attribute_defs update_product_attribute_defs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_product_attribute_defs_updated_at ON public.product_attribute_defs;
CREATE TRIGGER update_product_attribute_defs_updated_at BEFORE UPDATE ON public.product_attribute_defs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_bundles update_service_bundles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_service_bundles_updated_at ON public.service_bundles;
CREATE TRIGGER update_service_bundles_updated_at BEFORE UPDATE ON public.service_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_customers update_shop_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_shop_customers_updated_at ON public.shop_customers;
CREATE TRIGGER update_shop_customers_updated_at BEFORE UPDATE ON public.shop_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_vouchers update_shop_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_shop_vouchers_updated_at ON public.shop_vouchers;
CREATE TRIGGER update_shop_vouchers_updated_at BEFORE UPDATE ON public.shop_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_members update_staff_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_staff_members_updated_at ON public.staff_members;
CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_opnames update_stock_opnames_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_stock_opnames_updated_at ON public.stock_opnames;
CREATE TRIGGER update_stock_opnames_updated_at BEFORE UPDATE ON public.stock_opnames FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- BEGIN: 03_constraints_foreign_keys.sql
-- =============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ad_requests ad_requests_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_requests DROP CONSTRAINT IF EXISTS ad_requests_shop_id_fkey;
ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_review_requests booking_review_requests_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_review_requests DROP CONSTRAINT IF EXISTS booking_review_requests_booking_id_fkey;
ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_reviews booking_reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews DROP CONSTRAINT IF EXISTS booking_reviews_booking_id_fkey;
ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_reviews booking_reviews_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews DROP CONSTRAINT IF EXISTS booking_reviews_shop_id_fkey;
ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_slots booking_slots_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_slots DROP CONSTRAINT IF EXISTS booking_slots_shop_id_fkey;
ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT booking_slots_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_waitlist booking_waitlist_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist DROP CONSTRAINT IF EXISTS booking_waitlist_shop_id_fkey;
ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_waitlist booking_waitlist_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist DROP CONSTRAINT IF EXISTS booking_waitlist_slot_id_fkey;
ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_location_id_fkey;
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.studio_locations(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_photographer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_photographer_id_fkey;
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.studio_photographers(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_shop_id_fkey;
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_slot_id_fkey;
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE RESTRICT;


--
-- Name: bulk_pricing_rules bulk_pricing_rules_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_pricing_rules DROP CONSTRAINT IF EXISTS bulk_pricing_rules_menu_item_id_fkey;
ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: bulk_pricing_rules bulk_pricing_rules_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_pricing_rules DROP CONSTRAINT IF EXISTS bulk_pricing_rules_shop_id_fkey;
ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: bundle_items bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items DROP CONSTRAINT IF EXISTS bundle_items_bundle_id_fkey;
ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: bundle_items bundle_items_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items DROP CONSTRAINT IF EXISTS bundle_items_component_id_fkey;
ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;


--
-- Name: campaign_recipients campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients DROP CONSTRAINT IF EXISTS campaign_recipients_campaign_id_fkey;
ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;


--
-- Name: cash_movements cash_movements_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements DROP CONSTRAINT IF EXISTS cash_movements_shift_id_fkey;
ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE CASCADE;


--
-- Name: categories categories_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories DROP CONSTRAINT IF EXISTS categories_printer_id_fkey;
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON DELETE SET NULL;


--
-- Name: categories categories_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories DROP CONSTRAINT IF EXISTS categories_shop_id_fkey;
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shops coffee_shops_business_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops DROP CONSTRAINT IF EXISTS coffee_shops_business_category_id_fkey;
ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_business_category_id_fkey FOREIGN KEY (business_category_id) REFERENCES public.business_categories(id);


--
-- Name: shops coffee_shops_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops DROP CONSTRAINT IF EXISTS coffee_shops_owner_id_fkey;
ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_certificates course_certificates_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates DROP CONSTRAINT IF EXISTS course_certificates_course_id_fkey;
ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: course_certificates course_certificates_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates DROP CONSTRAINT IF EXISTS course_certificates_shop_id_fkey;
ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_menu_item_id_fkey;
ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: course_lessons course_lessons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons DROP CONSTRAINT IF EXISTS course_lessons_module_id_fkey;
ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id) ON DELETE CASCADE;


--
-- Name: course_modules course_modules_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules DROP CONSTRAINT IF EXISTS course_modules_menu_item_id_fkey;
ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: custom_order_quotes custom_order_quotes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_quotes DROP CONSTRAINT IF EXISTS custom_order_quotes_request_id_fkey;
ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_order_requests(id) ON DELETE CASCADE;


--
-- Name: custom_order_quotes custom_order_quotes_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_quotes DROP CONSTRAINT IF EXISTS custom_order_quotes_shop_id_fkey;
ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: custom_order_requests custom_order_requests_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests DROP CONSTRAINT IF EXISTS custom_order_requests_contract_id_fkey;
ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.freelance_contracts(id) ON DELETE SET NULL;


--
-- Name: custom_order_requests custom_order_requests_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests DROP CONSTRAINT IF EXISTS custom_order_requests_product_id_fkey;
ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: custom_order_requests custom_order_requests_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests DROP CONSTRAINT IF EXISTS custom_order_requests_shop_id_fkey;
ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: custom_order_status_history custom_order_status_history_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_status_history DROP CONSTRAINT IF EXISTS custom_order_status_history_request_id_fkey;
ALTER TABLE ONLY public.custom_order_status_history
    ADD CONSTRAINT custom_order_status_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_order_requests(id) ON DELETE CASCADE;


--
-- Name: customer_memberships customer_memberships_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships DROP CONSTRAINT IF EXISTS customer_memberships_shop_id_fkey;
ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: customer_memberships customer_memberships_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships DROP CONSTRAINT IF EXISTS customer_memberships_tier_id_fkey;
ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.shop_membership_tiers(id) ON DELETE RESTRICT;


--
-- Name: customer_treatments customer_treatments_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_treatments DROP CONSTRAINT IF EXISTS customer_treatments_customer_user_id_fkey;
ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: customer_treatments customer_treatments_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_treatments DROP CONSTRAINT IF EXISTS customer_treatments_shop_id_fkey;
ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: customer_wallet_transactions customer_wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallet_transactions DROP CONSTRAINT IF EXISTS customer_wallet_transactions_wallet_id_fkey;
ALTER TABLE ONLY public.customer_wallet_transactions
    ADD CONSTRAINT customer_wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.customer_wallets(id) ON DELETE CASCADE;


--
-- Name: customer_wallets customer_wallets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets DROP CONSTRAINT IF EXISTS customer_wallets_shop_id_fkey;
ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: domain_audit domain_audit_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_audit DROP CONSTRAINT IF EXISTS domain_audit_shop_id_fkey;
ALTER TABLE ONLY public.domain_audit
    ADD CONSTRAINT domain_audit_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: expiry_reminder_shop_rules expiry_reminder_shop_rules_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_rules DROP CONSTRAINT IF EXISTS expiry_reminder_shop_rules_shop_id_fkey;
ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: expiry_reminder_shop_settings expiry_reminder_shop_settings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_settings DROP CONSTRAINT IF EXISTS expiry_reminder_shop_settings_shop_id_fkey;
ALTER TABLE ONLY public.expiry_reminder_shop_settings
    ADD CONSTRAINT expiry_reminder_shop_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: flash_sales flash_sales_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flash_sales DROP CONSTRAINT IF EXISTS flash_sales_menu_item_id_fkey;
ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: flash_sales flash_sales_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flash_sales DROP CONSTRAINT IF EXISTS flash_sales_shop_id_fkey;
ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: flyers flyers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyers DROP CONSTRAINT IF EXISTS flyers_shop_id_fkey;
ALTER TABLE ONLY public.flyers
    ADD CONSTRAINT flyers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: fnb_combos fnb_combos_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fnb_combos DROP CONSTRAINT IF EXISTS fnb_combos_shop_id_fkey;
ALTER TABLE ONLY public.fnb_combos
    ADD CONSTRAINT fnb_combos_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: freelance_contracts freelance_contracts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelance_contracts DROP CONSTRAINT IF EXISTS freelance_contracts_shop_id_fkey;
ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: ingredients ingredients_default_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients DROP CONSTRAINT IF EXISTS ingredients_default_supplier_id_fkey;
ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_default_supplier_id_fkey FOREIGN KEY (default_supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: job_deliverables job_deliverables_custom_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_deliverables DROP CONSTRAINT IF EXISTS job_deliverables_custom_order_id_fkey;
ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_custom_order_id_fkey FOREIGN KEY (custom_order_id) REFERENCES public.custom_order_requests(id) ON DELETE SET NULL;


--
-- Name: job_deliverables job_deliverables_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_deliverables DROP CONSTRAINT IF EXISTS job_deliverables_shop_id_fkey;
ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: leads leads_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads DROP CONSTRAINT IF EXISTS leads_shop_id_fkey;
ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_lesson_id_fkey;
ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON DELETE CASCADE;


--
-- Name: marketplace_cart_items marketplace_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items DROP CONSTRAINT IF EXISTS marketplace_cart_items_cart_id_fkey;
ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.marketplace_carts(id) ON DELETE CASCADE;


--
-- Name: marketplace_cart_items marketplace_cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items DROP CONSTRAINT IF EXISTS marketplace_cart_items_product_id_fkey;
ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: marketplace_cart_items marketplace_cart_items_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items DROP CONSTRAINT IF EXISTS marketplace_cart_items_shop_id_fkey;
ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: marketplace_carts marketplace_carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_carts DROP CONSTRAINT IF EXISTS marketplace_carts_user_id_fkey;
ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: medications medications_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications DROP CONSTRAINT IF EXISTS medications_shop_id_fkey;
ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: menu_item_options menu_item_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_options DROP CONSTRAINT IF EXISTS menu_item_options_group_id_fkey;
ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.menu_item_option_groups(id) ON DELETE CASCADE;


--
-- Name: menu_item_variants menu_item_variants_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants DROP CONSTRAINT IF EXISTS menu_item_variants_menu_item_id_fkey;
ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_item_variants menu_item_variants_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants DROP CONSTRAINT IF EXISTS menu_item_variants_shop_id_fkey;
ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_shop_id_fkey;
ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: open_bills open_bills_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_bills DROP CONSTRAINT IF EXISTS open_bills_outlet_id_fkey;
ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: open_bills open_bills_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_bills DROP CONSTRAINT IF EXISTS open_bills_shop_id_fkey;
ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: order_audit_log order_audit_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log DROP CONSTRAINT IF EXISTS order_audit_log_order_id_fkey;
ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: order_audit_log order_audit_log_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log DROP CONSTRAINT IF EXISTS order_audit_log_outlet_id_fkey;
ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: order_audit_log order_audit_log_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log DROP CONSTRAINT IF EXISTS order_audit_log_shop_id_fkey;
ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_membership_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders DROP CONSTRAINT IF EXISTS orders_membership_tier_id_fkey;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_membership_tier_id_fkey FOREIGN KEY (membership_tier_id) REFERENCES public.shop_membership_tiers(id) ON DELETE SET NULL;


--
-- Name: orders orders_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders DROP CONSTRAINT IF EXISTS orders_outlet_id_fkey;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: orders orders_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders DROP CONSTRAINT IF EXISTS orders_shop_id_fkey;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: outlet_couriers outlet_couriers_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlet_couriers DROP CONSTRAINT IF EXISTS outlet_couriers_outlet_id_fkey;
ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: outlet_couriers outlet_couriers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlet_couriers DROP CONSTRAINT IF EXISTS outlet_couriers_shop_id_fkey;
ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: outlets outlets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets DROP CONSTRAINT IF EXISTS outlets_shop_id_fkey;
ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: page_layout_versions page_layout_versions_layout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layout_versions DROP CONSTRAINT IF EXISTS page_layout_versions_layout_id_fkey;
ALTER TABLE ONLY public.page_layout_versions
    ADD CONSTRAINT page_layout_versions_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.page_layouts(id) ON DELETE CASCADE;


--
-- Name: page_layouts page_layouts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layouts DROP CONSTRAINT IF EXISTS page_layouts_shop_id_fkey;
ALTER TABLE ONLY public.page_layouts
    ADD CONSTRAINT page_layouts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: parked_carts parked_carts_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parked_carts DROP CONSTRAINT IF EXISTS parked_carts_outlet_id_fkey;
ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: parked_carts parked_carts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parked_carts DROP CONSTRAINT IF EXISTS parked_carts_shop_id_fkey;
ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: patient_records patient_records_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_records DROP CONSTRAINT IF EXISTS patient_records_shop_id_fkey;
ALTER TABLE ONLY public.patient_records
    ADD CONSTRAINT patient_records_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: patient_visits patient_visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_visits DROP CONSTRAINT IF EXISTS patient_visits_patient_id_fkey;
ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_records(id) ON DELETE CASCADE;


--
-- Name: patient_visits patient_visits_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_visits DROP CONSTRAINT IF EXISTS patient_visits_shop_id_fkey;
ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features DROP CONSTRAINT IF EXISTS plan_features_feature_key_fkey;
ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.features(key) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features DROP CONSTRAINT IF EXISTS plan_features_plan_id_fkey;
ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_invoices plan_invoices_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices DROP CONSTRAINT IF EXISTS plan_invoices_plan_id_fkey;
ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: plan_invoices plan_invoices_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices DROP CONSTRAINT IF EXISTS plan_invoices_shop_id_fkey;
ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: plan_subscriptions plan_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions DROP CONSTRAINT IF EXISTS plan_subscriptions_plan_id_fkey;
ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: plan_subscriptions plan_subscriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions DROP CONSTRAINT IF EXISTS plan_subscriptions_shop_id_fkey;
ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: plan_themes plan_themes_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_themes DROP CONSTRAINT IF EXISTS plan_themes_plan_id_fkey;
ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_themes plan_themes_theme_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_themes DROP CONSTRAINT IF EXISTS plan_themes_theme_key_fkey;
ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_theme_key_fkey FOREIGN KEY (theme_key) REFERENCES public.themes(key) ON DELETE CASCADE;


--
-- Name: platform_voucher_redemptions platform_voucher_redemptions_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_voucher_redemptions DROP CONSTRAINT IF EXISTS platform_voucher_redemptions_voucher_id_fkey;
ALTER TABLE ONLY public.platform_voucher_redemptions
    ADD CONSTRAINT platform_voucher_redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.platform_vouchers(id) ON DELETE CASCADE;


--
-- Name: po_audit_log po_audit_log_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_audit_log DROP CONSTRAINT IF EXISTS po_audit_log_po_id_fkey;
ALTER TABLE ONLY public.po_audit_log
    ADD CONSTRAINT po_audit_log_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: pos_audit_log pos_audit_log_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log DROP CONSTRAINT IF EXISTS pos_audit_log_shop_id_fkey;
ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: prescription_items prescription_items_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items DROP CONSTRAINT IF EXISTS prescription_items_medication_id_fkey;
ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items DROP CONSTRAINT IF EXISTS prescription_items_prescription_id_fkey;
ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_patient_id_fkey;
ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_records(id) ON DELETE SET NULL;


--
-- Name: prescriptions prescriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_shop_id_fkey;
ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_visit_id_fkey;
ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.patient_visits(id) ON DELETE SET NULL;


--
-- Name: printers printers_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers DROP CONSTRAINT IF EXISTS printers_outlet_id_fkey;
ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: printers printers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers DROP CONSTRAINT IF EXISTS printers_shop_id_fkey;
ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_attribute_defs product_attribute_defs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs DROP CONSTRAINT IF EXISTS product_attribute_defs_category_id_fkey;
ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_attribute_defs product_attribute_defs_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs DROP CONSTRAINT IF EXISTS product_attribute_defs_shop_id_fkey;
ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_qa product_qa_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa DROP CONSTRAINT IF EXISTS product_qa_answered_by_fkey;
ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_qa product_qa_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa DROP CONSTRAINT IF EXISTS product_qa_product_id_fkey;
ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: product_qa product_qa_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa DROP CONSTRAINT IF EXISTS product_qa_shop_id_fkey;
ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_qa product_qa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa DROP CONSTRAINT IF EXISTS product_qa_user_id_fkey;
ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_returns product_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns DROP CONSTRAINT IF EXISTS product_returns_order_id_fkey;
ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: product_returns product_returns_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns DROP CONSTRAINT IF EXISTS product_returns_processed_by_fkey;
ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_returns product_returns_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns DROP CONSTRAINT IF EXISTS product_returns_shop_id_fkey;
ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_order_id_fkey;
ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_fkey;
ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_shop_id_fkey;
ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_user_id_fkey;
ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: product_upsell_suggestions product_upsell_suggestions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions DROP CONSTRAINT IF EXISTS product_upsell_suggestions_product_id_fkey;
ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: product_upsell_suggestions product_upsell_suggestions_suggested_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions DROP CONSTRAINT IF EXISTS product_upsell_suggestions_suggested_id_fkey;
ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_suggested_id_fkey FOREIGN KEY (suggested_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_po_id_fkey;
ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: push_subscriptions push_subscriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_shop_id_fkey;
ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rental_bookings rental_bookings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_shop_id_fkey;
ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: rental_bookings rental_bookings_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_unit_id_fkey;
ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.rental_units(id) ON DELETE CASCADE;


--
-- Name: rental_inspections rental_inspections_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections DROP CONSTRAINT IF EXISTS rental_inspections_booking_id_fkey;
ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.rental_bookings(id) ON DELETE CASCADE;


--
-- Name: rental_inspections rental_inspections_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections DROP CONSTRAINT IF EXISTS rental_inspections_recorded_by_fkey;
ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: rental_inspections rental_inspections_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections DROP CONSTRAINT IF EXISTS rental_inspections_shop_id_fkey;
ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: rental_units rental_units_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_units DROP CONSTRAINT IF EXISTS rental_units_shop_id_fkey;
ALTER TABLE ONLY public.rental_units
    ADD CONSTRAINT rental_units_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: restock_subscribers restock_subscribers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers DROP CONSTRAINT IF EXISTS restock_subscribers_product_id_fkey;
ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: restock_subscribers restock_subscribers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers DROP CONSTRAINT IF EXISTS restock_subscribers_shop_id_fkey;
ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: sales_offerings sales_offerings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_offerings DROP CONSTRAINT IF EXISTS sales_offerings_shop_id_fkey;
ALTER TABLE ONLY public.sales_offerings
    ADD CONSTRAINT sales_offerings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: service_bundle_items service_bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundle_items DROP CONSTRAINT IF EXISTS service_bundle_items_bundle_id_fkey;
ALTER TABLE ONLY public.service_bundle_items
    ADD CONSTRAINT service_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.service_bundles(id) ON DELETE CASCADE;


--
-- Name: service_bundles service_bundles_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundles DROP CONSTRAINT IF EXISTS service_bundles_shop_id_fkey;
ALTER TABLE ONLY public.service_bundles
    ADD CONSTRAINT service_bundles_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_about shop_about_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_about DROP CONSTRAINT IF EXISTS shop_about_shop_id_fkey;
ALTER TABLE ONLY public.shop_about
    ADD CONSTRAINT shop_about_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_chat_messages shop_chat_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chat_messages DROP CONSTRAINT IF EXISTS shop_chat_messages_chat_id_fkey;
ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.shop_chats(id) ON DELETE CASCADE;


--
-- Name: shop_chat_messages shop_chat_messages_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chat_messages DROP CONSTRAINT IF EXISTS shop_chat_messages_shop_id_fkey;
ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_chats shop_chats_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chats DROP CONSTRAINT IF EXISTS shop_chats_shop_id_fkey;
ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_membership_tiers shop_membership_tiers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_membership_tiers DROP CONSTRAINT IF EXISTS shop_membership_tiers_shop_id_fkey;
ALTER TABLE ONLY public.shop_membership_tiers
    ADD CONSTRAINT shop_membership_tiers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_portfolio shop_portfolio_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_portfolio DROP CONSTRAINT IF EXISTS shop_portfolio_shop_id_fkey;
ALTER TABLE ONLY public.shop_portfolio
    ADD CONSTRAINT shop_portfolio_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_size_charts shop_size_charts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_size_charts DROP CONSTRAINT IF EXISTS shop_size_charts_shop_id_fkey;
ALTER TABLE ONLY public.shop_size_charts
    ADD CONSTRAINT shop_size_charts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_verifications shop_verifications_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_verifications DROP CONSTRAINT IF EXISTS shop_verifications_shop_id_fkey;
ALTER TABLE ONLY public.shop_verifications
    ADD CONSTRAINT shop_verifications_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_vouchers shop_vouchers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_vouchers DROP CONSTRAINT IF EXISTS shop_vouchers_shop_id_fkey;
ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_wallets shop_wallets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_wallets DROP CONSTRAINT IF EXISTS shop_wallets_shop_id_fkey;
ALTER TABLE ONLY public.shop_wallets
    ADD CONSTRAINT shop_wallets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: staff_audit_logs staff_audit_logs_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audit_logs DROP CONSTRAINT IF EXISTS staff_audit_logs_shop_id_fkey;
ALTER TABLE ONLY public.staff_audit_logs
    ADD CONSTRAINT staff_audit_logs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: staff_members staff_members_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members DROP CONSTRAINT IF EXISTS staff_members_outlet_id_fkey;
ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: staff_members staff_members_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members DROP CONSTRAINT IF EXISTS staff_members_shop_id_fkey;
ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions DROP CONSTRAINT IF EXISTS staff_permissions_shop_id_fkey;
ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: stock_opname_items stock_opname_items_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opname_items DROP CONSTRAINT IF EXISTS stock_opname_items_ingredient_id_fkey;
ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- Name: stock_opname_items stock_opname_items_stock_opname_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opname_items DROP CONSTRAINT IF EXISTS stock_opname_items_stock_opname_id_fkey;
ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_stock_opname_id_fkey FOREIGN KEY (stock_opname_id) REFERENCES public.stock_opnames(id) ON DELETE CASCADE;


--
-- Name: studio_galleries studio_galleries_photographer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries DROP CONSTRAINT IF EXISTS studio_galleries_photographer_id_fkey;
ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.studio_photographers(id) ON DELETE SET NULL;


--
-- Name: studio_galleries studio_galleries_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries DROP CONSTRAINT IF EXISTS studio_galleries_shop_id_fkey;
ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: studio_gallery_photos studio_gallery_photos_gallery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_gallery_photos DROP CONSTRAINT IF EXISTS studio_gallery_photos_gallery_id_fkey;
ALTER TABLE ONLY public.studio_gallery_photos
    ADD CONSTRAINT studio_gallery_photos_gallery_id_fkey FOREIGN KEY (gallery_id) REFERENCES public.studio_galleries(id) ON DELETE CASCADE;


--
-- Name: studio_locations studio_locations_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_locations DROP CONSTRAINT IF EXISTS studio_locations_shop_id_fkey;
ALTER TABLE ONLY public.studio_locations
    ADD CONSTRAINT studio_locations_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: studio_packages studio_packages_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_packages DROP CONSTRAINT IF EXISTS studio_packages_shop_id_fkey;
ALTER TABLE ONLY public.studio_packages
    ADD CONSTRAINT studio_packages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: studio_photographers studio_photographers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_photographers DROP CONSTRAINT IF EXISTS studio_photographers_shop_id_fkey;
ALTER TABLE ONLY public.studio_photographers
    ADD CONSTRAINT studio_photographers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: testimonials testimonials_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials DROP CONSTRAINT IF EXISTS testimonials_shop_id_fkey;
ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_installments travel_installments_jamaah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments DROP CONSTRAINT IF EXISTS travel_installments_jamaah_id_fkey;
ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_jamaah_id_fkey FOREIGN KEY (jamaah_id) REFERENCES public.travel_jamaah_manifest(id) ON DELETE SET NULL;


--
-- Name: travel_installments travel_installments_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments DROP CONSTRAINT IF EXISTS travel_installments_package_id_fkey;
ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE SET NULL;


--
-- Name: travel_installments travel_installments_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments DROP CONSTRAINT IF EXISTS travel_installments_shop_id_fkey;
ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_itineraries travel_itineraries_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_itineraries DROP CONSTRAINT IF EXISTS travel_itineraries_package_id_fkey;
ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE CASCADE;


--
-- Name: travel_itineraries travel_itineraries_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_itineraries DROP CONSTRAINT IF EXISTS travel_itineraries_shop_id_fkey;
ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_jamaah_documents travel_jamaah_documents_jamaah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_documents DROP CONSTRAINT IF EXISTS travel_jamaah_documents_jamaah_id_fkey;
ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_jamaah_id_fkey FOREIGN KEY (jamaah_id) REFERENCES public.travel_jamaah_manifest(id) ON DELETE CASCADE;


--
-- Name: travel_jamaah_documents travel_jamaah_documents_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_documents DROP CONSTRAINT IF EXISTS travel_jamaah_documents_shop_id_fkey;
ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_jamaah_manifest travel_jamaah_manifest_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_manifest DROP CONSTRAINT IF EXISTS travel_jamaah_manifest_package_id_fkey;
ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE SET NULL;


--
-- Name: travel_jamaah_manifest travel_jamaah_manifest_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_manifest DROP CONSTRAINT IF EXISTS travel_jamaah_manifest_shop_id_fkey;
ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: umroh_facilities umroh_facilities_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_facilities DROP CONSTRAINT IF EXISTS umroh_facilities_shop_id_fkey;
ALTER TABLE ONLY public.umroh_facilities
    ADD CONSTRAINT umroh_facilities_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: umroh_faqs umroh_faqs_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_faqs DROP CONSTRAINT IF EXISTS umroh_faqs_shop_id_fkey;
ALTER TABLE ONLY public.umroh_faqs
    ADD CONSTRAINT umroh_faqs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: umroh_packages umroh_packages_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_packages DROP CONSTRAINT IF EXISTS umroh_packages_shop_id_fkey;
ALTER TABLE ONLY public.umroh_packages
    ADD CONSTRAINT umroh_packages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_default_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_default_outlet_id_fkey;
ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_default_outlet_id_fkey FOREIGN KEY (default_outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_topup_presets wallet_topup_presets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topup_presets DROP CONSTRAINT IF EXISTS wallet_topup_presets_shop_id_fkey;
ALTER TABLE ONLY public.wallet_topup_presets
    ADD CONSTRAINT wallet_topup_presets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: wallet_topups wallet_topups_preset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topups DROP CONSTRAINT IF EXISTS wallet_topups_preset_id_fkey;
ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.wallet_topup_presets(id) ON DELETE SET NULL;


--
-- Name: wallet_topups wallet_topups_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topups DROP CONSTRAINT IF EXISTS wallet_topups_shop_id_fkey;
ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_created_by_fkey;
ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_order_id_fkey;
ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_shop_id_fkey;
ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_menu_item_id_fkey;
ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;
ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_requested_by_fkey;
ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: withdrawal_requests withdrawal_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_reviewed_by_fkey;
ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: withdrawal_requests withdrawal_requests_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_shop_id_fkey;
ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- =============================================================================
-- BEGIN: 04_policies_and_storage.sql
-- =============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: banners Banners are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Banners are viewable by everyone" ON public.banners;
CREATE POLICY "Banners are viewable by everyone" ON public.banners FOR SELECT USING (true);


--
-- Name: bundle_items Bundle items are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Bundle items are viewable by everyone" ON public.bundle_items;
CREATE POLICY "Bundle items are viewable by everyone" ON public.bundle_items FOR SELECT USING (true);


--
-- Name: bundle_items Bundle items managed by shop owner; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Bundle items managed by shop owner" ON public.bundle_items;
CREATE POLICY "Bundle items managed by shop owner" ON public.bundle_items USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops s ON ((s.id = mi.shop_id)))
  WHERE ((mi.id = bundle_items.bundle_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops s ON ((s.id = mi.shop_id)))
  WHERE ((mi.id = bundle_items.bundle_id) AND (s.owner_id = auth.uid())))));


--
-- Name: orders Couriers can claim and update assigned orders; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Couriers can claim and update assigned orders" ON public.orders;
CREATE POLICY "Couriers can claim and update assigned orders" ON public.orders FOR UPDATE TO authenticated USING (((courier_id IN ( SELECT couriers.id
   FROM public.couriers
  WHERE (couriers.user_id = auth.uid()))) OR ((courier_id IS NULL) AND public.is_courier_of_shop(auth.uid(), shop_id)))) WITH CHECK ((courier_id IN ( SELECT couriers.id
   FROM public.couriers
  WHERE (couriers.user_id = auth.uid()))));


--
-- Name: orders Couriers can view assigned orders; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Couriers can view assigned orders" ON public.orders;
CREATE POLICY "Couriers can view assigned orders" ON public.orders FOR SELECT TO authenticated USING (((courier_id IN ( SELECT couriers.id
   FROM public.couriers
  WHERE (couriers.user_id = auth.uid()))) OR ((courier_id IS NULL) AND (status = ANY (ARRAY['ready'::public.order_status, 'preparing'::public.order_status])) AND (fulfillment = 'delivery'::public.fulfillment_type) AND public.is_courier_of_shop(auth.uid(), shop_id))));


--
-- Name: course_lessons Course lessons viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Course lessons viewable by everyone" ON public.course_lessons;
CREATE POLICY "Course lessons viewable by everyone" ON public.course_lessons FOR SELECT USING (true);


--
-- Name: course_modules Course modules viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Course modules viewable by everyone" ON public.course_modules;
CREATE POLICY "Course modules viewable by everyone" ON public.course_modules FOR SELECT USING (true);


--
-- Name: staff_permissions Owner manages staff permissions; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owner manages staff permissions" ON public.staff_permissions;
CREATE POLICY "Owner manages staff permissions" ON public.staff_permissions USING ((EXISTS ( SELECT 1
   FROM public.shops
  WHERE ((shops.id = staff_permissions.shop_id) AND (shops.owner_id = auth.uid())))));


--
-- Name: staff_audit_logs Owners can insert staff audit; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners can insert staff audit" ON public.staff_audit_logs;
CREATE POLICY "Owners can insert staff audit" ON public.staff_audit_logs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops c
  WHERE ((c.id = staff_audit_logs.shop_id) AND (c.owner_id = auth.uid())))));


--
-- Name: staff_audit_logs Owners can view staff audit; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners can view staff audit" ON public.staff_audit_logs;
CREATE POLICY "Owners can view staff audit" ON public.staff_audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops c
  WHERE ((c.id = staff_audit_logs.shop_id) AND (c.owner_id = auth.uid())))));


--
-- Name: bulk_pricing_rules Owners manage bulk pricing (delete); Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage bulk pricing (delete)" ON public.bulk_pricing_rules;
CREATE POLICY "Owners manage bulk pricing (delete)" ON public.bulk_pricing_rules FOR DELETE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: bulk_pricing_rules Owners manage bulk pricing (insert); Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage bulk pricing (insert)" ON public.bulk_pricing_rules;
CREATE POLICY "Owners manage bulk pricing (insert)" ON public.bulk_pricing_rules FOR INSERT TO authenticated WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: bulk_pricing_rules Owners manage bulk pricing (update); Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage bulk pricing (update)" ON public.bulk_pricing_rules;
CREATE POLICY "Owners manage bulk pricing (update)" ON public.bulk_pricing_rules FOR UPDATE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_vouchers Owners manage own shop vouchers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage own shop vouchers" ON public.shop_vouchers;
CREATE POLICY "Owners manage own shop vouchers" ON public.shop_vouchers TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: flash_sales Owners manage their flash sales (delete); Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage their flash sales (delete)" ON public.flash_sales;
CREATE POLICY "Owners manage their flash sales (delete)" ON public.flash_sales FOR DELETE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: flash_sales Owners manage their flash sales (insert); Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage their flash sales (insert)" ON public.flash_sales;
CREATE POLICY "Owners manage their flash sales (insert)" ON public.flash_sales FOR INSERT TO authenticated WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: flash_sales Owners manage their flash sales (update); Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage their flash sales (update)" ON public.flash_sales;
CREATE POLICY "Owners manage their flash sales (update)" ON public.flash_sales FOR UPDATE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: page_layout_versions Owners manage their layout versions; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Owners manage their layout versions" ON public.page_layout_versions;
CREATE POLICY "Owners manage their layout versions" ON public.page_layout_versions USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layout_versions.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layout_versions.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: studio_locations Public can view active studio locations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public can view active studio locations" ON public.studio_locations;
CREATE POLICY "Public can view active studio locations" ON public.studio_locations FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: bulk_pricing_rules Public can view bulk pricing; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public can view bulk pricing" ON public.bulk_pricing_rules;
CREATE POLICY "Public can view bulk pricing" ON public.bulk_pricing_rules FOR SELECT USING (true);


--
-- Name: flash_sales Public can view flash sales; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public can view flash sales" ON public.flash_sales;
CREATE POLICY "Public can view flash sales" ON public.flash_sales FOR SELECT USING (true);


--
-- Name: shop_vouchers Public view active vouchers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public view active vouchers" ON public.shop_vouchers;
CREATE POLICY "Public view active vouchers" ON public.shop_vouchers FOR SELECT TO authenticated, anon USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())) AND ((starts_at IS NULL) OR (starts_at <= now()))));


--
-- Name: parked_carts Shop members can delete parked carts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop members can delete parked carts" ON public.parked_carts;
CREATE POLICY "Shop members can delete parked carts" ON public.parked_carts FOR DELETE TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: po_audit_log Shop members can insert PO audit log; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop members can insert PO audit log" ON public.po_audit_log;
CREATE POLICY "Shop members can insert PO audit log" ON public.po_audit_log FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: parked_carts Shop members can insert parked carts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop members can insert parked carts" ON public.parked_carts;
CREATE POLICY "Shop members can insert parked carts" ON public.parked_carts FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: po_audit_log Shop members can read PO audit log; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop members can read PO audit log" ON public.po_audit_log;
CREATE POLICY "Shop members can read PO audit log" ON public.po_audit_log FOR SELECT TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: parked_carts Shop members can update parked carts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop members can update parked carts" ON public.parked_carts;
CREATE POLICY "Shop members can update parked carts" ON public.parked_carts FOR UPDATE TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: parked_carts Shop members can view parked carts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop members can view parked carts" ON public.parked_carts;
CREATE POLICY "Shop members can view parked carts" ON public.parked_carts FOR SELECT TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: product_attribute_defs Shop owner can delete attribute defs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owner can delete attribute defs" ON public.product_attribute_defs;
CREATE POLICY "Shop owner can delete attribute defs" ON public.product_attribute_defs FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_attribute_defs Shop owner can insert attribute defs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owner can insert attribute defs" ON public.product_attribute_defs;
CREATE POLICY "Shop owner can insert attribute defs" ON public.product_attribute_defs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_attribute_defs Shop owner can update attribute defs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owner can update attribute defs" ON public.product_attribute_defs;
CREATE POLICY "Shop owner can update attribute defs" ON public.product_attribute_defs FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_attribute_defs Shop owner can view attribute defs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owner can view attribute defs" ON public.product_attribute_defs;
CREATE POLICY "Shop owner can view attribute defs" ON public.product_attribute_defs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can delete their printers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners can delete their printers" ON public.printers;
CREATE POLICY "Shop owners can delete their printers" ON public.printers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can insert their printers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners can insert their printers" ON public.printers;
CREATE POLICY "Shop owners can insert their printers" ON public.printers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can update their printers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners can update their printers" ON public.printers;
CREATE POLICY "Shop owners can update their printers" ON public.printers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can view their printers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners can view their printers" ON public.printers;
CREATE POLICY "Shop owners can view their printers" ON public.printers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: course_lessons Shop owners manage lessons; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners manage lessons" ON public.course_lessons;
CREATE POLICY "Shop owners manage lessons" ON public.course_lessons USING ((EXISTS ( SELECT 1
   FROM ((public.course_modules cm
     JOIN public.menu_items mi ON ((mi.id = cm.menu_item_id)))
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((cm.id = course_lessons.module_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.course_modules cm
     JOIN public.menu_items mi ON ((mi.id = cm.menu_item_id)))
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((cm.id = course_lessons.module_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: course_modules Shop owners manage modules; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners manage modules" ON public.course_modules;
CREATE POLICY "Shop owners manage modules" ON public.course_modules USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = course_modules.menu_item_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = course_modules.menu_item_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: wishlists Shop owners view wishlists of their products; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Shop owners view wishlists of their products" ON public.wishlists;
CREATE POLICY "Shop owners view wishlists of their products" ON public.wishlists FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = wishlists.menu_item_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: staff_audit_logs Staff can insert own audit log; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Staff can insert own audit log" ON public.staff_audit_logs;
CREATE POLICY "Staff can insert own audit log" ON public.staff_audit_logs FOR INSERT WITH CHECK (((actor_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_audit_logs.shop_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.shop_id = staff_audit_logs.shop_id)))))));


--
-- Name: staff_permissions Staff reads own permissions; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Staff reads own permissions" ON public.staff_permissions;
CREATE POLICY "Staff reads own permissions" ON public.staff_permissions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: shop_vouchers Staff view shop vouchers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Staff view shop vouchers" ON public.shop_vouchers;
CREATE POLICY "Staff view shop vouchers" ON public.shop_vouchers FOR SELECT TO authenticated USING ((shop_id IN ( SELECT user_roles.shop_id
   FROM public.user_roles
  WHERE (user_roles.user_id = auth.uid()))));


--
-- Name: banners Super admin can delete banners; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Super admin can delete banners" ON public.banners;
CREATE POLICY "Super admin can delete banners" ON public.banners FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: banners Super admin can insert banners; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Super admin can insert banners" ON public.banners;
CREATE POLICY "Super admin can insert banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: banners Super admin can update banners; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Super admin can update banners" ON public.banners;
CREATE POLICY "Super admin can update banners" ON public.banners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: course_enrollments Users delete own enrollments; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users delete own enrollments" ON public.course_enrollments;
CREATE POLICY "Users delete own enrollments" ON public.course_enrollments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: lesson_progress Users delete own progress; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users delete own progress" ON public.lesson_progress;
CREATE POLICY "Users delete own progress" ON public.lesson_progress FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: wishlists Users delete own wishlist; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users delete own wishlist" ON public.wishlists;
CREATE POLICY "Users delete own wishlist" ON public.wishlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: course_enrollments Users insert own enrollments; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users insert own enrollments" ON public.course_enrollments;
CREATE POLICY "Users insert own enrollments" ON public.course_enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_progress Users insert own progress; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users insert own progress" ON public.lesson_progress;
CREATE POLICY "Users insert own progress" ON public.lesson_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlists Users insert own wishlist; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users insert own wishlist" ON public.wishlists;
CREATE POLICY "Users insert own wishlist" ON public.wishlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_progress Users update own progress; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users update own progress" ON public.lesson_progress;
CREATE POLICY "Users update own progress" ON public.lesson_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: course_enrollments Users view own enrollments; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users view own enrollments" ON public.course_enrollments;
CREATE POLICY "Users view own enrollments" ON public.course_enrollments FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = course_enrollments.menu_item_id) AND (cs.owner_id = auth.uid()))))));


--
-- Name: lesson_progress Users view own progress; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users view own progress" ON public.lesson_progress;
CREATE POLICY "Users view own progress" ON public.lesson_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlists Users view own wishlist; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users view own wishlist" ON public.wishlists;
CREATE POLICY "Users view own wishlist" ON public.wishlists FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ad_requests ad_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ad_admin_all ON public.ad_requests;
CREATE POLICY ad_admin_all ON public.ad_requests USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: ad_requests ad_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ad_owner_insert ON public.ad_requests;
CREATE POLICY ad_owner_insert ON public.ad_requests FOR INSERT WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: ad_requests ad_owner_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ad_owner_select ON public.ad_requests;
CREATE POLICY ad_owner_select ON public.ad_requests FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: ad_requests ad_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ad_owner_update ON public.ad_requests;
CREATE POLICY ad_owner_update ON public.ad_requests FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: ad_requests ad_public_active; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ad_public_active ON public.ad_requests;
CREATE POLICY ad_public_active ON public.ad_requests FOR SELECT USING ((status = 'active'::text));


--
-- Name: ad_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews admin_manage_review; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS admin_manage_review ON public.product_reviews;
CREATE POLICY admin_manage_review ON public.product_reviews USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: withdrawal_requests admin_update_withdrawal; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS admin_update_withdrawal ON public.withdrawal_requests;
CREATE POLICY admin_update_withdrawal ON public.withdrawal_requests FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: wallet_topup_presets anyone_view_active_presets; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS anyone_view_active_presets ON public.wallet_topup_presets;
CREATE POLICY anyone_view_active_presets ON public.wallet_topup_presets FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topup_presets.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: shop_membership_tiers anyone_view_active_tiers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS anyone_view_active_tiers ON public.shop_membership_tiers;
CREATE POLICY anyone_view_active_tiers ON public.shop_membership_tiers FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_membership_tiers.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: attendances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

--
-- Name: attendances attendances_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS attendances_owner_all ON public.attendances;
CREATE POLICY attendances_owner_all ON public.attendances TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = attendances.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = attendances.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: attendances attendances_self_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS attendances_self_insert ON public.attendances;
CREATE POLICY attendances_self_insert ON public.attendances FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND public.has_outlet_access(auth.uid(), outlet_id)));


--
-- Name: attendances attendances_self_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS attendances_self_select ON public.attendances;
CREATE POLICY attendances_self_select ON public.attendances FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: attendances attendances_self_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS attendances_self_update ON public.attendances;
CREATE POLICY attendances_self_update ON public.attendances FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: backup_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_schedules backup_schedules_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS backup_schedules_owner_all ON public.backup_schedules;
CREATE POLICY backup_schedules_owner_all ON public.backup_schedules TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = backup_schedules.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = backup_schedules.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: backup_schedules backup_schedules_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS backup_schedules_super_admin_read ON public.backup_schedules;
CREATE POLICY backup_schedules_super_admin_read ON public.backup_schedules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_settings billing_settings_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS billing_settings_super_admin_read ON public.billing_settings;
CREATE POLICY billing_settings_super_admin_read ON public.billing_settings FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: billing_settings billing_settings_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS billing_settings_super_admin_write ON public.billing_settings;
CREATE POLICY billing_settings_super_admin_write ON public.billing_settings TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: booking_reschedule_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_reschedule_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_review_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_review_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings bookings_customer_cancel; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS bookings_customer_cancel ON public.bookings;
CREATE POLICY bookings_customer_cancel ON public.bookings FOR UPDATE USING ((auth.uid() = customer_user_id)) WITH CHECK ((auth.uid() = customer_user_id));


--
-- Name: bookings bookings_customer_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS bookings_customer_insert ON public.bookings;
CREATE POLICY bookings_customer_insert ON public.bookings FOR INSERT WITH CHECK (((auth.uid() = customer_user_id) OR (customer_user_id IS NULL)));


--
-- Name: bookings bookings_customer_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS bookings_customer_select ON public.bookings;
CREATE POLICY bookings_customer_select ON public.bookings FOR SELECT USING ((auth.uid() = customer_user_id));


--
-- Name: bookings bookings_owner_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS bookings_owner_select ON public.bookings;
CREATE POLICY bookings_owner_select ON public.bookings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = bookings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: bookings bookings_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS bookings_owner_update ON public.bookings;
CREATE POLICY bookings_owner_update ON public.bookings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = bookings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: branding_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branding_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: branding_audit branding_audit_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS branding_audit_owner_insert ON public.branding_audit;
CREATE POLICY branding_audit_owner_insert ON public.branding_audit FOR INSERT TO authenticated WITH CHECK (((changed_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = branding_audit.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: branding_audit branding_audit_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS branding_audit_owner_read ON public.branding_audit;
CREATE POLICY branding_audit_owner_read ON public.branding_audit FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = branding_audit.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: bulk_pricing_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bulk_pricing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: bundle_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories business_categories_admin_read_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS business_categories_admin_read_all ON public.business_categories;
CREATE POLICY business_categories_admin_read_all ON public.business_categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: business_categories business_categories_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS business_categories_admin_write ON public.business_categories;
CREATE POLICY business_categories_admin_write ON public.business_categories TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: business_categories business_categories_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS business_categories_public_read ON public.business_categories;
CREATE POLICY business_categories_public_read ON public.business_categories FOR SELECT USING ((is_active = true));


--
-- Name: custom_order_requests buyer_insert_custom_order; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_insert_custom_order ON public.custom_order_requests;
CREATE POLICY buyer_insert_custom_order ON public.custom_order_requests FOR INSERT WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));


--
-- Name: shop_chat_messages buyer_insert_messages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_insert_messages ON public.shop_chat_messages;
CREATE POLICY buyer_insert_messages ON public.shop_chat_messages FOR INSERT WITH CHECK (((sender_role = 'buyer'::text) AND (sender_id = auth.uid()) AND (chat_id IN ( SELECT shop_chats.id
   FROM public.shop_chats
  WHERE (shop_chats.buyer_user_id = auth.uid())))));


--
-- Name: shop_chats buyer_insert_own_chat; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_insert_own_chat ON public.shop_chats;
CREATE POLICY buyer_insert_own_chat ON public.shop_chats FOR INSERT WITH CHECK ((auth.uid() = buyer_user_id));


--
-- Name: shop_chats buyer_select_own_chat; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_select_own_chat ON public.shop_chats;
CREATE POLICY buyer_select_own_chat ON public.shop_chats FOR SELECT USING ((auth.uid() = buyer_user_id));


--
-- Name: custom_order_requests buyer_select_own_custom_order; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_select_own_custom_order ON public.custom_order_requests;
CREATE POLICY buyer_select_own_custom_order ON public.custom_order_requests FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: shop_chat_messages buyer_select_own_messages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_select_own_messages ON public.shop_chat_messages;
CREATE POLICY buyer_select_own_messages ON public.shop_chat_messages FOR SELECT USING ((chat_id IN ( SELECT shop_chats.id
   FROM public.shop_chats
  WHERE (shop_chats.buyer_user_id = auth.uid()))));


--
-- Name: shop_chats buyer_update_own_chat; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_update_own_chat ON public.shop_chats;
CREATE POLICY buyer_update_own_chat ON public.shop_chats FOR UPDATE USING ((auth.uid() = buyer_user_id));


--
-- Name: shop_chat_messages buyer_update_own_msg_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS buyer_update_own_msg_read ON public.shop_chat_messages;
CREATE POLICY buyer_update_own_msg_read ON public.shop_chat_messages FOR UPDATE USING ((chat_id IN ( SELECT shop_chats.id
   FROM public.shop_chats
  WHERE (shop_chats.buyer_user_id = auth.uid()))));


--
-- Name: campaign_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_recipients campaign_recipients_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS campaign_recipients_owner_all ON public.campaign_recipients;
CREATE POLICY campaign_recipients_owner_all ON public.campaign_recipients TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.marketing_campaigns mc
     JOIN public.shops s ON ((s.id = mc.shop_id)))
  WHERE ((mc.id = campaign_recipients.campaign_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.marketing_campaigns mc
     JOIN public.shops s ON ((s.id = mc.shop_id)))
  WHERE ((mc.id = campaign_recipients.campaign_id) AND (s.owner_id = auth.uid())))));


--
-- Name: cash_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_movements cash_movements_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_movements_owner_all ON public.cash_movements;
CREATE POLICY cash_movements_owner_all ON public.cash_movements TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.cash_shifts cs
     JOIN public.shops s ON ((s.id = cs.shop_id)))
  WHERE ((cs.id = cash_movements.shift_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.cash_shifts cs
     JOIN public.shops s ON ((s.id = cs.shop_id)))
  WHERE ((cs.id = cash_movements.shift_id) AND (s.owner_id = auth.uid())))));


--
-- Name: cash_movements cash_movements_staff_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_movements_staff_insert ON public.cash_movements;
CREATE POLICY cash_movements_staff_insert ON public.cash_movements FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cash_shifts cs
  WHERE ((cs.id = cash_movements.shift_id) AND public.has_outlet_access(auth.uid(), cs.outlet_id)))));


--
-- Name: cash_movements cash_movements_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_movements_staff_read ON public.cash_movements;
CREATE POLICY cash_movements_staff_read ON public.cash_movements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.cash_shifts cs
  WHERE ((cs.id = cash_movements.shift_id) AND public.has_outlet_access(auth.uid(), cs.outlet_id)))));


--
-- Name: cash_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_shifts cash_shifts_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_shifts_owner_all ON public.cash_shifts;
CREATE POLICY cash_shifts_owner_all ON public.cash_shifts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = cash_shifts.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = cash_shifts.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: cash_shifts cash_shifts_staff_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_shifts_staff_insert ON public.cash_shifts;
CREATE POLICY cash_shifts_staff_insert ON public.cash_shifts FOR INSERT TO authenticated WITH CHECK ((public.has_outlet_access(auth.uid(), outlet_id) AND (opened_by = auth.uid())));


--
-- Name: cash_shifts cash_shifts_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_shifts_staff_read ON public.cash_shifts;
CREATE POLICY cash_shifts_staff_read ON public.cash_shifts FOR SELECT TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: cash_shifts cash_shifts_staff_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cash_shifts_staff_update ON public.cash_shifts;
CREATE POLICY cash_shifts_staff_update ON public.cash_shifts FOR UPDATE TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id)) WITH CHECK (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS categories_owner_all ON public.categories;
CREATE POLICY categories_owner_all ON public.categories TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = categories.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = categories.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: categories categories_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = categories.shop_id) AND (s.is_active = true))))));


--
-- Name: categories categories_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS categories_staff_read ON public.categories;
CREATE POLICY categories_staff_read ON public.categories FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = categories.shop_id)))));


--
-- Name: couriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

--
-- Name: couriers couriers_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS couriers_owner_all ON public.couriers;
CREATE POLICY couriers_owner_all ON public.couriers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = couriers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = couriers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: couriers couriers_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS couriers_self_read ON public.couriers;
CREATE POLICY couriers_self_read ON public.couriers FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: course_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: course_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: course_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: course_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_runs cron_runs_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cron_runs_super_admin_read ON public.cron_runs;
CREATE POLICY cron_runs_super_admin_read ON public.cron_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: custom_order_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_order_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_order_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_order_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses customer_addresses_self_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_addresses_self_all ON public.customer_addresses;
CREATE POLICY customer_addresses_self_all ON public.customer_addresses TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: customer_memberships customer_create_membership; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_create_membership ON public.customer_memberships;
CREATE POLICY customer_create_membership ON public.customer_memberships FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: wallet_topups customer_create_topup; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_create_topup ON public.wallet_topups;
CREATE POLICY customer_create_topup ON public.wallet_topups FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: customer_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_favorites customer_favorites_self_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_favorites_self_all ON public.customer_favorites;
CREATE POLICY customer_favorites_self_all ON public.customer_favorites TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: customer_wallets customer_insert_own_wallet; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_insert_own_wallet ON public.customer_wallets;
CREATE POLICY customer_insert_own_wallet ON public.customer_wallets FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: customer_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_topups customer_or_owner_update_topup; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_or_owner_update_topup ON public.wallet_topups;
CREATE POLICY customer_or_owner_update_topup ON public.wallet_topups FOR UPDATE USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topups.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: customer_wallets customer_or_owner_update_wallet; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_or_owner_update_wallet ON public.customer_wallets;
CREATE POLICY customer_or_owner_update_wallet ON public.customer_wallets FOR UPDATE USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallets.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: customer_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_profiles customer_profiles_self_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_profiles_self_all ON public.customer_profiles;
CREATE POLICY customer_profiles_self_all ON public.customer_profiles TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: customer_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_segments customer_segments_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_segments_owner_all ON public.customer_segments;
CREATE POLICY customer_segments_owner_all ON public.customer_segments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_segments.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_segments.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: customer_segments customer_segments_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_segments_super_admin_read ON public.customer_segments;
CREATE POLICY customer_segments_super_admin_read ON public.customer_segments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: customer_treatments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_memberships customer_update_own_membership; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_update_own_membership ON public.customer_memberships;
CREATE POLICY customer_update_own_membership ON public.customer_memberships FOR UPDATE USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_memberships.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: customer_memberships customer_view_own_memberships; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_view_own_memberships ON public.customer_memberships;
CREATE POLICY customer_view_own_memberships ON public.customer_memberships FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_memberships.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: customer_wallets customer_view_own_wallet; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS customer_view_own_wallet ON public.customer_wallets;
CREATE POLICY customer_view_own_wallet ON public.customer_wallets FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallets.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: customer_wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_settings delivery_settings_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS delivery_settings_owner_all ON public.delivery_settings;
CREATE POLICY delivery_settings_owner_all ON public.delivery_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_settings.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_settings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: delivery_settings delivery_settings_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS delivery_settings_public_read ON public.delivery_settings;
CREATE POLICY delivery_settings_public_read ON public.delivery_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_settings.shop_id) AND (s.is_active = true)))));


--
-- Name: delivery_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_zones delivery_zones_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS delivery_zones_owner_all ON public.delivery_zones;
CREATE POLICY delivery_zones_owner_all ON public.delivery_zones TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_zones.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_zones.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: delivery_zones delivery_zones_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS delivery_zones_public_read ON public.delivery_zones;
CREATE POLICY delivery_zones_public_read ON public.delivery_zones FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_zones.shop_id) AND (s.is_active = true))))));


--
-- Name: order_disputes disputes_admin_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS disputes_admin_update ON public.order_disputes;
CREATE POLICY disputes_admin_update ON public.order_disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: order_disputes disputes_customer_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS disputes_customer_read ON public.order_disputes;
CREATE POLICY disputes_customer_read ON public.order_disputes FOR SELECT TO authenticated USING ((opened_by = auth.uid()));


--
-- Name: order_disputes disputes_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS disputes_owner_read ON public.order_disputes;
CREATE POLICY disputes_owner_read ON public.order_disputes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_disputes.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: order_disputes disputes_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS disputes_owner_update ON public.order_disputes;
CREATE POLICY disputes_owner_update ON public.order_disputes FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_disputes.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_disputes.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: order_disputes disputes_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS disputes_super_admin_read ON public.order_disputes;
CREATE POLICY disputes_super_admin_read ON public.order_disputes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: domain_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_audit domain_audit_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS domain_audit_owner_insert ON public.domain_audit;
CREATE POLICY domain_audit_owner_insert ON public.domain_audit FOR INSERT TO authenticated WITH CHECK (((actor_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_audit.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))));


--
-- Name: domain_audit domain_audit_owner_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS domain_audit_owner_select ON public.domain_audit;
CREATE POLICY domain_audit_owner_select ON public.domain_audit FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_audit.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: domain_blacklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_blacklist ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_blacklist domain_blacklist_read_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS domain_blacklist_read_auth ON public.domain_blacklist;
CREATE POLICY domain_blacklist_read_auth ON public.domain_blacklist FOR SELECT TO authenticated USING (true);


--
-- Name: domain_blacklist domain_blacklist_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS domain_blacklist_super_admin_write ON public.domain_blacklist;
CREATE POLICY domain_blacklist_super_admin_write ON public.domain_blacklist TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: domain_verify_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_verify_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_verify_attempts dva_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS dva_owner_insert ON public.domain_verify_attempts;
CREATE POLICY dva_owner_insert ON public.domain_verify_attempts FOR INSERT TO authenticated WITH CHECK (((actor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_verify_attempts.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: domain_verify_attempts dva_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS dva_owner_read ON public.domain_verify_attempts;
CREATE POLICY dva_owner_read ON public.domain_verify_attempts FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_verify_attempts.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: expiry_reminder_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expiry_reminder_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_reminder_shop_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expiry_reminder_shop_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_reminder_shop_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expiry_reminder_shop_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

--
-- Name: features features_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS features_public_read ON public.features;
CREATE POLICY features_public_read ON public.features FOR SELECT USING (true);


--
-- Name: features features_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS features_super_admin_write ON public.features;
CREATE POLICY features_super_admin_write ON public.features TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: flash_sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: flyers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

--
-- Name: flyers flyers owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "flyers owner all" ON public.flyers;
CREATE POLICY "flyers owner all" ON public.flyers USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = flyers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = flyers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: flyers flyers public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "flyers public read" ON public.flyers;
CREATE POLICY "flyers public read" ON public.flyers FOR SELECT USING (true);


--
-- Name: fnb_combos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fnb_combos ENABLE ROW LEVEL SECURITY;

--
-- Name: freelance_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelance_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_galleries galleries_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS galleries_owner_all ON public.studio_galleries;
CREATE POLICY galleries_owner_all ON public.studio_galleries TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_gallery_photos gallery_photos_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS gallery_photos_owner_all ON public.studio_gallery_photos;
CREATE POLICY gallery_photos_owner_all ON public.studio_gallery_photos TO authenticated USING ((gallery_id IN ( SELECT g.id
   FROM (public.studio_galleries g
     JOIN public.shops s ON ((s.id = g.shop_id)))
  WHERE (s.owner_id = auth.uid())))) WITH CHECK ((gallery_id IN ( SELECT g.id
   FROM (public.studio_galleries g
     JOIN public.shops s ON ((s.id = g.shop_id)))
  WHERE (s.owner_id = auth.uid()))));


--
-- Name: icd10_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: icd10_codes icd10_read_all_authenticated; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS icd10_read_all_authenticated ON public.icd10_codes;
CREATE POLICY icd10_read_all_authenticated ON public.icd10_codes FOR SELECT TO authenticated USING (true);


--
-- Name: ingredients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

--
-- Name: ingredients ingredients_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ingredients_owner_all ON public.ingredients;
CREATE POLICY ingredients_owner_all ON public.ingredients TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = ingredients.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = ingredients.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: ingredients ingredients_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ingredients_staff_read ON public.ingredients;
CREATE POLICY ingredients_staff_read ON public.ingredients FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = ingredients.shop_id)))));


--
-- Name: customer_wallet_transactions insert_own_wallet_tx; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS insert_own_wallet_tx ON public.customer_wallet_transactions;
CREATE POLICY insert_own_wallet_tx ON public.customer_wallet_transactions FOR INSERT WITH CHECK (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallet_transactions.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: job_deliverables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_deliverables ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: leads leads owner delete; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "leads owner delete" ON public.leads;
CREATE POLICY "leads owner delete" ON public.leads FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = leads.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: leads leads owner read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "leads owner read" ON public.leads;
CREATE POLICY "leads owner read" ON public.leads FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = leads.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: leads leads owner update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "leads owner update" ON public.leads;
CREATE POLICY "leads owner update" ON public.leads FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = leads.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: leads leads public insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "leads public insert" ON public.leads;
CREATE POLICY "leads public insert" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_ledger loyalty_ledger_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS loyalty_ledger_owner_read ON public.loyalty_ledger;
CREATE POLICY loyalty_ledger_owner_read ON public.loyalty_ledger FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_ledger.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: loyalty_ledger loyalty_ledger_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS loyalty_ledger_self_read ON public.loyalty_ledger;
CREATE POLICY loyalty_ledger_self_read ON public.loyalty_ledger FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: loyalty_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points loyalty_points_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS loyalty_points_owner_read ON public.loyalty_points;
CREATE POLICY loyalty_points_owner_read ON public.loyalty_points FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_points.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: loyalty_points loyalty_points_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS loyalty_points_self_read ON public.loyalty_points;
CREATE POLICY loyalty_points_self_read ON public.loyalty_points FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: loyalty_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_settings loyalty_settings_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS loyalty_settings_owner_all ON public.loyalty_settings;
CREATE POLICY loyalty_settings_owner_all ON public.loyalty_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_settings.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_settings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: loyalty_settings loyalty_settings_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS loyalty_settings_public_read ON public.loyalty_settings;
CREATE POLICY loyalty_settings_public_read ON public.loyalty_settings FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_settings.shop_id) AND (s.is_active = true))))));


--
-- Name: marketing_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_campaigns marketing_campaigns_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS marketing_campaigns_owner_all ON public.marketing_campaigns;
CREATE POLICY marketing_campaigns_owner_all ON public.marketing_campaigns TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = marketing_campaigns.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = marketing_campaigns.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: marketplace_cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

--
-- Name: medications medications_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS medications_owner_all ON public.medications;
CREATE POLICY medications_owner_all ON public.medications TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: menu_item_option_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_option_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items menu_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_items_owner_all ON public.menu_items;
CREATE POLICY menu_items_owner_all ON public.menu_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_items.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_items.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_items menu_items_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_items_public_read ON public.menu_items;
CREATE POLICY menu_items_public_read ON public.menu_items FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_items.shop_id) AND (s.is_active = true))))));


--
-- Name: menu_items menu_items_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_items_staff_read ON public.menu_items;
CREATE POLICY menu_items_staff_read ON public.menu_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_items.shop_id)))));


--
-- Name: menu_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_reviews menu_reviews_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_reviews_owner_all ON public.menu_reviews;
CREATE POLICY menu_reviews_owner_all ON public.menu_reviews TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_reviews.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_reviews.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_reviews menu_reviews_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_reviews_public_read ON public.menu_reviews;
CREATE POLICY menu_reviews_public_read ON public.menu_reviews FOR SELECT USING ((is_visible = true));


--
-- Name: menu_reviews menu_reviews_self_delete; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_reviews_self_delete ON public.menu_reviews;
CREATE POLICY menu_reviews_self_delete ON public.menu_reviews FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: menu_reviews menu_reviews_self_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_reviews_self_insert ON public.menu_reviews;
CREATE POLICY menu_reviews_self_insert ON public.menu_reviews FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = menu_reviews.order_id) AND (o.customer_user_id = auth.uid()) AND (o.status = 'completed'::public.order_status))))));


--
-- Name: menu_reviews menu_reviews_self_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS menu_reviews_self_update ON public.menu_reviews;
CREATE POLICY menu_reviews_self_update ON public.menu_reviews FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: open_bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.open_bills ENABLE ROW LEVEL SECURITY;

--
-- Name: open_bills open_bills_access; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS open_bills_access ON public.open_bills;
CREATE POLICY open_bills_access ON public.open_bills TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id)) WITH CHECK (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: menu_item_option_groups option_groups_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS option_groups_owner_all ON public.menu_item_option_groups;
CREATE POLICY option_groups_owner_all ON public.menu_item_option_groups TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_option_groups.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_option_groups.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_item_option_groups option_groups_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS option_groups_public_read ON public.menu_item_option_groups;
CREATE POLICY option_groups_public_read ON public.menu_item_option_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_option_groups.shop_id) AND (s.is_active = true)))));


--
-- Name: menu_item_option_groups option_groups_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS option_groups_staff_read ON public.menu_item_option_groups;
CREATE POLICY option_groups_staff_read ON public.menu_item_option_groups FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_item_option_groups.shop_id)))));


--
-- Name: menu_item_options options_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS options_owner_all ON public.menu_item_options;
CREATE POLICY options_owner_all ON public.menu_item_options TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_options.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_options.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_item_options options_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS options_public_read ON public.menu_item_options;
CREATE POLICY options_public_read ON public.menu_item_options FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_options.shop_id) AND (s.is_active = true))))));


--
-- Name: menu_item_options options_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS options_staff_read ON public.menu_item_options;
CREATE POLICY options_staff_read ON public.menu_item_options FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_item_options.shop_id)))));


--
-- Name: order_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: order_disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_access; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS order_items_access ON public.order_items;
CREATE POLICY order_items_access ON public.order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_outlet_access(auth.uid(), o.outlet_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_outlet_access(auth.uid(), o.outlet_id)))));


--
-- Name: order_items order_items_customer_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS order_items_customer_insert ON public.order_items;
CREATE POLICY order_items_customer_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_user_id = auth.uid()) AND ((o.status)::text = 'pending'::text)))));


--
-- Name: order_items order_items_customer_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS order_items_customer_self_read ON public.order_items;
CREATE POLICY order_items_customer_self_read ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_user_id = auth.uid())))));


--
-- Name: order_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: order_messages order_messages_participants_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS order_messages_participants_insert ON public.order_messages;
CREATE POLICY order_messages_participants_insert ON public.order_messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_messages.order_id) AND (o.shop_id = order_messages.shop_id) AND ((o.customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.shops s
          WHERE ((s.id = o.shop_id) AND (s.owner_id = auth.uid()))))))))));


--
-- Name: order_messages order_messages_participants_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS order_messages_participants_read ON public.order_messages;
CREATE POLICY order_messages_participants_read ON public.order_messages FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_messages.order_id) AND ((o.customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.shops s
          WHERE ((s.id = o.shop_id) AND (s.owner_id = auth.uid())))))))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_access; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS orders_access ON public.orders;
CREATE POLICY orders_access ON public.orders TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id)) WITH CHECK (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: orders orders_courier_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS orders_courier_read ON public.orders;
CREATE POLICY orders_courier_read ON public.orders FOR SELECT TO authenticated USING (((courier_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.couriers c
  WHERE ((c.id = orders.courier_id) AND (c.user_id = auth.uid()))))));


--
-- Name: orders orders_courier_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS orders_courier_update ON public.orders;
CREATE POLICY orders_courier_update ON public.orders FOR UPDATE TO authenticated USING (((courier_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.couriers c
  WHERE ((c.id = orders.courier_id) AND (c.user_id = auth.uid())))))) WITH CHECK (((courier_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.couriers c
  WHERE ((c.id = orders.courier_id) AND (c.user_id = auth.uid()))))));


--
-- Name: orders orders_customer_insert_online; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS orders_customer_insert_online ON public.orders;
CREATE POLICY orders_customer_insert_online ON public.orders FOR INSERT TO authenticated WITH CHECK (((channel = 'online'::public.order_channel) AND (customer_user_id = auth.uid()) AND ((status)::text = 'pending'::text)));


--
-- Name: orders orders_customer_pay_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS orders_customer_pay_update ON public.orders;
CREATE POLICY orders_customer_pay_update ON public.orders FOR UPDATE TO authenticated USING (((customer_user_id = auth.uid()) AND (channel = 'online'::public.order_channel) AND ((status)::text = 'pending'::text))) WITH CHECK (((customer_user_id = auth.uid()) AND (channel = 'online'::public.order_channel)));


--
-- Name: orders orders_customer_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS orders_customer_self_read ON public.orders;
CREATE POLICY orders_customer_self_read ON public.orders FOR SELECT TO authenticated USING ((customer_user_id = auth.uid()));


--
-- Name: outlet_couriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outlet_couriers ENABLE ROW LEVEL SECURITY;

--
-- Name: outlets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

--
-- Name: outlets outlets_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS outlets_owner_all ON public.outlets;
CREATE POLICY outlets_owner_all ON public.outlets TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = outlets.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = outlets.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: outlets outlets_public_read_active; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS outlets_public_read_active ON public.outlets;
CREATE POLICY outlets_public_read_active ON public.outlets FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = outlets.shop_id) AND (s.is_active = true))))));


--
-- Name: outlets outlets_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS outlets_staff_read ON public.outlets;
CREATE POLICY outlets_staff_read ON public.outlets FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND ((r.outlet_id = outlets.id) OR (r.shop_id = outlets.shop_id))))));


--
-- Name: custom_order_quotes owner_all_custom_order_quotes; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_custom_order_quotes ON public.custom_order_quotes;
CREATE POLICY owner_all_custom_order_quotes ON public.custom_order_quotes TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: fnb_combos owner_all_fnb_combos; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_fnb_combos ON public.fnb_combos;
CREATE POLICY owner_all_fnb_combos ON public.fnb_combos USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: freelance_contracts owner_all_freelance_contracts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_freelance_contracts ON public.freelance_contracts;
CREATE POLICY owner_all_freelance_contracts ON public.freelance_contracts USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: job_deliverables owner_all_job_deliverables; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_job_deliverables ON public.job_deliverables;
CREATE POLICY owner_all_job_deliverables ON public.job_deliverables TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: patient_records owner_all_patient_records; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_patient_records ON public.patient_records;
CREATE POLICY owner_all_patient_records ON public.patient_records TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: patient_visits owner_all_patient_visits; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_patient_visits ON public.patient_visits;
CREATE POLICY owner_all_patient_visits ON public.patient_visits TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_portfolio owner_all_portfolio; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_portfolio ON public.shop_portfolio;
CREATE POLICY owner_all_portfolio ON public.shop_portfolio USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: rental_bookings owner_all_rental_bookings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_rental_bookings ON public.rental_bookings;
CREATE POLICY owner_all_rental_bookings ON public.rental_bookings USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: rental_units owner_all_rental_units; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_rental_units ON public.rental_units;
CREATE POLICY owner_all_rental_units ON public.rental_units USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_size_charts owner_all_size_charts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_size_charts ON public.shop_size_charts;
CREATE POLICY owner_all_size_charts ON public.shop_size_charts USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_locations owner_all_studio_locations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_studio_locations ON public.studio_locations;
CREATE POLICY owner_all_studio_locations ON public.studio_locations TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_packages owner_all_studio_packages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_all_studio_packages ON public.studio_packages;
CREATE POLICY owner_all_studio_packages ON public.studio_packages USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: withdrawal_requests owner_create_withdrawal; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_create_withdrawal ON public.withdrawal_requests;
CREATE POLICY owner_create_withdrawal ON public.withdrawal_requests FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = withdrawal_requests.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: custom_order_requests owner_delete_custom_order; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_delete_custom_order ON public.custom_order_requests;
CREATE POLICY owner_delete_custom_order ON public.custom_order_requests FOR DELETE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: custom_order_status_history owner_insert_cor_history; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_insert_cor_history ON public.custom_order_status_history;
CREATE POLICY owner_insert_cor_history ON public.custom_order_status_history FOR INSERT WITH CHECK ((request_id IN ( SELECT cor.id
   FROM (public.custom_order_requests cor
     JOIN public.shops cs ON ((cs.id = cor.shop_id)))
  WHERE (cs.owner_id = auth.uid()))));


--
-- Name: shop_chat_messages owner_insert_messages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_insert_messages ON public.shop_chat_messages;
CREATE POLICY owner_insert_messages ON public.shop_chat_messages FOR INSERT WITH CHECK (((sender_role = 'seller'::text) AND (sender_id = auth.uid()) AND (shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))));


--
-- Name: expiry_reminder_shop_rules owner_manage_own_shop_reminder_rules; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_manage_own_shop_reminder_rules ON public.expiry_reminder_shop_rules;
CREATE POLICY owner_manage_own_shop_reminder_rules ON public.expiry_reminder_shop_rules TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_rules.shop_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_rules.shop_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: expiry_reminder_shop_settings owner_manage_own_shop_reminder_settings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_manage_own_shop_reminder_settings ON public.expiry_reminder_shop_settings;
CREATE POLICY owner_manage_own_shop_reminder_settings ON public.expiry_reminder_shop_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_settings.shop_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_settings.shop_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: wallet_topup_presets owner_manage_presets; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_manage_presets ON public.wallet_topup_presets;
CREATE POLICY owner_manage_presets ON public.wallet_topup_presets USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topup_presets.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topup_presets.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_membership_tiers owner_manage_tiers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_manage_tiers ON public.shop_membership_tiers;
CREATE POLICY owner_manage_tiers ON public.shop_membership_tiers USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_membership_tiers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_membership_tiers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: owner_notifications owner_notif_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_notif_owner_read ON public.owner_notifications;
CREATE POLICY owner_notif_owner_read ON public.owner_notifications FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = owner_notifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: owner_notifications owner_notif_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_notif_owner_update ON public.owner_notifications;
CREATE POLICY owner_notif_owner_update ON public.owner_notifications FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = owner_notifications.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = owner_notifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: owner_notifications owner_notif_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_notif_super_admin_all ON public.owner_notifications;
CREATE POLICY owner_notif_super_admin_all ON public.owner_notifications TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: owner_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_order_status_history owner_read_cor_history; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_read_cor_history ON public.custom_order_status_history;
CREATE POLICY owner_read_cor_history ON public.custom_order_status_history FOR SELECT USING ((request_id IN ( SELECT cor.id
   FROM (public.custom_order_requests cor
     JOIN public.shops cs ON ((cs.id = cor.shop_id)))
  WHERE (cs.owner_id = auth.uid()))));


--
-- Name: custom_order_requests owner_read_custom_order; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_read_custom_order ON public.custom_order_requests;
CREATE POLICY owner_read_custom_order ON public.custom_order_requests FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_reviews owner_reply_review; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_reply_review ON public.product_reviews;
CREATE POLICY owner_reply_review ON public.product_reviews FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_reviews.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_chat_messages owner_select_messages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_select_messages ON public.shop_chat_messages;
CREATE POLICY owner_select_messages ON public.shop_chat_messages FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_chats owner_select_shop_chat; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_select_shop_chat ON public.shop_chats;
CREATE POLICY owner_select_shop_chat ON public.shop_chats FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: custom_order_requests owner_update_custom_order; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_update_custom_order ON public.custom_order_requests;
CREATE POLICY owner_update_custom_order ON public.custom_order_requests FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_chat_messages owner_update_messages_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_update_messages_read ON public.shop_chat_messages;
CREATE POLICY owner_update_messages_read ON public.shop_chat_messages FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_chats owner_update_shop_chat; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_update_shop_chat ON public.shop_chats;
CREATE POLICY owner_update_shop_chat ON public.shop_chats FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_wallets owner_view_wallet; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_view_wallet ON public.shop_wallets;
CREATE POLICY owner_view_wallet ON public.shop_wallets FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_wallets.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: wallet_transactions owner_view_wallet_txn; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_view_wallet_txn ON public.wallet_transactions;
CREATE POLICY owner_view_wallet_txn ON public.wallet_transactions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_transactions.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: withdrawal_requests owner_view_withdrawals; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS owner_view_withdrawals ON public.withdrawal_requests;
CREATE POLICY owner_view_withdrawals ON public.withdrawal_requests FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = withdrawal_requests.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: page_layout_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_layout_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: page_layouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: page_layouts page_layouts_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS page_layouts_owner_all ON public.page_layouts;
CREATE POLICY page_layouts_owner_all ON public.page_layouts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layouts.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layouts.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: page_layouts page_layouts_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS page_layouts_public_read ON public.page_layouts;
CREATE POLICY page_layouts_public_read ON public.page_layouts FOR SELECT USING ((is_published = true));


--
-- Name: parked_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parked_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_photographers photographers_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS photographers_owner_all ON public.studio_photographers;
CREATE POLICY photographers_owner_all ON public.studio_photographers TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_photographers photographers_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS photographers_staff_read ON public.studio_photographers;
CREATE POLICY photographers_staff_read ON public.studio_photographers FOR SELECT TO authenticated USING ((shop_id IN ( SELECT staff_members.shop_id
   FROM public.staff_members
  WHERE ((staff_members.user_id = auth.uid()) AND (staff_members.is_active = true)))));


--
-- Name: plan_features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_features plan_features_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_features_public_read ON public.plan_features;
CREATE POLICY plan_features_public_read ON public.plan_features FOR SELECT USING (true);


--
-- Name: plan_features plan_features_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_features_super_admin_write ON public.plan_features;
CREATE POLICY plan_features_super_admin_write ON public.plan_features TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: plan_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_invoices plan_invoices_owner_cancel; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_invoices_owner_cancel ON public.plan_invoices;
CREATE POLICY plan_invoices_owner_cancel ON public.plan_invoices FOR UPDATE USING (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))))) WITH CHECK (((status = ANY (ARRAY['pending'::text, 'cancelled'::text])) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: plan_invoices plan_invoices_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_invoices_owner_insert ON public.plan_invoices;
CREATE POLICY plan_invoices_owner_insert ON public.plan_invoices FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: plan_invoices plan_invoices_owner_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_invoices_owner_select ON public.plan_invoices;
CREATE POLICY plan_invoices_owner_select ON public.plan_invoices FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: plan_invoices plan_invoices_owner_update_proof; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_invoices_owner_update_proof ON public.plan_invoices;
CREATE POLICY plan_invoices_owner_update_proof ON public.plan_invoices FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))) AND (status = ANY (ARRAY['pending'::text, 'awaiting_review'::text])))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))) AND (status = ANY (ARRAY['pending'::text, 'awaiting_review'::text]))));


--
-- Name: plan_invoices plan_invoices_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_invoices_super_admin_all ON public.plan_invoices;
CREATE POLICY plan_invoices_super_admin_all ON public.plan_invoices TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: plan_subscriptions plan_subs_owner_modify; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_subs_owner_modify ON public.plan_subscriptions;
CREATE POLICY plan_subs_owner_modify ON public.plan_subscriptions TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: plan_subscriptions plan_subs_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_subs_owner_read ON public.plan_subscriptions;
CREATE POLICY plan_subs_owner_read ON public.plan_subscriptions FOR SELECT TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: plan_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_themes ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_themes plan_themes_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_themes_public_read ON public.plan_themes;
CREATE POLICY plan_themes_public_read ON public.plan_themes FOR SELECT USING (true);


--
-- Name: plan_themes plan_themes_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plan_themes_super_admin_write ON public.plan_themes;
CREATE POLICY plan_themes_super_admin_write ON public.plan_themes TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_read_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plans_read_all ON public.plans;
CREATE POLICY plans_read_all ON public.plans FOR SELECT TO authenticated USING (true);


--
-- Name: plans plans_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS plans_super_admin_write ON public.plans;
CREATE POLICY plans_super_admin_write ON public.plans TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings platform_settings_public_branding; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS platform_settings_public_branding ON public.platform_settings;
CREATE POLICY platform_settings_public_branding ON public.platform_settings FOR SELECT USING ((key = ANY (ARRAY['platform_name'::text, 'platform_logo_url'::text, 'platform_tagline'::text, 'platform_primary_color'::text])));


--
-- Name: platform_settings platform_settings_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS platform_settings_super_admin_all ON public.platform_settings;
CREATE POLICY platform_settings_super_admin_all ON public.platform_settings TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: platform_voucher_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_voucher_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_vouchers platform_vouchers_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS platform_vouchers_admin_all ON public.platform_vouchers;
CREATE POLICY platform_vouchers_admin_all ON public.platform_vouchers TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: platform_vouchers platform_vouchers_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS platform_vouchers_public_read ON public.platform_vouchers;
CREATE POLICY platform_vouchers_public_read ON public.platform_vouchers FOR SELECT USING (((is_active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((expires_at IS NULL) OR (expires_at >= now()))));


--
-- Name: po_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.po_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders po_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS po_owner_all ON public.purchase_orders;
CREATE POLICY po_owner_all ON public.purchase_orders TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = purchase_orders.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = purchase_orders.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: purchase_orders po_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS po_staff_read ON public.purchase_orders;
CREATE POLICY po_staff_read ON public.purchase_orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = purchase_orders.shop_id)))));


--
-- Name: purchase_order_items poi_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS poi_owner_all ON public.purchase_order_items;
CREATE POLICY poi_owner_all ON public.purchase_order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.purchase_orders po
     JOIN public.shops s ON ((s.id = po.shop_id)))
  WHERE ((po.id = purchase_order_items.po_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.purchase_orders po
     JOIN public.shops s ON ((s.id = po.shop_id)))
  WHERE ((po.id = purchase_order_items.po_id) AND (s.owner_id = auth.uid())))));


--
-- Name: purchase_order_items poi_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS poi_staff_read ON public.purchase_order_items;
CREATE POLICY poi_staff_read ON public.purchase_order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.purchase_orders po
     JOIN public.user_roles r ON ((r.shop_id = po.shop_id)))
  WHERE ((po.id = purchase_order_items.po_id) AND (r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: pos_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pos_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: pos_audit_log pos_audit_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pos_audit_owner_all ON public.pos_audit_log;
CREATE POLICY pos_audit_owner_all ON public.pos_audit_log TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = pos_audit_log.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = pos_audit_log.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: pos_audit_log pos_audit_staff_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pos_audit_staff_insert ON public.pos_audit_log;
CREATE POLICY pos_audit_staff_insert ON public.pos_audit_log FOR INSERT TO authenticated WITH CHECK ((cashier_id = auth.uid()));


--
-- Name: pos_audit_log pos_audit_staff_read_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pos_audit_staff_read_own ON public.pos_audit_log;
CREATE POLICY pos_audit_staff_read_own ON public.pos_audit_log FOR SELECT TO authenticated USING ((cashier_id = auth.uid()));


--
-- Name: user_preferences prefs_select_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS prefs_select_own ON public.user_preferences;
CREATE POLICY prefs_select_own ON public.user_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_preferences prefs_update_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS prefs_update_own ON public.user_preferences;
CREATE POLICY prefs_update_own ON public.user_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_preferences prefs_upsert_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS prefs_upsert_own ON public.user_preferences;
CREATE POLICY prefs_upsert_own ON public.user_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: prescription_items presc_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS presc_items_owner_all ON public.prescription_items;
CREATE POLICY presc_items_owner_all ON public.prescription_items TO authenticated USING ((prescription_id IN ( SELECT p.id
   FROM (public.prescriptions p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid())))) WITH CHECK ((prescription_id IN ( SELECT p.id
   FROM (public.prescriptions p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));


--
-- Name: prescription_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions prescriptions_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS prescriptions_owner_all ON public.prescriptions;
CREATE POLICY prescriptions_owner_all ON public.prescriptions TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: printers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_attribute_defs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_attribute_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: product_qa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;

--
-- Name: product_returns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: product_upsell_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_upsell_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_owner_read_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_owner_read_staff ON public.profiles;
CREATE POLICY profiles_owner_read_staff ON public.profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.user_roles r
     JOIN public.shops s ON ((s.id = r.shop_id)))
  WHERE ((r.user_id = profiles.id) AND (s.owner_id = auth.uid())))));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: promo_redemptions promo_red_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS promo_red_insert ON public.promo_redemptions;
CREATE POLICY promo_red_insert ON public.promo_redemptions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = promo_redemptions.order_id) AND (public.has_outlet_access(auth.uid(), o.outlet_id) OR (o.customer_user_id = auth.uid()))))));


--
-- Name: promo_redemptions promo_red_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS promo_red_owner_read ON public.promo_redemptions;
CREATE POLICY promo_red_owner_read ON public.promo_redemptions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promo_redemptions.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: promo_redemptions promo_red_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS promo_red_self_read ON public.promo_redemptions;
CREATE POLICY promo_red_self_read ON public.promo_redemptions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: promo_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: promos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

--
-- Name: promos promos_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS promos_owner_all ON public.promos;
CREATE POLICY promos_owner_all ON public.promos TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promos.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promos.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: promos promos_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS promos_public_read ON public.promos;
CREATE POLICY promos_public_read ON public.promos FOR SELECT USING (((is_active = true) AND (channel = ANY (ARRAY['online'::public.promo_channel, 'all'::public.promo_channel])) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promos.shop_id) AND (s.is_active = true))))));


--
-- Name: promos promos_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS promos_staff_read ON public.promos;
CREATE POLICY promos_staff_read ON public.promos FOR SELECT TO authenticated USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = promos.shop_id))))));


--
-- Name: outlet_couriers public read active outlet couriers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "public read active outlet couriers" ON public.outlet_couriers;
CREATE POLICY "public read active outlet couriers" ON public.outlet_couriers FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: travel_itineraries public read itineraries of active packages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "public read itineraries of active packages" ON public.travel_itineraries;
CREATE POLICY "public read itineraries of active packages" ON public.travel_itineraries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.umroh_packages p
  WHERE ((p.id = travel_itineraries.package_id) AND (p.is_active = true)))));


--
-- Name: course_certificates public verify cert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "public verify cert" ON public.course_certificates;
CREATE POLICY "public verify cert" ON public.course_certificates FOR SELECT USING (true);


--
-- Name: custom_order_requests public_insert_custom_order; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_insert_custom_order ON public.custom_order_requests;
CREATE POLICY public_insert_custom_order ON public.custom_order_requests FOR INSERT WITH CHECK (true);


--
-- Name: rental_bookings public_insert_rental_booking; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_insert_rental_booking ON public.rental_bookings;
CREATE POLICY public_insert_rental_booking ON public.rental_bookings FOR INSERT WITH CHECK (true);


--
-- Name: freelance_contracts public_read_contract_by_token; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_contract_by_token ON public.freelance_contracts;
CREATE POLICY public_read_contract_by_token ON public.freelance_contracts FOR SELECT TO authenticated, anon USING ((sign_token IS NOT NULL));


--
-- Name: custom_order_quotes public_read_custom_order_quotes; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_custom_order_quotes ON public.custom_order_quotes;
CREATE POLICY public_read_custom_order_quotes ON public.custom_order_quotes FOR SELECT USING ((status = ANY (ARRAY['sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])));


--
-- Name: fnb_combos public_read_fnb_combos; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_fnb_combos ON public.fnb_combos;
CREATE POLICY public_read_fnb_combos ON public.fnb_combos FOR SELECT USING ((is_active = true));


--
-- Name: job_deliverables public_read_job_deliverables_by_token; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_job_deliverables_by_token ON public.job_deliverables;
CREATE POLICY public_read_job_deliverables_by_token ON public.job_deliverables FOR SELECT USING ((status = ANY (ARRAY['sent'::text, 'received'::text, 'revision'::text, 'completed'::text])));


--
-- Name: shop_portfolio public_read_portfolio; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_portfolio ON public.shop_portfolio;
CREATE POLICY public_read_portfolio ON public.shop_portfolio FOR SELECT USING (true);


--
-- Name: rental_units public_read_rental_units; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_rental_units ON public.rental_units;
CREATE POLICY public_read_rental_units ON public.rental_units FOR SELECT USING ((is_active = true));


--
-- Name: shop_size_charts public_read_size_charts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_size_charts ON public.shop_size_charts;
CREATE POLICY public_read_size_charts ON public.shop_size_charts FOR SELECT USING ((is_active = true));


--
-- Name: studio_locations public_read_studio_locations; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_studio_locations ON public.studio_locations;
CREATE POLICY public_read_studio_locations ON public.studio_locations FOR SELECT USING ((is_active = true));


--
-- Name: studio_packages public_read_studio_packages; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_read_studio_packages ON public.studio_packages;
CREATE POLICY public_read_studio_packages ON public.studio_packages FOR SELECT USING ((is_active = true));


--
-- Name: freelance_contracts public_sign_contract; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_sign_contract ON public.freelance_contracts;
CREATE POLICY public_sign_contract ON public.freelance_contracts FOR UPDATE TO authenticated, anon USING (((sign_token IS NOT NULL) AND (status = ANY (ARRAY['draft'::text, 'sent'::text])))) WITH CHECK ((status = 'signed'::text));


--
-- Name: product_reviews public_view_reviews; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS public_view_reviews ON public.product_reviews;
CREATE POLICY public_view_reviews ON public.product_reviews FOR SELECT USING ((NOT is_hidden));


--
-- Name: purchase_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_voucher_redemptions pvr_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pvr_owner_read ON public.platform_voucher_redemptions;
CREATE POLICY pvr_owner_read ON public.platform_voucher_redemptions FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: product_qa qa_owner_delete; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS qa_owner_delete ON public.product_qa;
CREATE POLICY qa_owner_delete ON public.product_qa FOR DELETE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_qa qa_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS qa_owner_read ON public.product_qa;
CREATE POLICY qa_owner_read ON public.product_qa FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_qa qa_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS qa_owner_update ON public.product_qa;
CREATE POLICY qa_owner_update ON public.product_qa FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_qa qa_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS qa_public_read ON public.product_qa;
CREATE POLICY qa_public_read ON public.product_qa FOR SELECT USING ((is_hidden = false));


--
-- Name: product_qa qa_user_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS qa_user_insert ON public.product_qa;
CREATE POLICY qa_user_insert ON public.product_qa FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: product_qa qa_user_read_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS qa_user_read_own ON public.product_qa;
CREATE POLICY qa_user_read_own ON public.product_qa FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: recipes recipes_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS recipes_owner_all ON public.recipes;
CREATE POLICY recipes_owner_all ON public.recipes TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.menu_items m
     JOIN public.shops s ON ((s.id = m.shop_id)))
  WHERE ((m.id = recipes.menu_item_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items m
     JOIN public.shops s ON ((s.id = m.shop_id)))
  WHERE ((m.id = recipes.menu_item_id) AND (s.owner_id = auth.uid())))));


--
-- Name: recipes recipes_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS recipes_staff_read ON public.recipes;
CREATE POLICY recipes_staff_read ON public.recipes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.menu_items m
     JOIN public.user_roles r ON ((r.shop_id = m.shop_id)))
  WHERE ((m.id = recipes.menu_item_id) AND (r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: refunds refunds_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS refunds_owner_all ON public.refunds;
CREATE POLICY refunds_owner_all ON public.refunds TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = refunds.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = refunds.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: refunds refunds_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS refunds_staff_read ON public.refunds;
CREATE POLICY refunds_staff_read ON public.refunds FOR SELECT TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: rental_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_inspections rental_insp_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS rental_insp_owner_all ON public.rental_inspections;
CREATE POLICY rental_insp_owner_all ON public.rental_inspections TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: rental_inspections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rental_inspections ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_reschedule_tokens reschedule_tokens_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS reschedule_tokens_public_read ON public.booking_reschedule_tokens;
CREATE POLICY reschedule_tokens_public_read ON public.booking_reschedule_tokens FOR SELECT USING (((used_at IS NULL) AND (expires_at > now())));


--
-- Name: restock_subscribers restock_sub_insert_anyone; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS restock_sub_insert_anyone ON public.restock_subscribers;
CREATE POLICY restock_sub_insert_anyone ON public.restock_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: restock_subscribers restock_sub_owner_delete; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS restock_sub_owner_delete ON public.restock_subscribers;
CREATE POLICY restock_sub_owner_delete ON public.restock_subscribers FOR DELETE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: restock_subscribers restock_sub_owner_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS restock_sub_owner_select ON public.restock_subscribers;
CREATE POLICY restock_sub_owner_select ON public.restock_subscribers FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: restock_subscribers restock_sub_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS restock_sub_owner_update ON public.restock_subscribers;
CREATE POLICY restock_sub_owner_update ON public.restock_subscribers FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: restock_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restock_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_returns returns_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS returns_owner_all ON public.product_returns;
CREATE POLICY returns_owner_all ON public.product_returns TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: booking_reviews review_insert_owner; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS review_insert_owner ON public.booking_reviews;
CREATE POLICY review_insert_owner ON public.booking_reviews FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));


--
-- Name: booking_reviews review_owner_update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS review_owner_update ON public.booking_reviews;
CREATE POLICY review_owner_update ON public.booking_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: booking_reviews review_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS review_public_read ON public.booking_reviews;
CREATE POLICY review_public_read ON public.booking_reviews FOR SELECT USING (true);


--
-- Name: booking_review_requests rrq_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS rrq_insert ON public.booking_review_requests;
CREATE POLICY rrq_insert ON public.booking_review_requests FOR INSERT WITH CHECK (true);


--
-- Name: booking_review_requests rrq_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS rrq_read ON public.booking_review_requests;
CREATE POLICY rrq_read ON public.booking_review_requests FOR SELECT USING (true);


--
-- Name: booking_review_requests rrq_update_scoped; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS rrq_update_scoped ON public.booking_review_requests;
CREATE POLICY rrq_update_scoped ON public.booking_review_requests FOR UPDATE TO authenticated USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = ( SELECT b.shop_id
           FROM public.bookings b
          WHERE (b.id = booking_review_requests.id))) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: sales_offerings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_offerings ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_offerings sales_offerings owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "sales_offerings owner all" ON public.sales_offerings;
CREATE POLICY "sales_offerings owner all" ON public.sales_offerings USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = sales_offerings.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = sales_offerings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: sales_offerings sales_offerings public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "sales_offerings public read" ON public.sales_offerings;
CREATE POLICY "sales_offerings public read" ON public.sales_offerings FOR SELECT USING (true);


--
-- Name: service_bundle_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_bundle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: service_bundle_items service_bundle_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS service_bundle_items_owner_all ON public.service_bundle_items;
CREATE POLICY service_bundle_items_owner_all ON public.service_bundle_items TO authenticated USING ((bundle_id IN ( SELECT service_bundles.id
   FROM public.service_bundles
  WHERE (service_bundles.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid())))))) WITH CHECK ((bundle_id IN ( SELECT service_bundles.id
   FROM public.service_bundles
  WHERE (service_bundles.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid()))))));


--
-- Name: service_bundle_items service_bundle_items_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS service_bundle_items_public_read ON public.service_bundle_items;
CREATE POLICY service_bundle_items_public_read ON public.service_bundle_items FOR SELECT USING ((bundle_id IN ( SELECT service_bundles.id
   FROM public.service_bundles
  WHERE (service_bundles.is_active = true))));


--
-- Name: service_bundles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_bundles ENABLE ROW LEVEL SECURITY;

--
-- Name: service_bundles service_bundles_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS service_bundles_owner_all ON public.service_bundles;
CREATE POLICY service_bundles_owner_all ON public.service_bundles TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: service_bundles service_bundles_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS service_bundles_public_read ON public.service_bundles;
CREATE POLICY service_bundles_public_read ON public.service_bundles FOR SELECT USING ((is_active = true));


--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts shifts_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shifts_owner_all ON public.shifts;
CREATE POLICY shifts_owner_all ON public.shifts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shifts.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shifts.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shifts shifts_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shifts_self_read ON public.shifts;
CREATE POLICY shifts_self_read ON public.shifts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: order_audit_log shop members insert order audit; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop members insert order audit" ON public.order_audit_log;
CREATE POLICY "shop members insert order audit" ON public.order_audit_log FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: travel_itineraries shop members manage itineraries; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop members manage itineraries" ON public.travel_itineraries;
CREATE POLICY "shop members manage itineraries" ON public.travel_itineraries USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_itineraries.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_itineraries.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: travel_jamaah_documents shop members manage jamaah docs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop members manage jamaah docs" ON public.travel_jamaah_documents;
CREATE POLICY "shop members manage jamaah docs" ON public.travel_jamaah_documents USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_jamaah_documents.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_jamaah_documents.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: outlet_couriers shop members manage outlet couriers; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop members manage outlet couriers" ON public.outlet_couriers;
CREATE POLICY "shop members manage outlet couriers" ON public.outlet_couriers TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id)) WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: order_audit_log shop members read order audit; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop members read order audit" ON public.order_audit_log;
CREATE POLICY "shop members read order audit" ON public.order_audit_log FOR SELECT TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: course_certificates shop owner reads certs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop owner reads certs" ON public.course_certificates;
CREATE POLICY "shop owner reads certs" ON public.course_certificates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = course_certificates.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_about; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_about ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_about shop_about owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop_about owner all" ON public.shop_about;
CREATE POLICY "shop_about owner all" ON public.shop_about USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_about.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_about.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_about shop_about public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "shop_about public read" ON public.shop_about;
CREATE POLICY "shop_about public read" ON public.shop_about FOR SELECT USING (true);


--
-- Name: shop_backups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_backups ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_backups shop_backups_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_backups_owner_insert ON public.shop_backups;
CREATE POLICY shop_backups_owner_insert ON public.shop_backups FOR INSERT TO authenticated WITH CHECK (((requested_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_backups.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: shop_backups shop_backups_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_backups_owner_read ON public.shop_backups;
CREATE POLICY shop_backups_owner_read ON public.shop_backups FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_backups.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: shop_backups shop_backups_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_backups_super_admin_write ON public.shop_backups;
CREATE POLICY shop_backups_super_admin_write ON public.shop_backups TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: shop_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_chats ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_customers shop_customers_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_customers_owner_all ON public.shop_customers;
CREATE POLICY shop_customers_owner_all ON public.shop_customers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_customers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_customers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_customers shop_customers_self_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_customers_self_read ON public.shop_customers;
CREATE POLICY shop_customers_self_read ON public.shop_customers FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: shop_membership_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_membership_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_portfolio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_portfolio ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_size_charts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_size_charts ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_verifications shop_verifications_owner_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_verifications_owner_insert ON public.shop_verifications;
CREATE POLICY shop_verifications_owner_insert ON public.shop_verifications FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_verifications shop_verifications_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_verifications_owner_read ON public.shop_verifications;
CREATE POLICY shop_verifications_owner_read ON public.shop_verifications FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_verifications shop_verifications_owner_update_pending; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_verifications_owner_update_pending ON public.shop_verifications;
CREATE POLICY shop_verifications_owner_update_pending ON public.shop_verifications FOR UPDATE TO authenticated USING (((status = ANY (ARRAY['rejected'::text, 'expired'::text])) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_verifications shop_verifications_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shop_verifications_super_admin_all ON public.shop_verifications;
CREATE POLICY shop_verifications_super_admin_all ON public.shop_verifications TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: shop_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

--
-- Name: shops shops_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shops_owner_all ON public.shops;
CREATE POLICY shops_owner_all ON public.shops TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


--
-- Name: shops shops_public_read_active; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS shops_public_read_active ON public.shops;
CREATE POLICY shops_public_read_active ON public.shops FOR SELECT USING (((is_active = true) AND (suspended_at IS NULL)));


--
-- Name: booking_slots slots_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS slots_owner_all ON public.booking_slots;
CREATE POLICY slots_owner_all ON public.booking_slots USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_slots.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_slots.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: booking_slots slots_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS slots_public_read ON public.booking_slots;
CREATE POLICY slots_public_read ON public.booking_slots FOR SELECT USING ((is_active = true));


--
-- Name: staff_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_invitations staff_inv_accept; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS staff_inv_accept ON public.staff_invitations;
CREATE POLICY staff_inv_accept ON public.staff_invitations FOR UPDATE TO authenticated USING (((accepted_at IS NULL) AND (expires_at > now()) AND (lower(email) = lower((auth.jwt() ->> 'email'::text))))) WITH CHECK ((accepted_by = auth.uid()));


--
-- Name: staff_invitations staff_inv_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS staff_inv_owner_all ON public.staff_invitations;
CREATE POLICY staff_inv_owner_all ON public.staff_invitations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_invitations.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_invitations.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: staff_invitations staff_inv_token_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS staff_inv_token_read ON public.staff_invitations;
CREATE POLICY staff_inv_token_read ON public.staff_invitations FOR SELECT TO authenticated, anon USING (((accepted_at IS NULL) AND (expires_at > now())));


--
-- Name: staff_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_members staff_members_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS staff_members_owner_all ON public.staff_members;
CREATE POLICY staff_members_owner_all ON public.staff_members TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_members.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_members.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: staff_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements stock_movements_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS stock_movements_owner_all ON public.stock_movements;
CREATE POLICY stock_movements_owner_all ON public.stock_movements TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_movements.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_movements.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: stock_movements stock_movements_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS stock_movements_staff_read ON public.stock_movements;
CREATE POLICY stock_movements_staff_read ON public.stock_movements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = stock_movements.shop_id)))));


--
-- Name: stock_opname_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_opname_items stock_opname_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS stock_opname_items_owner_all ON public.stock_opname_items;
CREATE POLICY stock_opname_items_owner_all ON public.stock_opname_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.stock_opnames o
     JOIN public.shops s ON ((s.id = o.shop_id)))
  WHERE ((o.id = stock_opname_items.stock_opname_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.stock_opnames o
     JOIN public.shops s ON ((s.id = o.shop_id)))
  WHERE ((o.id = stock_opname_items.stock_opname_id) AND (s.owner_id = auth.uid())))));


--
-- Name: stock_opname_items stock_opname_items_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS stock_opname_items_staff_read ON public.stock_opname_items;
CREATE POLICY stock_opname_items_staff_read ON public.stock_opname_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.stock_opnames o
     JOIN public.user_roles r ON ((r.shop_id = o.shop_id)))
  WHERE ((o.id = stock_opname_items.stock_opname_id) AND (r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: stock_opnames; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_opnames ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_opnames stock_opnames_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS stock_opnames_owner_all ON public.stock_opnames;
CREATE POLICY stock_opnames_owner_all ON public.stock_opnames TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_opnames.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_opnames.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: stock_opnames stock_opnames_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS stock_opnames_staff_read ON public.stock_opnames;
CREATE POLICY stock_opnames_staff_read ON public.stock_opnames FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.shop_id = stock_opnames.shop_id) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: course_certificates student reads own cert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "student reads own cert" ON public.course_certificates;
CREATE POLICY "student reads own cert" ON public.course_certificates FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: studio_galleries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_galleries ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_gallery_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_gallery_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_photographers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_photographers ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_reminder_rules super_admin_all_expiry_rules; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS super_admin_all_expiry_rules ON public.expiry_reminder_rules;
CREATE POLICY super_admin_all_expiry_rules ON public.expiry_reminder_rules TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: expiry_reminder_shop_rules super_admin_all_shop_reminder_rules; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS super_admin_all_shop_reminder_rules ON public.expiry_reminder_shop_rules;
CREATE POLICY super_admin_all_shop_reminder_rules ON public.expiry_reminder_shop_rules TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: expiry_reminder_shop_settings super_admin_all_shop_reminder_settings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS super_admin_all_shop_reminder_settings ON public.expiry_reminder_shop_settings;
CREATE POLICY super_admin_all_shop_reminder_settings ON public.expiry_reminder_shop_settings TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers suppliers_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS suppliers_owner_all ON public.suppliers;
CREATE POLICY suppliers_owner_all ON public.suppliers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = suppliers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = suppliers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: suppliers suppliers_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS suppliers_staff_read ON public.suppliers;
CREATE POLICY suppliers_staff_read ON public.suppliers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = suppliers.shop_id)))));


--
-- Name: system_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: system_audit system_audit_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS system_audit_super_admin_read ON public.system_audit;
CREATE POLICY system_audit_super_admin_read ON public.system_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials testimonials owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "testimonials owner all" ON public.testimonials;
CREATE POLICY "testimonials owner all" ON public.testimonials USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = testimonials.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = testimonials.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: testimonials testimonials public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "testimonials public read" ON public.testimonials;
CREATE POLICY "testimonials public read" ON public.testimonials FOR SELECT USING (true);


--
-- Name: themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

--
-- Name: themes themes_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS themes_public_read ON public.themes;
CREATE POLICY themes_public_read ON public.themes FOR SELECT USING (true);


--
-- Name: themes themes_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS themes_super_admin_write ON public.themes;
CREATE POLICY themes_super_admin_write ON public.themes TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: travel_installments travel_inst_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS travel_inst_owner_all ON public.travel_installments;
CREATE POLICY travel_inst_owner_all ON public.travel_installments TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: travel_installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_installments ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_itineraries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_itineraries ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_jamaah_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_jamaah_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_jamaah_manifest; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_jamaah_manifest ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_jamaah_manifest travel_manifest_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS travel_manifest_owner_all ON public.travel_jamaah_manifest;
CREATE POLICY travel_manifest_owner_all ON public.travel_jamaah_manifest TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: customer_treatments treatments_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS treatments_owner_all ON public.customer_treatments;
CREATE POLICY treatments_owner_all ON public.customer_treatments TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: umroh_facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.umroh_facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: umroh_facilities umroh_facilities owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "umroh_facilities owner all" ON public.umroh_facilities;
CREATE POLICY "umroh_facilities owner all" ON public.umroh_facilities USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_facilities.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_facilities.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: umroh_facilities umroh_facilities public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "umroh_facilities public read" ON public.umroh_facilities;
CREATE POLICY "umroh_facilities public read" ON public.umroh_facilities FOR SELECT USING (true);


--
-- Name: umroh_faqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.umroh_faqs ENABLE ROW LEVEL SECURITY;

--
-- Name: umroh_faqs umroh_faqs owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "umroh_faqs owner all" ON public.umroh_faqs;
CREATE POLICY "umroh_faqs owner all" ON public.umroh_faqs USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_faqs.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_faqs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: umroh_faqs umroh_faqs public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "umroh_faqs public read" ON public.umroh_faqs;
CREATE POLICY "umroh_faqs public read" ON public.umroh_faqs FOR SELECT USING (true);


--
-- Name: umroh_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.umroh_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: umroh_packages umroh_packages owner all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "umroh_packages owner all" ON public.umroh_packages;
CREATE POLICY "umroh_packages owner all" ON public.umroh_packages USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_packages.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_packages.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: umroh_packages umroh_packages public read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "umroh_packages public read" ON public.umroh_packages;
CREATE POLICY "umroh_packages public read" ON public.umroh_packages FOR SELECT USING (true);


--
-- Name: product_upsell_suggestions upsell_owner_manage; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS upsell_owner_manage ON public.product_upsell_suggestions;
CREATE POLICY upsell_owner_manage ON public.product_upsell_suggestions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_upsell_suggestions.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_upsell_suggestions.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_upsell_suggestions upsell_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS upsell_public_read ON public.product_upsell_suggestions;
CREATE POLICY upsell_public_read ON public.product_upsell_suggestions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: product_reviews user_create_review; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_create_review ON public.product_reviews;
CREATE POLICY user_create_review ON public.product_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: product_reviews user_delete_own_review; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_delete_own_review ON public.product_reviews;
CREATE POLICY user_delete_own_review ON public.product_reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: marketplace_carts user_own_cart; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_own_cart ON public.marketplace_carts;
CREATE POLICY user_own_cart ON public.marketplace_carts USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: marketplace_cart_items user_own_cart_items; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_own_cart_items ON public.marketplace_cart_items;
CREATE POLICY user_own_cart_items ON public.marketplace_cart_items USING ((EXISTS ( SELECT 1
   FROM public.marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = auth.uid())))));


--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_owner_delete; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_roles_owner_delete ON public.user_roles;
CREATE POLICY user_roles_owner_delete ON public.user_roles FOR DELETE TO authenticated USING (((shop_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = user_roles.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: user_roles user_roles_owner_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_roles_owner_read ON public.user_roles;
CREATE POLICY user_roles_owner_read ON public.user_roles FOR SELECT TO authenticated USING (((shop_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = user_roles.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: user_roles user_roles_select_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: product_reviews user_update_own_review; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS user_update_own_review ON public.product_reviews;
CREATE POLICY user_update_own_review ON public.product_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions users manage own push subs delete; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users manage own push subs delete" ON public.push_subscriptions;
CREATE POLICY "users manage own push subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: push_subscriptions users manage own push subs insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users manage own push subs insert" ON public.push_subscriptions;
CREATE POLICY "users manage own push subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: push_subscriptions users manage own push subs select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users manage own push subs select" ON public.push_subscriptions;
CREATE POLICY "users manage own push subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: push_subscriptions users manage own push subs update; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users manage own push subs update" ON public.push_subscriptions;
CREATE POLICY "users manage own push subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications users_update_own_notifications; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS users_update_own_notifications ON public.notifications;
CREATE POLICY users_update_own_notifications ON public.notifications FOR UPDATE USING ((auth.uid() = recipient_user_id));


--
-- Name: notifications users_view_own_notifications; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS users_view_own_notifications ON public.notifications;
CREATE POLICY users_view_own_notifications ON public.notifications FOR SELECT USING ((auth.uid() = recipient_user_id));


--
-- Name: menu_item_variants variants_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS variants_owner_all ON public.menu_item_variants;
CREATE POLICY variants_owner_all ON public.menu_item_variants USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_variants.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_variants.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_item_variants variants_public_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS variants_public_read ON public.menu_item_variants;
CREATE POLICY variants_public_read ON public.menu_item_variants FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_variants.shop_id) AND (s.is_active = true))))));


--
-- Name: menu_item_variants variants_staff_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS variants_staff_read ON public.menu_item_variants;
CREATE POLICY variants_staff_read ON public.menu_item_variants FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_item_variants.shop_id)))));


--
-- Name: wallet_topups view_own_topups; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS view_own_topups ON public.wallet_topups;
CREATE POLICY view_own_topups ON public.wallet_topups FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topups.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: customer_wallet_transactions view_own_wallet_tx; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS view_own_wallet_tx ON public.customer_wallet_transactions;
CREATE POLICY view_own_wallet_tx ON public.customer_wallet_transactions FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallet_transactions.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: booking_waitlist waitlist_customer_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS waitlist_customer_select ON public.booking_waitlist;
CREATE POLICY waitlist_customer_select ON public.booking_waitlist FOR SELECT USING ((auth.uid() = customer_user_id));


--
-- Name: booking_waitlist waitlist_owner_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS waitlist_owner_all ON public.booking_waitlist;
CREATE POLICY waitlist_owner_all ON public.booking_waitlist USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_waitlist.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_waitlist.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: booking_waitlist waitlist_public_insert; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS waitlist_public_insert ON public.booking_waitlist;
CREATE POLICY waitlist_public_insert ON public.booking_waitlist FOR INSERT WITH CHECK (((auth.uid() = customer_user_id) OR (customer_user_id IS NULL)));


--
-- Name: booking_waitlist waitlist_public_read_anon; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS waitlist_public_read_anon ON public.booking_waitlist;
CREATE POLICY waitlist_public_read_anon ON public.booking_waitlist FOR SELECT USING (true);


--
-- Name: wallet_topup_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_topup_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_topups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events webhook_events_no_client_read; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS webhook_events_no_client_read ON public.webhook_events;
CREATE POLICY webhook_events_no_client_read ON public.webhook_events FOR SELECT TO authenticated, anon USING (false);


--
-- Name: wishlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('admin-banners', 'admin-banners', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('builder-assets', 'builder-assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('chat-attachments', 'chat-attachments', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('contract-signatures', 'contract-signatures', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('custom-order-attachments', 'custom-order-attachments', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('customer-exports', 'customer-exports', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('delivery-proofs', 'delivery-proofs', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('flyers', 'flyers', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('menu-images', 'menu-images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('payment-proofs', 'payment-proofs', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('platform-assets', 'platform-assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('rental-inspections', 'rental-inspections', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('review-photos', 'review-photos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-backups', 'shop-backups', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-images', 'shop-images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-logos', 'shop-logos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-verifications', 'shop-verifications', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('staff-avatars', 'staff-avatars', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('studio-galleries', 'studio-galleries', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('studio-watermarks', 'studio-watermarks', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('treatment-photos', 'treatment-photos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('umroh-brochures', 'umroh-brochures', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('umroh-covers', 'umroh-covers', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES (69 policies on storage.objects)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete staff avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete staff avatars" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((bucket_id = 'staff-avatars'::text));
DROP POLICY IF EXISTS "Authenticated users can update staff avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update staff avatars" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((bucket_id = 'staff-avatars'::text));
DROP POLICY IF EXISTS "Authenticated users can upload staff avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload staff avatars" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((bucket_id = 'staff-avatars'::text));
DROP POLICY IF EXISTS "Shop owners delete builder assets" ON storage.objects;
CREATE POLICY "Shop owners delete builder assets" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'builder-assets'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
DROP POLICY IF EXISTS "Shop owners update builder assets" ON storage.objects;
CREATE POLICY "Shop owners update builder assets" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((bucket_id = 'builder-assets'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
DROP POLICY IF EXISTS "Shop owners upload builder assets" ON storage.objects;
CREATE POLICY "Shop owners upload builder assets" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'builder-assets'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'chat-attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "Users can upload their own chat attachments" ON storage.objects;
CREATE POLICY "Users can upload their own chat attachments" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'chat-attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "admin-banners admin delete" ON storage.objects;
CREATE POLICY "admin-banners admin delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])) AND has_role(auth.uid(), 'super_admin'::app_role)));
DROP POLICY IF EXISTS "admin-banners admin update" ON storage.objects;
CREATE POLICY "admin-banners admin update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])) AND has_role(auth.uid(), 'super_admin'::app_role)));
DROP POLICY IF EXISTS "admin-banners admin write" ON storage.objects;
CREATE POLICY "admin-banners admin write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])) AND has_role(auth.uid(), 'super_admin'::app_role)));
DROP POLICY IF EXISTS "admin-banners public read" ON storage.objects;
CREATE POLICY "admin-banners public read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])));
DROP POLICY IF EXISTS "brochures owner delete" ON storage.objects;
CREATE POLICY "brochures owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'umroh-brochures'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "brochures owner update" ON storage.objects;
CREATE POLICY "brochures owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((bucket_id = 'umroh-brochures'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "brochures owner write" ON storage.objects;
CREATE POLICY "brochures owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'umroh-brochures'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "custom_order_attach_insert" ON storage.objects;
CREATE POLICY "custom_order_attach_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'custom-order-attachments'::text) AND (auth.role() = 'authenticated'::text)));
DROP POLICY IF EXISTS "customer_exports_bucket_self_insert" ON storage.objects;
CREATE POLICY "customer_exports_bucket_self_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'customer-exports'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "customer_exports_bucket_self_read" ON storage.objects;
CREATE POLICY "customer_exports_bucket_self_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'customer-exports'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "delivery_proofs_courier_upload" ON storage.objects;
CREATE POLICY "delivery_proofs_courier_upload" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'delivery-proofs'::text) AND (EXISTS ( SELECT 1
   FROM couriers c
  WHERE ((c.user_id = auth.uid()) AND (c.is_active = true))))));
DROP POLICY IF EXISTS "flyers owner delete" ON storage.objects;
CREATE POLICY "flyers owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'flyers'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "flyers owner update" ON storage.objects;
CREATE POLICY "flyers owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((bucket_id = 'flyers'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "flyers owner write" ON storage.objects;
CREATE POLICY "flyers owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'flyers'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "menu_images_owner_delete" ON storage.objects;
CREATE POLICY "menu_images_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'menu-images'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(s.name))[1]))))));
DROP POLICY IF EXISTS "menu_images_owner_insert" ON storage.objects;
CREATE POLICY "menu_images_owner_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'menu-images'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(s.name))[1]))))));
DROP POLICY IF EXISTS "menu_images_owner_update" ON storage.objects;
CREATE POLICY "menu_images_owner_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'menu-images'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(s.name))[1]))))));
DROP POLICY IF EXISTS "owner delete rental-inspections" ON storage.objects;
CREATE POLICY "owner delete rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'rental-inspections'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner delete studio-galleries" ON storage.objects;
CREATE POLICY "owner delete studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'studio-galleries'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner delete treatment-photos" ON storage.objects;
CREATE POLICY "owner delete treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'treatment-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner update rental-inspections" ON storage.objects;
CREATE POLICY "owner update rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'rental-inspections'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner update studio-galleries" ON storage.objects;
CREATE POLICY "owner update studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'studio-galleries'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner update treatment-photos" ON storage.objects;
CREATE POLICY "owner update treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'treatment-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner upload rental-inspections" ON storage.objects;
CREATE POLICY "owner upload rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'rental-inspections'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner upload studio-galleries" ON storage.objects;
CREATE POLICY "owner upload studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'studio-galleries'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "owner upload treatment-photos" ON storage.objects;
CREATE POLICY "owner upload treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'treatment-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "payment_proofs_customer_insert" ON storage.objects;
CREATE POLICY "payment_proofs_customer_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE (((o.id)::text = (storage.foldername(objects.name))[2]) AND ((o.shop_id)::text = (storage.foldername(objects.name))[1]) AND (o.customer_user_id = auth.uid()))))));
DROP POLICY IF EXISTS "payment_proofs_customer_read" ON storage.objects;
CREATE POLICY "payment_proofs_customer_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE (((o.id)::text = (storage.foldername(objects.name))[2]) AND (o.customer_user_id = auth.uid()))))));
DROP POLICY IF EXISTS "payment_proofs_owner_delete" ON storage.objects;
CREATE POLICY "payment_proofs_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(objects.name))[1]))))));
DROP POLICY IF EXISTS "payment_proofs_owner_read" ON storage.objects;
CREATE POLICY "payment_proofs_owner_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((bucket_id = 'payment-proofs'::text) AND ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(objects.name))[1])))) OR has_role(auth.uid(), 'super_admin'::app_role))));
DROP POLICY IF EXISTS "payment_proofs_owner_write" ON storage.objects;
CREATE POLICY "payment_proofs_owner_write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(objects.name))[1]))))));
DROP POLICY IF EXISTS "payment_proofs_super_admin_all" ON storage.objects;
CREATE POLICY "payment_proofs_super_admin_all" ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (((bucket_id = 'payment-proofs'::text) AND has_role(auth.uid(), 'super_admin'::app_role)))
  WITH CHECK (((bucket_id = 'payment-proofs'::text) AND has_role(auth.uid(), 'super_admin'::app_role)));
DROP POLICY IF EXISTS "public read rental-inspections" ON storage.objects;
CREATE POLICY "public read rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'rental-inspections'::text));
DROP POLICY IF EXISTS "public read studio-galleries" ON storage.objects;
CREATE POLICY "public read studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'studio-galleries'::text));
DROP POLICY IF EXISTS "public read treatment-photos" ON storage.objects;
CREATE POLICY "public read treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'treatment-photos'::text));
DROP POLICY IF EXISTS "public_read_contract_signatures" ON storage.objects;
CREATE POLICY "public_read_contract_signatures" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'contract-signatures'::text));
DROP POLICY IF EXISTS "public_upload_contract_signatures" ON storage.objects;
CREATE POLICY "public_upload_contract_signatures" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO anon,authenticated
  WITH CHECK ((bucket_id = 'contract-signatures'::text));
DROP POLICY IF EXISTS "review_photos_user_delete" ON storage.objects;
CREATE POLICY "review_photos_user_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "review_photos_user_update" ON storage.objects;
CREATE POLICY "review_photos_user_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "review_photos_user_upload" ON storage.objects;
CREATE POLICY "review_photos_user_upload" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
DROP POLICY IF EXISTS "shop-images owner delete" ON storage.objects;
CREATE POLICY "shop-images owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'shop-images'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
DROP POLICY IF EXISTS "shop-images owner update" ON storage.objects;
CREATE POLICY "shop-images owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'shop-images'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
DROP POLICY IF EXISTS "shop-images owner write" ON storage.objects;
CREATE POLICY "shop-images owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-images'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
DROP POLICY IF EXISTS "shop-images public read" ON storage.objects;
CREATE POLICY "shop-images public read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'shop-images'::text));
DROP POLICY IF EXISTS "shop_backups_bucket_owner_insert" ON storage.objects;
CREATE POLICY "shop_backups_bucket_owner_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-backups'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "shop_backups_bucket_owner_read" ON storage.objects;
CREATE POLICY "shop_backups_bucket_owner_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'shop-backups'::text) AND ((EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid())))) OR has_role(auth.uid(), 'super_admin'::app_role))));
DROP POLICY IF EXISTS "shop_backups_bucket_super_admin_write" ON storage.objects;
CREATE POLICY "shop_backups_bucket_super_admin_write" ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (((bucket_id = 'shop-backups'::text) AND has_role(auth.uid(), 'super_admin'::app_role)))
  WITH CHECK (((bucket_id = 'shop-backups'::text) AND has_role(auth.uid(), 'super_admin'::app_role)));
DROP POLICY IF EXISTS "shop_logos_owner_delete" ON storage.objects;
CREATE POLICY "shop_logos_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'shop-logos'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
DROP POLICY IF EXISTS "shop_logos_owner_update" ON storage.objects;
CREATE POLICY "shop_logos_owner_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'shop-logos'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
DROP POLICY IF EXISTS "shop_logos_owner_write" ON storage.objects;
CREATE POLICY "shop_logos_owner_write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-logos'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
DROP POLICY IF EXISTS "shop_verifications_storage_owner_insert" ON storage.objects;
CREATE POLICY "shop_verifications_storage_owner_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-verifications'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "shop_verifications_storage_owner_select" ON storage.objects;
CREATE POLICY "shop_verifications_storage_owner_select" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'shop-verifications'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "shop_verifications_storage_super_admin" ON storage.objects;
CREATE POLICY "shop_verifications_storage_super_admin" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'shop-verifications'::text) AND has_role(auth.uid(), 'super_admin'::app_role)));
DROP POLICY IF EXISTS "umroh-covers owner delete" ON storage.objects;
CREATE POLICY "umroh-covers owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'umroh-covers'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
DROP POLICY IF EXISTS "umroh-covers owner update" ON storage.objects;
CREATE POLICY "umroh-covers owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'umroh-covers'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
DROP POLICY IF EXISTS "umroh-covers owner write" ON storage.objects;
CREATE POLICY "umroh-covers owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'umroh-covers'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
DROP POLICY IF EXISTS "umroh-covers public read" ON storage.objects;
CREATE POLICY "umroh-covers public read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'umroh-covers'::text));
DROP POLICY IF EXISTS "watermarks_owner_delete" ON storage.objects;
CREATE POLICY "watermarks_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'studio-watermarks'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "watermarks_owner_update" ON storage.objects;
CREATE POLICY "watermarks_owner_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'studio-watermarks'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "watermarks_owner_write" ON storage.objects;
CREATE POLICY "watermarks_owner_write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'studio-watermarks'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
DROP POLICY IF EXISTS "watermarks_public_read" ON storage.objects;
CREATE POLICY "watermarks_public_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'studio-watermarks'::text));

-- ============================================================
-- SECTION 3 — SEED DATA (reference tables)
-- ============================================================

-- =============================================================================
-- BEGIN: 05_seed_reference_data.sql
-- =============================================================================
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

INSERT INTO public.icd10_codes VALUES ('J00', 'Nasofaringitis akut (common cold)', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J02.9', 'Faringitis akut, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J03.9', 'Tonsilitis akut, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J06.9', 'Infeksi saluran napas atas akut', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J11', 'Influenza, virus tidak teridentifikasi', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J20.9', 'Bronkitis akut, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('J45.9', 'Asma, tidak spesifik', 'Respirasi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A09', 'Diare & gastroenteritis (dugaan infeksi)', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K29.7', 'Gastritis, tidak spesifik', 'Digestif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('K30', 'Dispepsia fungsional', 'Digestif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('K59.0', 'Konstipasi', 'Digestif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('B34.9', 'Infeksi virus, tidak spesifik', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A01.0', 'Demam tifoid', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A91', 'Demam berdarah dengue (DBD)', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('B54', 'Malaria, tidak spesifik', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('A15.0', 'TB paru, dengan konfirmasi bakteriologis', 'Infeksi') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R50.9', 'Demam, tidak spesifik', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R51', 'Sefalgia (sakit kepala)', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R10.4', 'Nyeri perut, tidak spesifik', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R11', 'Mual & muntah', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R05', 'Batuk', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R07.4', 'Nyeri dada, tidak spesifik', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('R42', 'Pusing & vertigo', 'Gejala') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('I10', 'Hipertensi esensial', 'Kardiovaskular') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('I20.9', 'Angina pektoris, tidak spesifik', 'Kardiovaskular') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('E11.9', 'Diabetes melitus tipe 2, tanpa komplikasi', 'Endokrin') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('E78.5', 'Hiperlipidemia, tidak spesifik', 'Endokrin') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('E03.9', 'Hipotiroidisme, tidak spesifik', 'Endokrin') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('N39.0', 'Infeksi saluran kemih, lokasi tidak spesifik', 'Urogenital') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('N76.0', 'Vaginitis akut', 'Urogenital') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L20.9', 'Dermatitis atopik', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L30.9', 'Dermatitis, tidak spesifik', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L50.9', 'Urtikaria, tidak spesifik', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('L08.9', 'Infeksi kulit dan jaringan lunak', 'Kulit') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('M54.5', 'Low back pain', 'Muskuloskeletal') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('M25.5', 'Nyeri sendi', 'Muskuloskeletal') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('M79.1', 'Mialgia', 'Muskuloskeletal') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('H10.9', 'Konjungtivitis, tidak spesifik', 'THT/Mata') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('H66.9', 'Otitis media, tidak spesifik', 'THT/Mata') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('H81.1', 'Vertigo paroksismal jinak (BPPV)', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('Z00.0', 'Pemeriksaan kesehatan umum', 'Preventif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('Z23', 'Imunisasi', 'Preventif') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('F41.1', 'Gangguan cemas menyeluruh', 'Psikiatri') ON CONFLICT DO NOTHING;
INSERT INTO public.icd10_codes VALUES ('F32.9', 'Episode depresi, tidak spesifik', 'Psikiatri') ON CONFLICT DO NOTHING;


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wallet_topup_presets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

-- =============================================================================
-- BEGIN: 06_post_consolidation.sql
-- =============================================================================
-- =============================================================================
-- FRESH SCHEMA — PART 6: Post-Consolidation Updates
-- Covers all changes added AFTER the base consolidation (00000000000000_init_schema.sql)
-- Migrations: 20260518 → 20260522 (29 migration files consolidated into one)
-- Run this file AFTER 01_core_schema.sql through 05_seed_reference_data.sql
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING)
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET row_security = off;


-- =============================================================================
-- SECTION 1 — UPDATED/NEW HELPER FUNCTIONS (required before RLS policies)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid());
$$;


-- =============================================================================
-- SECTION 2 — DROP LEGACY VIEWS (recreated as tables or updated views below)
-- =============================================================================

DROP VIEW IF EXISTS public.shop_health_score CASCADE;
DROP VIEW IF EXISTS public.courier_earnings CASCADE;
DROP VIEW IF EXISTS public.menu_hpp_view CASCADE;
DROP VIEW IF EXISTS public.v_shop_capabilities CASCADE;
DROP VIEW IF EXISTS public.coffee_shops CASCADE;


-- =============================================================================
-- SECTION 3 — ALTER EXISTING TABLES (add missing columns)
-- =============================================================================

-- orders: backward-compat generated columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS order_number text GENERATED ALWAYS AS (order_no) STORED,
  ADD COLUMN IF NOT EXISTS commission_fee numeric(14,2) GENERATED ALWAYS AS (COALESCE(commission_amount, 0)) STORED;

-- product_reviews: admin moderation columns
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS body text GENERATED ALWAYS AS (comment) STORED;

-- shops: storefront + shipping + geo columns
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS shipping_origin_province_id integer,
  ADD COLUMN IF NOT EXISTS shipping_origin_city_id integer,
  ADD COLUMN IF NOT EXISTS shipping_couriers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_maps_url text;

-- outlets: geo coordinates
ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- notifications: soft-dismiss support
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

-- loyalty_rewards: enhanced columns
ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_required integer,
  ADD COLUMN IF NOT EXISTS reward_item_id uuid,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer integer,
  ADD COLUMN IF NOT EXISTS total_redemptions_limit integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.loyalty_rewards SET points_required = COALESCE(points_required, cost_points) WHERE points_required IS NULL;

-- loyalty_redemptions: enhanced columns
ALTER TABLE public.loyalty_redemptions
  ADD COLUMN IF NOT EXISTS points_redeemed integer,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
UPDATE public.loyalty_redemptions SET points_redeemed = COALESCE(points_redeemed, points_used) WHERE points_redeemed IS NULL;

-- referral_programs: enhanced columns
ALTER TABLE public.referral_programs
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS referrer_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_value_for_bonus numeric,
  ADD COLUMN IF NOT EXISTS max_referrals_per_user integer;

-- referrals: enhanced columns
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.referral_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
UPDATE public.referrals SET referral_code = COALESCE(referral_code, code) WHERE referral_code IS NULL;


-- =============================================================================
-- SECTION 4 — NEW TABLES
-- =============================================================================

-- ---- DISPUTE & WEBHOOK INFRA -----------------------------------------------

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid,
  status text NOT NULL DEFAULT 'open',
  reason text,
  description text,
  refund_amount numeric(14,2),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb,
  response jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- ---- BROADCAST & BANK ACCOUNTS ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.buyer_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  channel text NOT NULL DEFAULT 'in_app',
  sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- QUEUE (antrian) --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.queue_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  is_active boolean NOT NULL DEFAULT true,
  avg_service_minutes int NOT NULL DEFAULT 10,
  current_number int NOT NULL DEFAULT 0,
  label text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.queue_sessions(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  queue_number int NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  notes text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','serving','done','skipped','called')),
  called_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- STUDIO -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.studio_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  location_preference text, mood_vibe text, outfit_count int NOT NULL DEFAULT 1,
  reference_style text, special_requests text, props_needed text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','reviewed')),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  file_urls text[] NOT NULL DEFAULT '{}', drive_link text,
  download_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  expires_at timestamptz, download_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','delivered','downloaded','expired')),
  notes text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.studio_photo_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text, photos text[] NOT NULL DEFAULT '{}',
  is_hidden boolean NOT NULL DEFAULT false, shop_reply text, shop_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- KLINIK -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.medical_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  patient_name text NOT NULL, patient_dob date, doctor_name text,
  visit_date date NOT NULL DEFAULT current_date,
  diagnosis text, prescription text,
  items jsonb NOT NULL DEFAULT '[]', total numeric(14,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anamnesis_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid, patient_name text NOT NULL,
  chief_complaint text DEFAULT '', history text DEFAULT '',
  allergies text DEFAULT '', current_medications text DEFAULT '', vital_notes text DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed boolean NOT NULL DEFAULT false
);

-- ---- DIGITAL PRODUCTS -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.digital_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  license_key text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
  license_type text NOT NULL DEFAULT 'personal' CHECK (license_type IN ('personal','commercial','extended')),
  download_count int NOT NULL DEFAULT 0, max_downloads int,
  last_downloaded_at timestamptz, is_active boolean NOT NULL DEFAULT true,
  customer_name text, order_no text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.digital_licenses(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text
);

CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name text, version text NOT NULL, changelog text, file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authenticity_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_name text NOT NULL, edition text,
  serial_no text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  materials text, dimensions text, creation_year text,
  buyer_name text, sale_date date, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, serial_no)
);

-- ---- KREATIF ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL, caption text, image_url text NOT NULL,
  stage text NOT NULL DEFAULT 'sketch',
  is_published boolean NOT NULL DEFAULT true, linked_product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_lookbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text, model_name text, tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL, is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  linked_product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL, customer_phone text,
  project_name text NOT NULL, total_value numeric(14,2) NOT NULL DEFAULT 0,
  milestones jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.limited_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  stock_total int NOT NULL DEFAULT 0, stock_sold int NOT NULL DEFAULT 0,
  image_url text, launch_date date, end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- PROMO & ENGAGEMENT ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.happy_hour_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, days_of_week int[] NOT NULL DEFAULT '{}',
  start_time time NOT NULL, end_time time NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  segment_label text NOT NULL, message_template text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0, sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'done',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- BOOKING ADD-ONS --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.booking_service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_slot_price numeric(12,2) NOT NULL DEFAULT 0,
  max_uses int, used_count int NOT NULL DEFAULT 0,
  valid_from date, valid_until date,
  description text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);

CREATE TABLE IF NOT EXISTS public.booking_reschedule_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  old_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  new_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  reason text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- RENTAL CHECKLIST -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rental_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.rental_units(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('before','after')),
  customer_name text NOT NULL, customer_phone text,
  odometer_km int, fuel_level text,
  items jsonb NOT NULL DEFAULT '[]',
  signature_data text, signed_by text, signed_at timestamptz,
  general_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- BUYER RATINGS & ORDER STATUS LOGS -------------------------------------

CREATE TABLE IF NOT EXISTS public.buyer_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rated_user_id uuid, customer_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, shop_id)
);

CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL, note text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- LOYALTY & REFERRAL (full schema including tiers) -----------------------

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, min_points integer NOT NULL DEFAULT 0,
  multiplier numeric NOT NULL DEFAULT 1, color text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb, sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date date NOT NULL,
  new_members integer NOT NULL DEFAULT 0,
  points_issued integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  rewards_claimed integer NOT NULL DEFAULT 0,
  referral_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, date)
);

-- ---- CASHBACK ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cashback_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_redeemed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL, type text NOT NULL, description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- TABLES & RESERVATIONS --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  label text NOT NULL, capacity integer NOT NULL DEFAULT 2, zone text,
  is_active boolean NOT NULL DEFAULT true, qr_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.table_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  name text NOT NULL, layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_settings (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false, slot_minutes integer NOT NULL DEFAULT 60,
  min_party_size integer NOT NULL DEFAULT 1, max_party_size integer NOT NULL DEFAULT 10,
  buffer_minutes integer NOT NULL DEFAULT 15, deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric NOT NULL DEFAULT 0, advance_days integer NOT NULL DEFAULT 30,
  open_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  slot_date date NOT NULL, slot_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 10, booked integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  slot_id uuid REFERENCES public.reservation_slots(id) ON DELETE SET NULL,
  user_id uuid, customer_name text NOT NULL,
  customer_phone text, customer_email text,
  party_size integer NOT NULL DEFAULT 1,
  reserved_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  deposit_amount numeric NOT NULL DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- RETURNS ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL, reason text NOT NULL, description text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', resolution text, refund_amount numeric,
  resolved_by uuid, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- THIRD-PARTY INTEGRATIONS & API -----------------------------------------

CREATE TABLE IF NOT EXISTS public.third_party_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL, name text, config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted text, status text NOT NULL DEFAULT 'inactive',
  last_sync_at timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  local_type text NOT NULL, local_id uuid, remote_id text NOT NULL, data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  event text NOT NULL, payload jsonb, signature text,
  status text NOT NULL DEFAULT 'received', error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, key_prefix text NOT NULL, key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_usage (
  id bigserial PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL, method text NOT NULL,
  status_code integer, duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, provider)
);

-- ---- SUPER ADMIN ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, display_name text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true, invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, code text NOT NULL UNIQUE,
  display_name text, email text,
  commission_rate numeric NOT NULL DEFAULT 0.05,
  total_clicks integer NOT NULL DEFAULT 0,
  total_signups integer NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  paid_commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text, result_url text, processed_by uuid, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_health_score (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0, sla_score integer NOT NULL DEFAULT 0,
  fulfillment_score integer NOT NULL DEFAULT 0, rating_score integer NOT NULL DEFAULT 0,
  complaint_score integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ---- KLINIK ADD-ONS ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_skin_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid, customer_name text, customer_phone text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  skin_type text, concerns text[], recommended_products jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  claim_type text NOT NULL, claim_value text, certificate_url text, expires_at date,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- EMAIL CAMPAIGNS --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  scheduled_at timestamptz, sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  segment text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','bounced')),
  sent_at timestamptz, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- STOREFRONT LAYOUT ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.storefront_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 5 — NEW INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON public.webhook_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_bank_accounts_shop ON public.shop_bank_accounts(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shop_bank_primary ON public.shop_bank_accounts(shop_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_queue_sessions_shop_date ON public.queue_sessions(shop_id, session_date);
CREATE INDEX IF NOT EXISTS idx_queue_entries_session ON public.queue_entries(session_id, queue_number);
CREATE INDEX IF NOT EXISTS idx_studio_briefs_shop ON public.studio_briefs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_deliveries_shop ON public.studio_deliveries(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_photo_reviews_shop ON public.studio_photo_reviews(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_invoices_shop ON public.medical_invoices(shop_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_anamnesis_shop ON public.anamnesis_forms(shop_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_shop ON public.digital_licenses(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_order ON public.digital_licenses(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_digital_dl_logs_license ON public.digital_download_logs(license_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_versions_shop ON public.digital_product_versions(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authenticity_shop ON public.authenticity_certificates(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wip_shop ON public.wip_gallery(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookbook_shop ON public.shop_lookbook(shop_id, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_shop ON public.project_milestones(shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limited_shop ON public.limited_editions(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_follows_shop ON public.shop_follows(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_follows_user ON public.shop_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_happy_hour_shop ON public.happy_hour_rules(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wa_broadcasts_shop ON public.wa_broadcasts(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bsp_shop ON public.booking_service_packages(shop_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_baddon_shop ON public.booking_addons(shop_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bvouchers_shop ON public.booking_vouchers(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_breschedule_booking ON public.booking_reschedule_logs(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rchecklist_shop ON public.rental_checklists(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_user ON public.buyer_ratings(rated_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_shop ON public.buyer_ratings(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON public.order_status_logs(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_shop ON public.loyalty_tiers(shop_id);
CREATE INDEX IF NOT EXISTS idx_ctx_user ON public.cashback_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tables_shop ON public.tables(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rslots ON public.reservation_slots(shop_id, slot_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_resv_shop_date ON public.reservations(shop_id, reserved_at);
CREATE INDEX IF NOT EXISTS idx_resv_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_ret_shop ON public.return_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_ret_user ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tpi_shop ON public.third_party_integrations(shop_id);
CREATE INDEX IF NOT EXISTS idx_imap_shop ON public.integration_mappings(shop_id);
CREATE INDEX IF NOT EXISTS idx_iwh_shop ON public.integration_webhooks(shop_id);
CREATE INDEX IF NOT EXISTS idx_apik_shop ON public.api_keys(shop_id);
CREATE INDEX IF NOT EXISTS idx_apiu_shop_time ON public.api_usage(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_api_keys_shop ON public.shop_api_keys(shop_id);
CREATE INDEX IF NOT EXISTS idx_dr_user ON public.data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sq_shop ON public.shop_skin_quiz(shop_id);
CREATE INDEX IF NOT EXISTS idx_spc_shop ON public.shop_product_claims(shop_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_shop ON public.email_campaigns(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_shop ON public.email_campaign_recipients(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refprog_shop ON public.referral_programs(shop_id);
CREATE INDEX IF NOT EXISTS idx_refer_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_refer_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS notifications_recipient_active_idx ON public.notifications(recipient_user_id, created_at DESC) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS shops_geo_idx ON public.shops(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- =============================================================================
-- SECTION 6 — MISSING FK CONSTRAINTS (idempotent)
-- =============================================================================

DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.ad_requests ADD CONSTRAINT ad_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_review_requests ADD CONSTRAINT booking_review_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_reviews ADD CONSTRAINT booking_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_reviews ADD CONSTRAINT booking_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_slots ADD CONSTRAINT booking_slots_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_waitlist ADD CONSTRAINT booking_waitlist_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_waitlist ADD CONSTRAINT booking_waitlist_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE RESTRICT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bulk_pricing_rules ADD CONSTRAINT bulk_pricing_rules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bulk_pricing_rules ADD CONSTRAINT bulk_pricing_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shops ADD CONSTRAINT coffee_shops_business_category_id_fkey FOREIGN KEY (business_category_id) REFERENCES public.business_categories(id)'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shops ADD CONSTRAINT coffee_shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.loyalty_redemptions ADD CONSTRAINT loyalty_redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- SECTION 7 — RLS POLICIES (enable + drop-then-create for idempotency)
-- =============================================================================

-- ---- disputes ---------------------------------------------------------------
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_disputes" ON public.disputes;
CREATE POLICY "admin_manage_disputes" ON public.disputes FOR ALL USING (public.has_role(auth.uid(),'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "shop_owner_view_disputes" ON public.disputes;
CREATE POLICY "shop_owner_view_disputes" ON public.disputes FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = disputes.shop_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "customer_view_own_disputes" ON public.disputes;
CREATE POLICY "customer_view_own_disputes" ON public.disputes FOR SELECT USING (auth.uid() = user_id);

-- ---- webhook_logs -----------------------------------------------------------
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_webhook_logs" ON public.webhook_logs;
CREATE POLICY "admin_view_webhook_logs" ON public.webhook_logs FOR SELECT USING (public.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "service_role_insert_webhook_logs" ON public.webhook_logs;
CREATE POLICY "service_role_insert_webhook_logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- ---- buyer_broadcasts -------------------------------------------------------
ALTER TABLE public.buyer_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyer_broadcasts_admin_all" ON public.buyer_broadcasts;
CREATE POLICY "buyer_broadcasts_admin_all" ON public.buyer_broadcasts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ---- shop_bank_accounts -----------------------------------------------------
ALTER TABLE public.shop_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_bank_accounts_owner_select" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_select" ON public.shop_bank_accounts FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "shop_bank_accounts_owner_insert" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_insert" ON public.shop_bank_accounts FOR INSERT WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "shop_bank_accounts_owner_update" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_update" ON public.shop_bank_accounts FOR UPDATE USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "shop_bank_accounts_owner_delete" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_delete" ON public.shop_bank_accounts FOR DELETE USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));

-- ---- user_roles extra policies (owner can manage own shop staff) ------------
DROP POLICY IF EXISTS "user_roles_owner_insert" ON public.user_roles;
CREATE POLICY "user_roles_owner_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (shop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = user_roles.shop_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "user_roles_owner_update" ON public.user_roles;
CREATE POLICY "user_roles_owner_update" ON public.user_roles FOR UPDATE TO authenticated USING (shop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = user_roles.shop_id AND s.owner_id = auth.uid())) WITH CHECK (shop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = user_roles.shop_id AND s.owner_id = auth.uid()));

-- ---- shop-scoped tables (bulk RLS via loop) ---------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'queue_sessions','queue_entries','studio_briefs','studio_deliveries','studio_photo_reviews',
    'medical_invoices','anamnesis_forms','digital_licenses','digital_product_versions',
    'authenticity_certificates','wip_gallery','shop_lookbook','project_milestones','limited_editions',
    'happy_hour_rules','wa_broadcasts','booking_service_packages','booking_addons',
    'booking_vouchers','booking_reschedule_logs','rental_checklists','buyer_ratings',
    'shop_api_keys','email_campaigns','email_campaign_recipients','storefront_layouts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_owner_all" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%s_owner_all" ON public.%I FOR ALL TO authenticated
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
    $p$, t, t);
  END LOOP;
END $$;

-- ---- order_status_logs ------------------------------------------------------
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "osl_shop_all" ON public.order_status_logs;
CREATE POLICY "osl_shop_all" ON public.order_status_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())));

-- ---- digital_download_logs --------------------------------------------------
ALTER TABLE public.digital_download_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dl_logs_owner_all" ON public.digital_download_logs;
CREATE POLICY "dl_logs_owner_all" ON public.digital_download_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id AND public.is_shop_owner(l.shop_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id));

-- ---- shop_follows -----------------------------------------------------------
ALTER TABLE public.shop_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_self_write" ON public.shop_follows;
CREATE POLICY "follows_self_write" ON public.shop_follows FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "follows_public_count" ON public.shop_follows;
CREATE POLICY "follows_public_count" ON public.shop_follows FOR SELECT TO anon, authenticated USING (true);

-- ---- public read overrides --------------------------------------------------
DROP POLICY IF EXISTS "wip_public_read" ON public.wip_gallery;
CREATE POLICY "wip_public_read" ON public.wip_gallery FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "lookbook_public_read" ON public.shop_lookbook;
CREATE POLICY "lookbook_public_read" ON public.shop_lookbook FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "studio_reviews_public_read" ON public.studio_photo_reviews;
CREATE POLICY "studio_reviews_public_read" ON public.studio_photo_reviews FOR SELECT TO anon, authenticated USING (is_hidden = false);
DROP POLICY IF EXISTS "buyer_ratings_self_read" ON public.buyer_ratings;
CREATE POLICY "buyer_ratings_self_read" ON public.buyer_ratings FOR SELECT TO authenticated USING (rated_user_id = auth.uid());
DROP POLICY IF EXISTS "limited_public_read" ON public.limited_editions;
CREATE POLICY "limited_public_read" ON public.limited_editions FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "cert_public_read" ON public.authenticity_certificates;
CREATE POLICY "cert_public_read" ON public.authenticity_certificates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "storefront_layouts_public_read" ON public.storefront_layouts;
CREATE POLICY "storefront_layouts_public_read" ON public.storefront_layouts FOR SELECT TO anon, authenticated USING (is_published = true);

-- ---- loyalty_tiers ----------------------------------------------------------
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lt owner" ON public.loyalty_tiers;
CREATE POLICY "lt owner" ON public.loyalty_tiers USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lt public" ON public.loyalty_tiers;
CREATE POLICY "lt public" ON public.loyalty_tiers FOR SELECT USING (is_active);

-- ---- loyalty_rewards (update existing) -------------------------------------
DROP POLICY IF EXISTS "lr owner" ON public.loyalty_rewards;
CREATE POLICY "lr owner" ON public.loyalty_rewards USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lr public" ON public.loyalty_rewards;
CREATE POLICY "lr public" ON public.loyalty_rewards FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "lr public read" ON public.loyalty_rewards;

-- ---- loyalty_redemptions (update existing) ----------------------------------
DROP POLICY IF EXISTS "lred owner" ON public.loyalty_redemptions;
CREATE POLICY "lred owner" ON public.loyalty_redemptions USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lred self r" ON public.loyalty_redemptions;
CREATE POLICY "lred self r" ON public.loyalty_redemptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "lred self i" ON public.loyalty_redemptions;
CREATE POLICY "lred self i" ON public.loyalty_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- loyalty_analytics ------------------------------------------------------
ALTER TABLE public.loyalty_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la owner" ON public.loyalty_analytics;
CREATE POLICY "la owner" ON public.loyalty_analytics USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- referral_programs (update existing) ------------------------------------
DROP POLICY IF EXISTS "rp owner" ON public.referral_programs;
CREATE POLICY "rp owner" ON public.referral_programs USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rp public" ON public.referral_programs;
CREATE POLICY "rp public" ON public.referral_programs FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "rp public read" ON public.referral_programs;

-- ---- referrals (update existing) --------------------------------------------
DROP POLICY IF EXISTS "ref owner" ON public.referrals;
DROP POLICY IF EXISTS "ref read" ON public.referrals;
CREATE POLICY "ref read" ON public.referrals FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=referrer_user_id OR auth.uid()=referee_user_id);
DROP POLICY IF EXISTS "ref ins" ON public.referrals;
CREATE POLICY "ref ins" ON public.referrals FOR INSERT WITH CHECK (auth.uid()=referrer_user_id);

-- ---- cashback ---------------------------------------------------------------
ALTER TABLE public.cashback_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cw self" ON public.cashback_wallets;
CREATE POLICY "cw self" ON public.cashback_wallets USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ctx read" ON public.cashback_transactions;
CREATE POLICY "ctx read" ON public.cashback_transactions FOR SELECT USING (auth.uid()=user_id OR public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ctx ins" ON public.cashback_transactions;
CREATE POLICY "ctx ins" ON public.cashback_transactions FOR INSERT WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- tables & reservations --------------------------------------------------
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t owner" ON public.tables;
CREATE POLICY "t owner" ON public.tables USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "t public" ON public.tables;
CREATE POLICY "t public" ON public.tables FOR SELECT USING (is_active);
ALTER TABLE public.table_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm owner" ON public.table_maps;
CREATE POLICY "tm owner" ON public.table_maps USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs owner" ON public.reservation_settings;
CREATE POLICY "rs owner" ON public.reservation_settings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rs public" ON public.reservation_settings;
CREATE POLICY "rs public" ON public.reservation_settings FOR SELECT USING (is_enabled);
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rslots owner" ON public.reservation_slots;
CREATE POLICY "rslots owner" ON public.reservation_slots USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rslots public" ON public.reservation_slots;
CREATE POLICY "rslots public" ON public.reservation_slots FOR SELECT USING (true);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resv owner" ON public.reservations;
CREATE POLICY "resv owner" ON public.reservations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "resv self r" ON public.reservations;
CREATE POLICY "resv self r" ON public.reservations FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "resv self i" ON public.reservations;
CREATE POLICY "resv self i" ON public.reservations FOR INSERT WITH CHECK (auth.uid()=user_id OR user_id IS NULL);

-- ---- return_requests --------------------------------------------------------
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ret owner" ON public.return_requests;
CREATE POLICY "ret owner" ON public.return_requests USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ret self r" ON public.return_requests;
CREATE POLICY "ret self r" ON public.return_requests FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "ret self i" ON public.return_requests;
CREATE POLICY "ret self i" ON public.return_requests FOR INSERT WITH CHECK (auth.uid()=user_id);

-- ---- third-party & API ------------------------------------------------------
ALTER TABLE public.third_party_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tpi" ON public.third_party_integrations;
CREATE POLICY "tpi" ON public.third_party_integrations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imap" ON public.integration_mappings;
CREATE POLICY "imap" ON public.integration_mappings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iwh" ON public.integration_webhooks;
CREATE POLICY "iwh" ON public.integration_webhooks FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apik" ON public.api_keys;
CREATE POLICY "apik" ON public.api_keys USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apiu" ON public.api_usage;
CREATE POLICY "apiu" ON public.api_usage FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- super admin ------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "au sa" ON public.admin_users;
CREATE POLICY "au sa" ON public.admin_users USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aff" ON public.affiliates;
CREATE POLICY "aff" ON public.affiliates USING (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr self" ON public.data_requests;
CREATE POLICY "dr self" ON public.data_requests USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "dr admin upd" ON public.data_requests;
CREATE POLICY "dr admin upd" ON public.data_requests FOR UPDATE USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.shop_health_score ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shs" ON public.shop_health_score;
CREATE POLICY "shs" ON public.shop_health_score USING (public.has_role(auth.uid(),'super_admin'::app_role) OR public.is_shop_owner(shop_id)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- skin quiz & product claims ---------------------------------------------
ALTER TABLE public.shop_skin_quiz ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sq r" ON public.shop_skin_quiz;
CREATE POLICY "sq r" ON public.shop_skin_quiz FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);
DROP POLICY IF EXISTS "sq i" ON public.shop_skin_quiz;
CREATE POLICY "sq i" ON public.shop_skin_quiz FOR INSERT WITH CHECK (true);
ALTER TABLE public.shop_product_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spc owner" ON public.shop_product_claims;
CREATE POLICY "spc owner" ON public.shop_product_claims USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "spc pub" ON public.shop_product_claims;
CREATE POLICY "spc pub" ON public.shop_product_claims FOR SELECT USING (is_verified);

-- ---- storage policy fixes ---------------------------------------------------
DROP POLICY IF EXISTS "public read rental-inspections" ON storage.objects;
DROP POLICY IF EXISTS "public read treatment-photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_contract_signatures" ON storage.objects;

DROP POLICY IF EXISTS "owner_list_rental_inspections" ON storage.objects;
CREATE POLICY "owner_list_rental_inspections" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rental-inspections' AND (storage.foldername(name))[1] IN (SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "owner_list_treatment_photos" ON storage.objects;
CREATE POLICY "owner_list_treatment_photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'treatment-photos' AND (storage.foldername(name))[1] IN (SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "owner_list_contract_signatures" ON storage.objects;
CREATE POLICY "owner_list_contract_signatures" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contract-signatures' AND (storage.foldername(name))[1] IN (SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()));


-- =============================================================================
-- SECTION 8 — VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW public.shops__bootstrap_placeholder WITH (security_invoker = true) AS SELECT * FROM public.shops;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops__bootstrap_placeholder TO authenticated, service_role;
GRANT SELECT ON public.shops__bootstrap_placeholder TO anon;

CREATE VIEW public.courier_earnings WITH (security_invoker=on) AS
SELECT o.courier_id, o.shop_id,
  date_trunc('day', COALESCE(o.delivered_at, o.created_at))::date AS earning_date,
  count(*) AS deliveries,
  COALESCE(sum(o.delivery_fee),0) AS total_fee,
  COALESCE(sum(o.tip_amount),0) AS total_tip,
  COALESCE(sum(o.delivery_fee + COALESCE(o.tip_amount,0)),0) AS total_earnings
FROM public.orders o WHERE o.courier_id IS NOT NULL
GROUP BY o.courier_id, o.shop_id, date_trunc('day', COALESCE(o.delivered_at, o.created_at));

CREATE VIEW public.menu_hpp_view WITH (security_invoker=on) AS
SELECT mi.id AS menu_item_id, mi.shop_id, mi.name, mi.price,
  COALESCE(sum(r.quantity * i.cost_per_unit), 0) AS hpp,
  CASE WHEN mi.price > 0
    THEN ROUND(((mi.price - COALESCE(sum(r.quantity * i.cost_per_unit),0)) / mi.price * 100)::numeric, 2)
    ELSE 0 END AS margin_percent
FROM public.menu_items mi
LEFT JOIN public.recipes r ON r.menu_item_id = mi.id
LEFT JOIN public.ingredients i ON i.id = r.ingredient_id
GROUP BY mi.id, mi.shop_id, mi.name, mi.price;

CREATE VIEW public.v_shop_capabilities WITH (security_invoker=on) AS
SELECT s.id AS shop_id, s.name AS shop_name,
  s.plan AS plan_code, s.business_category_id,
  bc.slug AS business_category_slug, bc.name AS business_category_name,
  p.features AS plan_features,
  s.is_active AS shop_active, s.suspended_at,
  s.plan_expires_at AS subscription_active_until
FROM public.shops s
LEFT JOIN public.plans p ON p.code = s.plan
LEFT JOIN public.business_categories bc ON bc.id = s.business_category_id;


-- =============================================================================
-- SECTION 9 — NEW / UPDATED FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid; v_theme_key text; v_plan_code text := 'basic';
  v_started timestamptz; v_expires timestamptz; v_months numeric := 0;
  v_themes jsonb; v_features jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT id, COALESCE(active_theme_key, theme_key), plan_started_at, plan_expires_at, COALESCE(plan,'basic')
    INTO v_shop_id, v_theme_key, v_started, v_expires, v_plan_code
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;
  IF v_plan_code IS NULL OR v_plan_code = '' OR v_plan_code = 'free' THEN v_plan_code := 'basic'; END IF;
  IF v_plan_code <> 'basic' AND v_expires IS NOT NULL AND v_expires < now() THEN v_plan_code := 'basic'; END IF;
  IF v_started IS NOT NULL THEN v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30); END IF;
  SELECT jsonb_agg(jsonb_build_object('key',t.key,'name',t.name,'description',t.description,'preview_image_url',t.preview_image_url,'allowed',true,'reason',NULL,'component_id',t.component_id,'requires_min_months',0) ORDER BY t.sort_order)
    INTO v_themes FROM public.themes t WHERE t.is_active = true;
  SELECT jsonb_agg(jsonb_build_object('key',f.key,'name',f.name,'description',f.description,'category',f.category,'requires_min_months',COALESCE(pf.requires_min_months,0),'limit_value',pf.limit_value,'allowed',(pf.feature_key IS NOT NULL) AND (COALESCE(pf.requires_min_months,0) <= v_months),'reason',CASE WHEN pf.feature_key IS NULL THEN 'plan_not_eligible' WHEN COALESCE(pf.requires_min_months,0) > v_months THEN 'requires_min_months' ELSE NULL END) ORDER BY f.sort_order)
    INTO v_features FROM public.features f LEFT JOIN public.plan_features pf ON pf.feature_key=f.key AND pf.plan_id=(SELECT id FROM public.plans WHERE code=v_plan_code LIMIT 1) WHERE f.is_active=true;
  RETURN jsonb_build_object('plan_code',v_plan_code,'plan_started_at',v_started,'plan_expires_at',v_expires,'months_active',v_months,'active_theme_key',COALESCE(v_theme_key,'classic'),'features',COALESCE(v_features,'[]'::jsonb),'themes',COALESCE(v_themes,'[]'::jsonb));
END $function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT jsonb_build_object('gmv',COALESCE(SUM(o.total),0),'commission',COALESCE(SUM(o.commission_amount),0),'net_to_shops',COALESCE(SUM(o.net_to_shop),0),'orders',COUNT(*),'aov',COALESCE(AVG(o.total),0),'take_rate',CASE WHEN COALESCE(SUM(o.total),0)>0 THEN ROUND((COALESCE(SUM(o.commission_amount),0)/SUM(o.total)*100)::numeric,2) ELSE 0 END,'shops_active',COUNT(DISTINCT o.shop_id),'customers',COUNT(DISTINCT o.customer_user_id)) INTO v_result FROM public.orders o WHERE o.marketplace_order=true AND o.status NOT IN ('cancelled','pending') AND o.created_at>=_from AND o.created_at<=_to;
  RETURN v_result;
END $function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY SELECT (o.created_at AT TIME ZONE 'Asia/Jakarta')::date, COALESCE(SUM(o.total),0)::numeric, COALESCE(SUM(o.commission_amount),0)::numeric, COUNT(*)::bigint FROM public.orders o WHERE o.marketplace_order=true AND o.status NOT IN ('cancelled','pending') AND o.created_at>=_from AND o.created_at<=_to GROUP BY 1 ORDER BY 1;
END $function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(_from timestamptz, _to timestamptz, _limit integer DEFAULT 10)
RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY SELECT o.shop_id, s.name, COALESCE(SUM(o.total),0)::numeric, COALESCE(SUM(o.commission_amount),0)::numeric, COUNT(*)::bigint FROM public.orders o JOIN public.shops s ON s.id=o.shop_id WHERE o.marketplace_order=true AND o.status NOT IN ('cancelled','pending') AND o.created_at>=_from AND o.created_at<=_to GROUP BY o.shop_id, s.name ORDER BY gmv DESC LIMIT GREATEST(COALESCE(_limit,10),1);
END $function$;

CREATE OR REPLACE FUNCTION public.create_plan_invoice(_plan_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_caller uuid := auth.uid(); v_shop_id uuid; v_plan plans%ROWTYPE; v_invoice_id uuid; v_invoice_no text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id=v_caller LIMIT 1;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no_shop'; END IF;
  SELECT * INTO v_plan FROM plans WHERE code=_plan_code AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found_or_inactive'; END IF;
  v_invoice_no := 'INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO plan_invoices(shop_id,plan_id,invoice_no,amount_idr,status,payment_method) VALUES(v_shop_id,v_plan.id,v_invoice_no,v_plan.price_idr,'pending','manual') RETURNING id INTO v_invoice_id;
  RETURN v_invoice_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_plan_invoice(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_plan_invoice(_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_caller uuid := auth.uid(); v_inv plan_invoices%ROWTYPE; v_plan plans%ROWTYPE; v_new_expiry timestamptz; v_base timestamptz;
BEGIN
  IF NOT public.has_role(v_caller,'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO v_inv FROM plan_invoices WHERE id=_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status='paid' THEN RAISE EXCEPTION 'already_paid'; END IF;
  SELECT * INTO v_plan FROM plans WHERE id=v_inv.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  SELECT GREATEST(COALESCE(plan_expires_at,now()),now()) INTO v_base FROM shops WHERE id=v_inv.shop_id;
  v_new_expiry := v_base + (v_plan.duration_days||' days')::interval;
  UPDATE plan_invoices SET status='paid',paid_at=now(),reviewed_by=v_caller,reviewed_at=now(),updated_at=now() WHERE id=_invoice_id;
  UPDATE shops SET plan=v_plan.code,plan_expires_at=v_new_expiry,updated_at=now() WHERE id=v_inv.shop_id;
  INSERT INTO plan_subscriptions(shop_id,plan_id,plan_code,status,billing_interval,next_billing_at,amount_idr,last_invoice_id,last_charge_at) VALUES(v_inv.shop_id,v_plan.id,v_plan.code,'active','monthly',v_new_expiry,v_plan.price_idr,_invoice_id,now()) ON CONFLICT(shop_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,plan_code=EXCLUDED.plan_code,amount_idr=EXCLUDED.amount_idr,next_billing_at=EXCLUDED.next_billing_at,last_invoice_id=EXCLUDED.last_invoice_id,last_charge_at=EXCLUDED.last_charge_at,status='active',failure_count=0,updated_at=now();
  RETURN jsonb_build_object('shop_id',v_inv.shop_id,'plan_code',v_plan.code,'plan_expires_at',v_new_expiry);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE old_plan text; old_exp timestamptz; v_plan plans%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _plan <> 'free' THEN SELECT * INTO v_plan FROM plans WHERE code=_plan AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'invalid_plan'; END IF; END IF;
  SELECT plan,plan_expires_at INTO old_plan,old_exp FROM shops WHERE id=_shop_id;
  UPDATE shops SET plan=_plan,plan_expires_at=CASE WHEN _plan='free' THEN NULL ELSE _expires_at END,updated_at=now() WHERE id=_shop_id;
  IF _plan='free' THEN UPDATE plan_subscriptions SET status='cancelled',cancelled_at=now(),updated_at=now() WHERE shop_id=_shop_id;
  ELSE INSERT INTO plan_subscriptions(shop_id,plan_id,plan_code,status,billing_interval,next_billing_at,amount_idr) VALUES(_shop_id,v_plan.id,v_plan.code,'active','monthly',COALESCE(_expires_at,now()+(v_plan.duration_days||' days')::interval),v_plan.price_idr) ON CONFLICT(shop_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,plan_code=EXCLUDED.plan_code,amount_idr=EXCLUDED.amount_idr,next_billing_at=EXCLUDED.next_billing_at,status='active',updated_at=now(); END IF;
  INSERT INTO system_audit(event_type,shop_id,actor_id,payload,notes) VALUES('plan_manual_set',_shop_id,auth.uid(),jsonb_build_object('old_plan',old_plan,'old_expires_at',old_exp,'new_plan',_plan,'new_expires_at',_expires_at),'super-admin manual override');
END $$;

CREATE OR REPLACE FUNCTION public.approve_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_inv plan_invoices%ROWTYPE; v_plan plans%ROWTYPE; v_start timestamptz; v_end timestamptz;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller,'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_inv FROM plan_invoices WHERE id=_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status='paid' THEN RETURN; END IF;
  SELECT * INTO v_plan FROM plans WHERE id=v_inv.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  UPDATE plan_invoices SET status='paid',paid_at=now(),reviewed_by=v_caller,reviewed_at=now(),updated_at=now() WHERE id=_invoice_id;
  SELECT GREATEST(COALESCE(plan_expires_at,now()),now()) INTO v_start FROM shops WHERE id=v_inv.shop_id;
  v_end := v_start + make_interval(days => v_plan.duration_days);
  UPDATE shops SET plan=v_plan.code,plan_started_at=COALESCE(plan_started_at,now()),plan_expires_at=v_end,suspended_at=NULL,suspended_reason=NULL,updated_at=now() WHERE id=v_inv.shop_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller,'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE plan_invoices SET status='rejected',reviewed_by=v_caller,reviewed_at=now(),notes=COALESCE(_reason,notes),updated_at=now() WHERE id=_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_invoice(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_buyer_segments()
RETURNS TABLE(total bigint, active bigint, inactive bigint, new_buyers bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH buyers AS (SELECT DISTINCT u.id, u.created_at FROM auth.users u WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='customer') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_user_id=u.id)),
  last_order AS (SELECT customer_user_id, max(created_at) AS last_at FROM public.orders WHERE customer_user_id IS NOT NULL GROUP BY customer_user_id)
  SELECT (SELECT count(*) FROM buyers)::bigint,(SELECT count(*) FROM last_order WHERE last_at>=now()-interval '30 days')::bigint,(SELECT count(*) FROM buyers b LEFT JOIN last_order lo ON lo.customer_user_id=b.id WHERE lo.last_at IS NULL OR lo.last_at<now()-interval '60 days')::bigint,(SELECT count(*) FROM buyers WHERE created_at>=now()-interval '7 days')::bigint;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_buyer_segments() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_owner_role_for_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.user_roles(user_id,role,shop_id,outlet_id,is_active) VALUES(NEW.owner_id,'owner',NEW.id,NULL,true) ON CONFLICT(user_id,role,shop_id,outlet_id) DO UPDATE SET is_active=true;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_waitlist_summary(_shop_id uuid)
RETURNS TABLE(id uuid, queue_number integer, party_size integer, status text, estimated_wait_minutes integer, created_at timestamptz, served_at timestamptz, requested_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, queue_number, party_size, status, estimated_wait_minutes, created_at, served_at, requested_date FROM public.booking_waitlist WHERE shop_id=_shop_id AND status IN ('waiting','notified') AND (requested_date=CURRENT_DATE OR requested_date IS NULL) ORDER BY created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_waitlist_summary(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_certificate(_cert_number text)
RETURNS TABLE(certificate_number text, course_title text, shop_name text, issued_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cc.certificate_number, mi.name, s.name, cc.issued_at FROM public.course_certificates cc LEFT JOIN public.menu_items mi ON mi.id=cc.course_id LEFT JOIN public.shops s ON s.id=cc.shop_id WHERE cc.certificate_number=_cert_number LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_queue_session(_shop_id uuid, _label text DEFAULT NULL, _avg_minutes integer DEFAULT 5)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_sessions SET is_active=false,ended_at=now() WHERE shop_id=_shop_id AND is_active=true;
  INSERT INTO public.queue_sessions(shop_id,session_date,label,avg_service_minutes,is_active,started_at) VALUES(_shop_id,CURRENT_DATE,_label,COALESCE(_avg_minutes,5),true,now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.take_queue_number(_shop_id uuid, _customer_name text DEFAULT NULL, _customer_phone text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _session_id uuid; _num integer; _id uuid;
BEGIN
  SELECT id INTO _session_id FROM public.queue_sessions WHERE shop_id=_shop_id AND is_active=true ORDER BY started_at DESC LIMIT 1;
  IF _session_id IS NULL THEN INSERT INTO public.queue_sessions(shop_id,session_date,is_active,started_at) VALUES(_shop_id,CURRENT_DATE,true,now()) RETURNING id INTO _session_id; END IF;
  SELECT COALESCE(MAX(queue_number),0)+1 INTO _num FROM public.queue_entries WHERE session_id=_session_id;
  INSERT INTO public.queue_entries(session_id,shop_id,queue_number,customer_name,customer_phone,notes,status) VALUES(_session_id,_shop_id,_num,_customer_name,_customer_phone,_notes,'waiting') RETURNING id INTO _id;
  RETURN jsonb_build_object('id',_id,'session_id',_session_id,'queue_number',_num);
END $$;

CREATE OR REPLACE FUNCTION public.call_next_queue(_shop_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _entry public.queue_entries%ROWTYPE;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _entry FROM public.queue_entries WHERE shop_id=_shop_id AND status='waiting' ORDER BY queue_number ASC LIMIT 1;
  IF _entry.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.queue_entries SET status='called',called_at=now() WHERE id=_entry.id;
  UPDATE public.queue_sessions SET current_number=_entry.queue_number WHERE id=_entry.session_id;
  RETURN to_jsonb(_entry);
END $$;

CREATE OR REPLACE FUNCTION public.skip_queue_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.queue_entries WHERE id=_entry_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_entries SET status='skipped',done_at=now() WHERE id=_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.generate_reservation_slots(_shop_id uuid, _date date, _start time, _end time, _slot_minutes integer DEFAULT 60, _capacity integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _t time := _start; _n integer := 0;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WHILE _t < _end LOOP
    INSERT INTO public.reservation_slots(shop_id,slot_date,slot_time,capacity) VALUES(_shop_id,_date,_t,_capacity) ON CONFLICT(shop_id,slot_date,slot_time) DO NOTHING;
    _t := _t + (_slot_minutes||' minutes')::interval; _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION public.check_table_availability(_shop_id uuid, _reserved_at timestamptz, _party_size integer DEFAULT 1)
RETURNS TABLE(table_id uuid, label text, capacity integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT t.id, t.label, t.capacity FROM public.tables t
  WHERE t.shop_id=_shop_id AND t.is_active AND t.capacity>=_party_size
    AND NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.table_id=t.id AND r.status IN ('pending','confirmed','seated') AND abs(extract(epoch FROM (r.reserved_at-_reserved_at)))<3600)
  ORDER BY t.capacity ASC;
$$;

CREATE OR REPLACE FUNCTION public.increment_slot_booked(_slot_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.reservation_slots SET booked=booked+1 WHERE id=_slot_id AND booked<capacity; END $$;

CREATE OR REPLACE FUNCTION public.decrement_slot_booked(_slot_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.reservation_slots SET booked=GREATEST(booked-1,0) WHERE id=_slot_id; END $$;

CREATE OR REPLACE FUNCTION public.fn_use_booking_voucher(_booking_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _v public.booking_vouchers%ROWTYPE;
BEGIN
  SELECT * INTO _v FROM public.booking_vouchers WHERE code=_code AND is_active=true LIMIT 1;
  IF _v.id IS NULL THEN RAISE EXCEPTION 'voucher tidak ditemukan'; END IF;
  RETURN jsonb_build_object('voucher_id',_v.id,'discount',COALESCE(_v.discount_value,0));
END $$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(_booking_id uuid, _new_start timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.bookings WHERE id=_booking_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.bookings SET start_at=_new_start,updated_at=now() WHERE id=_booking_id;
END $$;

CREATE OR REPLACE FUNCTION public.award_referral_bonus(_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _r public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.referrals WHERE id=_referral_id;
  IF _r.id IS NULL OR _r.status='rewarded' THEN RETURN; END IF;
  UPDATE public.referrals SET status='rewarded',rewarded_at=now() WHERE id=_referral_id;
  IF _r.reward_cashback>0 AND _r.referrer_user_id IS NOT NULL THEN
    INSERT INTO public.cashback_wallets(user_id,balance,total_earned) VALUES(_r.referrer_user_id,_r.reward_cashback,_r.reward_cashback) ON CONFLICT(user_id) DO UPDATE SET balance=cashback_wallets.balance+EXCLUDED.balance,total_earned=cashback_wallets.total_earned+EXCLUDED.total_earned,updated_at=now();
    INSERT INTO public.cashback_transactions(user_id,shop_id,amount,type,description) VALUES(_r.referrer_user_id,_r.shop_id,_r.reward_cashback,'earn','Bonus referral');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_download(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.digital_licenses SET download_count=COALESCE(download_count,0)+1,last_downloaded_at=now() WHERE id=_license_id;
  INSERT INTO public.digital_download_logs(license_id,downloaded_at) VALUES(_license_id,now());
END $$;

CREATE OR REPLACE FUNCTION public.reset_download_count(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.digital_licenses WHERE id=_license_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.digital_licenses SET download_count=0 WHERE id=_license_id;
END $$;

CREATE OR REPLACE FUNCTION public.request_customer_export(_user_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid; _id uuid;
BEGIN
  _uid := COALESCE(_user_id,auth.uid());
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.data_requests(user_id,request_type,status) VALUES(_uid,'export','pending') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.request_shop_backup(_shop_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.shop_backups(shop_id,status,requested_by,requested_at) VALUES(_shop_id,'pending',auth.uid(),now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.run_plan_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _expired integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.shops SET plan='basic' WHERE plan_expires_at IS NOT NULL AND plan_expires_at<now() AND plan<>'basic';
  GET DIAGNOSTICS _expired = ROW_COUNT;
  RETURN jsonb_build_object('expired',_expired);
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_min_months(_plan_id uuid, _feature_key text, _min_months integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.plan_features SET min_months=_min_months WHERE plan_id=_plan_id AND feature_key=_feature_key;
END $$;

CREATE OR REPLACE FUNCTION public.admin_undo_min_months(_plan_id uuid, _feature_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.plan_features SET min_months=0 WHERE plan_id=_plan_id AND feature_key=_feature_key;
END $$;

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(_api_key_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _limit integer; _count integer;
BEGIN
  SELECT rate_limit_per_minute INTO _limit FROM public.api_keys WHERE id=_api_key_id AND is_active;
  IF _limit IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO _count FROM public.api_usage WHERE api_key_id=_api_key_id AND created_at>now()-interval '1 minute';
  RETURN _count < _limit;
END $$;

CREATE OR REPLACE FUNCTION public.record_api_usage(_api_key_id uuid, _shop_id uuid, _endpoint text, _method text, _status integer DEFAULT 200, _duration_ms integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.api_usage(shop_id,api_key_id,endpoint,method,status_code,duration_ms) VALUES(_shop_id,_api_key_id,_endpoint,_method,_status,_duration_ms);
  UPDATE public.api_keys SET last_used_at=now() WHERE id=_api_key_id;
END $$;

CREATE OR REPLACE FUNCTION public.sync_loyalty_reward_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_required IS NULL AND NEW.cost_points IS NOT NULL THEN NEW.points_required := NEW.cost_points; END IF;
  IF NEW.cost_points IS NULL AND NEW.points_required IS NOT NULL THEN NEW.cost_points := NEW.points_required; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_loyalty_redemption_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_redeemed IS NULL AND NEW.points_used IS NOT NULL THEN NEW.points_redeemed := NEW.points_used; END IF;
  IF NEW.points_used IS NULL AND NEW.points_redeemed IS NOT NULL THEN NEW.points_used := NEW.points_redeemed; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.shops_nearby(
  _lat double precision, _lng double precision,
  _radius_km double precision DEFAULT 10,
  _limit integer DEFAULT 50,
  _category_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, slug text, name text, tagline text, logo_url text, address text, city text, latitude numeric, longitude numeric, business_category_id uuid, rating_avg numeric, review_count integer, distance_km double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT s.id, s.slug, s.name, s.tagline, s.logo_url, s.address, s.city, s.latitude, s.longitude, s.business_category_id, s.rating_avg, s.review_count,
    (6371 * acos(LEAST(1.0,GREATEST(-1.0, cos(radians(_lat))*cos(radians(s.latitude::float8))*cos(radians(s.longitude::float8)-radians(_lng))+sin(radians(_lat))*sin(radians(s.latitude::float8)))))) AS distance_km
  FROM public.shops s
  WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND COALESCE(s.is_active,true)=true AND COALESCE(s.marketplace_visible,true)=true
    AND (_category_id IS NULL OR s.business_category_id=_category_id)
    AND (6371*acos(LEAST(1.0,GREATEST(-1.0,cos(radians(_lat))*cos(radians(s.latitude::float8))*cos(radians(s.longitude::float8)-radians(_lng))+sin(radians(_lat))*sin(radians(s.latitude::float8)))))) <= _radius_km
  ORDER BY distance_km ASC LIMIT GREATEST(1,LEAST(_limit,200));
$$;
GRANT EXECUTE ON FUNCTION public.shops_nearby(double precision, double precision, double precision, integer, uuid) TO anon, authenticated;


-- =============================================================================
-- SECTION 10 — TRIGGERS
-- =============================================================================

-- ensure owner role on shop insert/update
DROP TRIGGER IF EXISTS trg_shops_ensure_owner_role ON public.shops;
CREATE TRIGGER trg_shops_ensure_owner_role
  AFTER INSERT OR UPDATE OF owner_id ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.ensure_owner_role_for_shop();

-- loyalty sync triggers
DROP TRIGGER IF EXISTS trg_lr_sync ON public.loyalty_rewards;
CREATE TRIGGER trg_lr_sync BEFORE INSERT OR UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_reward_cols();
DROP TRIGGER IF EXISTS trg_lred_sync ON public.loyalty_redemptions;
CREATE TRIGGER trg_lred_sync BEFORE INSERT OR UPDATE ON public.loyalty_redemptions FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_redemption_cols();

-- updated_at triggers for new tables (using update_updated_at_column or touch_updated_at)
DROP TRIGGER IF EXISTS update_shop_bank_accounts_updated_at ON public.shop_bank_accounts;
CREATE TRIGGER update_shop_bank_accounts_updated_at BEFORE UPDATE ON public.shop_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_email_campaigns_updated ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_storefront_layouts_updated ON public.storefront_layouts;
CREATE TRIGGER trg_storefront_layouts_updated BEFORE UPDATE ON public.storefront_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_shop_api_keys_updated ON public.shop_api_keys;
CREATE TRIGGER trg_shop_api_keys_updated BEFORE UPDATE ON public.shop_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- updated_at for tables that use touch_updated_at
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['loyalty_tiers','tables','table_maps','reservation_settings','reservations','return_requests','third_party_integrations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END $$;


-- =============================================================================
-- SECTION 11 — STORAGE BUCKETS & POLICIES
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('booking-documents', 'booking-documents', false),
  ('custom-deliveries', 'custom-deliveries', false),
  ('digital-products', 'digital-products', false),
  ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- shop-assets: public read, owner write
DROP POLICY IF EXISTS "shop-assets public read" ON storage.objects;
CREATE POLICY "shop-assets public read" ON storage.objects FOR SELECT USING (bucket_id='shop-assets');
DROP POLICY IF EXISTS "shop-assets owner write" ON storage.objects;
CREATE POLICY "shop-assets owner write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='shop-assets' AND auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "shop-assets owner update" ON storage.objects;
CREATE POLICY "shop-assets owner update" ON storage.objects FOR UPDATE USING (bucket_id='shop-assets' AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "shop-assets owner delete" ON storage.objects;
CREATE POLICY "shop-assets owner delete" ON storage.objects FOR DELETE USING (bucket_id='shop-assets' AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));

-- booking-documents
DROP POLICY IF EXISTS "booking-documents user read" ON storage.objects;
CREATE POLICY "booking-documents user read" ON storage.objects FOR SELECT USING (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "booking-documents user write" ON storage.objects;
CREATE POLICY "booking-documents user write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "booking-documents user update" ON storage.objects;
CREATE POLICY "booking-documents user update" ON storage.objects FOR UPDATE USING (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "booking-documents user delete" ON storage.objects;
CREATE POLICY "booking-documents user delete" ON storage.objects FOR DELETE USING (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);

-- custom-deliveries
DROP POLICY IF EXISTS "custom-deliveries user read" ON storage.objects;
CREATE POLICY "custom-deliveries user read" ON storage.objects FOR SELECT USING (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "custom-deliveries user write" ON storage.objects;
CREATE POLICY "custom-deliveries user write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "custom-deliveries user update" ON storage.objects;
CREATE POLICY "custom-deliveries user update" ON storage.objects FOR UPDATE USING (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "custom-deliveries user delete" ON storage.objects;
CREATE POLICY "custom-deliveries user delete" ON storage.objects FOR DELETE USING (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);

-- digital-products
DROP POLICY IF EXISTS "digital-products user read" ON storage.objects;
CREATE POLICY "digital-products user read" ON storage.objects FOR SELECT USING (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "digital-products user write" ON storage.objects;
CREATE POLICY "digital-products user write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "digital-products user update" ON storage.objects;
CREATE POLICY "digital-products user update" ON storage.objects FOR UPDATE USING (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "digital-products user delete" ON storage.objects;
CREATE POLICY "digital-products user delete" ON storage.objects FOR DELETE USING (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);


-- =============================================================================
-- SECTION 12 — SEED DATA
-- =============================================================================

-- Business categories (full authoritative version with enabled_features)
INSERT INTO public.business_categories (slug, name, description, sort_order, is_active, enabled_features, flow_types, booking_enabled, booking_type, recommended_theme_key, subtypes) VALUES
('fnb','F&B','Warung, kafe, bakery, katering, dan usaha makanan minuman lainnya.',1,true,ARRAY['POS','MENU','KDS','TABLES','INVENTORY','VARIANTS','RECIPES','COMBO_BUILDER','ORDER_MODE']::text[],ARRAY['T1']::text[],false,null,'kuliner-warm','[{"slug":"warung","label":"Warung"},{"slug":"kafe","label":"Kafe"},{"slug":"bakery","label":"Bakery"},{"slug":"katering","label":"Katering"}]'::jsonb),
('retail','Retail','Toko pakaian, sembako, aksesoris, elektronik, dan penjualan produk fisik.',2,true,ARRAY['POS','MENU','INVENTORY','VARIANTS','BUNDLES','PRODUCT_RETURNS','VARIANT_MATRIX']::text[],ARRAY['T1']::text[],false,null,'retail-bold','[{"slug":"fashion","label":"Fashion"},{"slug":"sembako","label":"Sembako"},{"slug":"aksesoris","label":"Aksesoris"},{"slug":"elektronik","label":"Elektronik"}]'::jsonb),
('jasa','Jasa','Usaha jasa umum seperti servis, bengkel ringan, perbaikan, dan layanan profesional.',3,true,ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS','JOB_DELIVERABLES']::text[],ARRAY['T3','T5']::text[],true,'session','service-clean','[{"slug":"servis","label":"Servis"},{"slug":"konsultasi","label":"Konsultasi"},{"slug":"perbaikan","label":"Perbaikan"}]'::jsonb),
('rental','Rental','Sewa kendaraan, alat, perlengkapan acara, dan unit rental lainnya.',4,true,ARRAY['RENTAL','RENTAL_AVAILABILITY','RENTAL_DEPOSIT','RENTAL_FINES','RENTAL_CHECKLIST','RENTAL_TNC','RENTAL_EXTEND','RENTAL_UNIT_READY','RENTAL_KYC','RENTAL_INSPECTIONS']::text[],ARRAY['T4']::text[],true,'rental','rental-bold','[{"slug":"kendaraan","label":"Kendaraan"},{"slug":"alat","label":"Alat"},{"slug":"properti-acara","label":"Properti Acara"}]'::jsonb),
('kursus','Kursus','Kelas privat, bimbel, kursus online, dan pelatihan berjadwal.',5,true,ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','KURSUS','LESSON_PROGRESS','COURSE_CERTIFICATES','SESSION_MEMBERSHIP']::text[],ARRAY['T2','T3']::text[],true,'session','course-bright','[{"slug":"bimbel","label":"Bimbel"},{"slug":"kursus-online","label":"Kursus Online"},{"slug":"les-privat","label":"Les Privat"}]'::jsonb),
('salon','Salon & Barbershop','Salon kecantikan, barbershop, nail studio, dan treatment berjadwal.',6,true,ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','ANTRIAN','WAITLIST','CUSTOMER_TREATMENTS','SESSION_MEMBERSHIP']::text[],ARRAY['T3']::text[],true,'session','beauty-soft','[{"slug":"salon","label":"Salon"},{"slug":"barbershop","label":"Barbershop"},{"slug":"nail-art","label":"Nail Art"},{"slug":"spa","label":"Spa"}]'::jsonb),
('klinik','Klinik','Klinik umum, klinik kecantikan, praktik mandiri, dan layanan kesehatan.',7,true,ARRAY['BOOKING','STAFF_PICKER','ANTRIAN','WAITLIST','ANAMNESIS','MEDICAL_INVOICE','PATIENT_RECORDS','MEDICATIONS','PRESCRIPTIONS']::text[],ARRAY['T3']::text[],true,'session','medical-clean','[{"slug":"klinik-umum","label":"Klinik Umum"},{"slug":"klinik-kecantikan","label":"Klinik Kecantikan"},{"slug":"dokter-gigi","label":"Dokter Gigi"}]'::jsonb),
('studio-foto','Studio Foto','Studio foto keluarga, wisuda, produk, dan layanan dokumentasi.',8,true,ARRAY['BOOKING','SERVICE_BUNDLES','PORTFOLIO','STUDIO_PACKAGES','STUDIO_DELIVERY','STUDIO_BRIEF','STUDIO_ADDONS','STUDIO_GALLERY']::text[],ARRAY['T3']::text[],true,'session','studio-editorial','[{"slug":"foto-keluarga","label":"Foto Keluarga"},{"slug":"foto-produk","label":"Foto Produk"},{"slug":"wisuda","label":"Wisuda"}]'::jsonb),
('travel','Travel','Agen travel, tour, open trip, dan penjualan paket perjalanan.',9,true,ARRAY['UMROH_PACKAGES','UMROH_FACILITIES','UMROH_FAQ','FLYERS','TESTIMONIALS','LEADS','ABOUT_PAGE','TRAVEL_MANIFEST','TRAVEL_INSTALLMENTS','TRAVEL_ITINERARY','JAMAAH_DOCUMENTS']::text[],ARRAY['T1']::text[],false,null,'travel-vivid','[{"slug":"open-trip","label":"Open Trip"},{"slug":"tour","label":"Tour"},{"slug":"umroh","label":"Umroh"}]'::jsonb),
('custom-order','Custom Order','Produksi by order, jasa desain, percetakan, dan pesanan sesuai brief.',10,true,ARRAY['CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS','JOB_DELIVERABLES','PRE_ORDERS']::text[],ARRAY['T5']::text[],false,null,'custom-craft','[{"slug":"desain","label":"Desain"},{"slug":"percetakan","label":"Percetakan"},{"slug":"produksi","label":"Produksi"}]'::jsonb),
('lainnya','Lainnya','Kategori umum untuk usaha yang belum masuk kategori khusus.',11,true,ARRAY['POS','MENU','BOOKING','CUSTOM_ORDER']::text[],ARRAY['T1','T3','T5']::text[],false,null,'generic-flex','[]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order,
  is_active=EXCLUDED.is_active, enabled_features=EXCLUDED.enabled_features,
  flow_types=EXCLUDED.flow_types, booking_enabled=EXCLUDED.booking_enabled,
  booking_type=EXCLUDED.booking_type, recommended_theme_key=EXCLUDED.recommended_theme_key,
  subtypes=EXCLUDED.subtypes, updated_at=now();

-- Plans
INSERT INTO public.plans (code, name, price_idr, duration_days, is_active, sort_order)
VALUES
  ('basic',    'Basic',    0,      3650, true, 1),
  ('pro',      'Pro',      99000,  30,   true, 2),
  ('business', 'Bisnis',   249000, 30,   true, 3)
ON CONFLICT (code) DO NOTHING;

-- Features
INSERT INTO public.features (key, name, description, category, is_active, sort_order)
VALUES
  ('website_builder',    'Website Builder',    'Builder halaman drag-and-drop berbasis Puck',       'appearance', true, 10),
  ('custom_css',         'Custom CSS',         'Tambah CSS sendiri untuk kustomisasi tampilan toko', 'appearance', true, 20),
  ('storefront_builder', 'Storefront Builder', 'Susun section toko (banner, produk unggulan, dll)',  'appearance', true, 30),
  ('premium_themes',     'Tema Premium',       'Akses semua tema premium',                           'appearance', true, 40),
  ('custom_domain',      'Custom Domain',      'Hubungkan domain sendiri ke toko',                   'appearance', true, 50)
ON CONFLICT (key) DO NOTHING;

-- Plan → feature mappings
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, 'storefront_builder' FROM public.plans p WHERE p.code='basic' ON CONFLICT(plan_id,feature_key) DO NOTHING;
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p, unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes']) k WHERE p.code='pro' ON CONFLICT(plan_id,feature_key) DO NOTHING;
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p, unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes','custom_domain']) k WHERE p.code='business' ON CONFLICT(plan_id,feature_key) DO NOTHING;


-- =============================================================================
-- SECTION 13 — BACKFILL (safe to run on existing data)
-- =============================================================================

-- Backfill owner roles for existing shops
INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id, is_active)
SELECT s.owner_id, 'owner', s.id, NULL, true FROM public.shops s WHERE s.owner_id IS NOT NULL
ON CONFLICT (user_id, role, shop_id, outlet_id) DO UPDATE SET is_active=true;

-- Revoke token leak from anon
REVOKE SELECT (custom_domain_verify_token) ON public.shops FROM anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- BEGIN: 07_functions_and_late_migrations.sql
-- =============================================================================
-- =============================================================================
-- FRESH SCHEMA — PART 7: Business Logic Functions & Late Migrations
-- Konsolidasi dari: fase2, fase3_fase4, fase6_fase7, fase8_fase9, fase10
-- Semua statement idempoten (IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING)
-- Jalankan SETELAH 01–06
-- =============================================================================

-- =============================================================================
-- SECTION 1 — EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- SECTION 2 — HELPER FUNCTION: set_updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers updated_at untuk tabel yang tidak punya trigger di 01-06
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'marketing_campaigns', 'storefront_layouts', 'group_buys',
    'product_subscription_plans', 'product_subscriptions',
    'consultation_sessions', 'live_sessions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
        CREATE TRIGGER trg_%1$s_updated_at
          BEFORE UPDATE ON public.%1$s
          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      ', tbl);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 3 — GIN / FULL-TEXT SEARCH INDEXES
-- =============================================================================
-- menu_items FTS (name + description, indonesian)
CREATE INDEX IF NOT EXISTS idx_menu_items_fts
  ON public.menu_items
  USING GIN (to_tsvector('indonesian', coalesce(name,'') || ' ' || coalesce(description,'')));

-- shops FTS (name + description + city)
CREATE INDEX IF NOT EXISTS idx_shops_fts
  ON public.shops
  USING GIN (to_tsvector('indonesian', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(city,'')));

-- Trigram indexes untuk ILIKE cepat
CREATE INDEX IF NOT EXISTS idx_menu_items_name_trgm
  ON public.menu_items USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_shops_name_trgm
  ON public.shops USING GIN (name gin_trgm_ops);

-- =============================================================================
-- SECTION 4 — KEYSET PAGINATION INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_shop_customers_keyset
  ON public.shop_customers (shop_id, total_spent DESC, id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_keyset
  ON public.product_reviews (shop_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_menu_reviews_keyset
  ON public.menu_reviews (shop_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_notifications_keyset
  ON public.notifications (recipient_user_id, created_at DESC, id)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_keyset
  ON public.orders (shop_id, created_at DESC, id);

-- =============================================================================
-- SECTION 5 — LATE ALTER TABLE ADDITIONS
-- =============================================================================

-- menu_items: Flash Sale columns
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS flash_price         NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_starts_at     TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_ends_at       TIMESTAMPTZ   DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_mi_flash_active
  ON public.menu_items (flash_ends_at)
  WHERE flash_price IS NOT NULL AND flash_ends_at IS NOT NULL;

-- menu_items: Happy Hour columns
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS happy_hour_start         TIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_end           TIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_discount_pct  SMALLINT  DEFAULT NULL
    CHECK (happy_hour_discount_pct IS NULL OR happy_hour_discount_pct BETWEEN 1 AND 99);

-- orders: commission tracking (commission_fee adalah GENERATED column di 06 dari commission_amount)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(6,4) DEFAULT 0;

-- couriers: saldo penghasilan (fase10)
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS balance       NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned  NUMERIC(15,2) NOT NULL DEFAULT 0;

-- withdrawal_requests: kurir (fase10)
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_courier
  ON public.withdrawal_requests (courier_id)
  WHERE courier_id IS NOT NULL;

-- =============================================================================
-- SECTION 6 — VIEWS
-- =============================================================================

-- Flash sale aktif (view helper)
CREATE OR REPLACE VIEW public.menu_items_flash_active AS
SELECT *
FROM public.menu_items
WHERE flash_price IS NOT NULL
  AND flash_starts_at <= now()
  AND flash_ends_at   >= now()
  AND is_active = TRUE;

-- Rata-rata rating per kurir
CREATE OR REPLACE VIEW public.courier_rating_summary AS
SELECT
  courier_id,
  COUNT(*)::INT                    AS total_ratings,
  ROUND(AVG(rating)::NUMERIC, 2)  AS avg_rating
FROM public.courier_ratings
GROUP BY courier_id;

-- Backward-compat alias: email_campaigns → marketing_campaigns
CREATE OR REPLACE VIEW public.email_campaigns AS
SELECT
  id, shop_id, name, subject, body_html, segment,
  status, recipient_count, scheduled_at, sent_at, created_at, updated_at
FROM public.marketing_campaigns;

-- =============================================================================
-- SECTION 7 — BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- ─── fn_notify_restock ───────────────────────────────────────────────────────
-- Dipanggil setelah stok item diisi ulang; notifikasi semua subscriber
CREATE OR REPLACE FUNCTION public.fn_notify_restock(_menu_item_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item_name TEXT;
  _count     INT := 0;
  _sub       RECORD;
BEGIN
  SELECT name INTO _item_name FROM public.menu_items WHERE id = _menu_item_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR _sub IN
    SELECT id, user_id, email
    FROM public.restock_subscribers
    WHERE menu_item_id = _menu_item_id AND notified_at IS NULL
  LOOP
    IF _sub.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, type, title, body)
      VALUES (
        _sub.user_id,
        'restock',
        'Stok tersedia!',
        _item_name || ' sudah tersedia kembali. Pesan sekarang sebelum habis!'
      ) ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.restock_subscribers SET notified_at = now() WHERE id = _sub.id;
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_notify_restock TO service_role;

-- ─── fn_apply_commission ──────────────────────────────────────────────────────
-- Hitung dan catat komisi platform untuk sebuah order.
-- Menulis ke commission_amount (lalu commission_fee digenerate otomatis di 06).
CREATE OR REPLACE FUNCTION public.fn_apply_commission(_order_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order        RECORD;
  _shop         RECORD;
  _cfg          JSONB;
  _enabled      BOOLEAN;
  _rate         NUMERIC;
  _min_order    NUMERIC;
  _mp_only      BOOLEAN;
  _fee          NUMERIC := 0;
  _cat_override JSONB;
BEGIN
  SELECT o.id, o.shop_id, o.total, o.channel, s.business_category_id, s.plan_id
  INTO _order
  FROM public.orders o
  JOIN public.shops  s ON s.id = o.shop_id
  WHERE o.id = _order_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT value INTO _cfg
  FROM public.platform_settings
  WHERE key = 'commission_config';

  _enabled := COALESCE((_cfg->>'enabled')::BOOLEAN, FALSE);
  IF NOT _enabled THEN RETURN 0; END IF;

  _min_order := COALESCE((_cfg->>'min_order_value')::NUMERIC, 10000);
  _mp_only   := COALESCE((_cfg->>'apply_to_marketplace_only')::BOOLEAN, TRUE);

  IF _mp_only AND _order.channel NOT IN ('marketplace', 'online') THEN RETURN 0; END IF;
  IF _order.total < _min_order THEN RETURN 0; END IF;

  -- Rate berdasarkan plan
  IF _order.plan_id IS NOT NULL THEN
    SELECT name INTO _shop FROM public.plans WHERE id = _order.plan_id;
    IF _shop.name ILIKE '%pro%' THEN
      _rate := COALESCE((_cfg->>'pro_plan_rate')::NUMERIC, 3) / 100.0;
    ELSIF _shop.name ILIKE '%free%' THEN
      _rate := COALESCE((_cfg->>'free_plan_rate')::NUMERIC, 5) / 100.0;
    ELSE
      _rate := COALESCE((_cfg->>'default_rate')::NUMERIC, 4) / 100.0;
    END IF;
  ELSE
    _rate := COALESCE((_cfg->>'default_rate')::NUMERIC, 4) / 100.0;
  END IF;

  -- Override per kategori bisnis
  IF _cfg->'category_overrides' IS NOT NULL THEN
    SELECT elem INTO _cat_override
    FROM jsonb_array_elements(_cfg->'category_overrides') elem
    WHERE elem->>'id' = (
      SELECT slug FROM public.business_categories WHERE id = _order.business_category_id
    )
    LIMIT 1;
    IF FOUND AND _cat_override IS NOT NULL THEN
      _rate := COALESCE((_cat_override->>'rate')::NUMERIC, _rate * 100) / 100.0;
    END IF;
  END IF;

  _fee := ROUND(_order.total * _rate, 0);

  IF _cat_override IS NOT NULL THEN
    IF (_cat_override->>'min_fee') IS NOT NULL THEN
      _fee := GREATEST(_fee, (_cat_override->>'min_fee')::NUMERIC);
    END IF;
    IF (_cat_override->>'max_fee') IS NOT NULL THEN
      _fee := LEAST(_fee, (_cat_override->>'max_fee')::NUMERIC);
    END IF;
  END IF;

  -- Tulis ke commission_amount (commission_fee di-generate otomatis dari kolom ini)
  UPDATE public.orders
  SET commission_amount = _fee, commission_rate = _rate
  WHERE id = _order_id;

  -- Kurangi dari saldo toko
  UPDATE public.shop_wallets
  SET pending_balance = GREATEST(0, pending_balance - _fee)
  WHERE shop_id = _order.shop_id;

  RETURN _fee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission TO service_role;

-- ─── fn_auto_cancel_expired ───────────────────────────────────────────────────
-- Auto-cancel pesanan pending yang sudah melewati batas waktu.
-- Dikonfigurasi via platform_settings: auto_cancel_hours, auto_cancel_enabled.
CREATE OR REPLACE FUNCTION public.fn_auto_cancel_expired()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hours    INT;
  _enabled  BOOLEAN;
  _cnt      INT := 0;
  _cutoff   TIMESTAMPTZ;
BEGIN
  SELECT (value::TEXT)::INT INTO _hours
  FROM public.platform_settings WHERE key = 'auto_cancel_hours';
  _hours := COALESCE(_hours, 24);

  SELECT (value::TEXT) = 'true' INTO _enabled
  FROM public.platform_settings WHERE key = 'auto_cancel_enabled';
  IF NOT COALESCE(_enabled, TRUE) THEN RETURN 0; END IF;

  _cutoff := now() - (_hours || ' hours')::INTERVAL;

  WITH cancelled AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now()
    WHERE status IN ('pending', 'awaiting_payment')
      AND created_at < _cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO _cnt FROM cancelled;

  INSERT INTO public.cron_runs (job_name, started_at, finished_at, result)
  VALUES ('auto_cancel_expired', now(), now(), jsonb_build_object('cancelled', _cnt));

  RETURN _cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_auto_cancel_expired TO service_role;

-- ─── fn_gdpr_erase_user ───────────────────────────────────────────────────────
-- Anonimisasi data pengguna (UU PDP / GDPR). Data agregat tetap ada.
CREATE OR REPLACE FUNCTION public.fn_gdpr_erase_user(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result      JSONB := '{}';
  _orders_anon INT   := 0;
  _profile_del INT   := 0;
BEGIN
  UPDATE public.orders
  SET customer_name  = 'Pengguna Dihapus',
      customer_phone = NULL,
      customer_email = NULL,
      user_id        = NULL
  WHERE user_id = _user_id;
  GET DIAGNOSTICS _orders_anon = ROW_COUNT;

  UPDATE public.bookings
  SET customer_name  = 'Pengguna Dihapus',
      customer_phone = NULL,
      customer_email = NULL
  WHERE user_id = _user_id;

  DELETE FROM public.customer_profiles   WHERE user_id = _user_id;
  GET DIAGNOSTICS _profile_del = ROW_COUNT;

  DELETE FROM public.push_subscriptions  WHERE user_id = _user_id;
  DELETE FROM public.notifications       WHERE recipient_user_id = _user_id;
  DELETE FROM public.marketplace_carts   WHERE user_id = _user_id;

  _result := jsonb_build_object(
    'user_id',           _user_id,
    'erased_at',         now(),
    'orders_anonymised', _orders_anon,
    'profile_deleted',   _profile_del
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_gdpr_erase_user TO service_role;

-- ─── fn_churn_metrics_snapshot ────────────────────────────────────────────────
-- Snapshot metrik churn toko ke cron_runs. Dipanggil berkala oleh cron/pg_cron.
CREATE OR REPLACE FUNCTION public.fn_churn_metrics_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'snapshot_at',  now(),
    'expiring_7d',  (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at BETWEEN now() AND now() + INTERVAL '7 days'),
    'expiring_30d', (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at BETWEEN now() AND now() + INTERVAL '30 days'),
    'expired',      (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at < now() AND plan_expires_at IS NOT NULL),
    'inactive_14d', (
      SELECT COUNT(DISTINCT s.id) FROM public.shops s
      LEFT JOIN public.orders o ON o.shop_id = s.id AND o.created_at > now() - INTERVAL '14 days'
      WHERE o.id IS NULL AND s.is_active = TRUE
    )
  ) INTO _result;

  INSERT INTO public.cron_runs (job_name, started_at, finished_at, result)
  VALUES ('churn_metrics_snapshot', now(), now(), _result);

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_churn_metrics_snapshot TO service_role;

-- ─── fn_generate_api_key ──────────────────────────────────────────────────────
-- Generate API key baru untuk merchant. Mengembalikan {key_id, full_key, prefix}.
-- full_key hanya ditampilkan sekali ke merchant.
CREATE OR REPLACE FUNCTION public.fn_generate_api_key(
  _shop_id    UUID,
  _name       TEXT,
  _scopes     TEXT[]    DEFAULT ARRAY['read'],
  _expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prefix   TEXT := 'umkm_live_';
  _rand     TEXT;
  _full_key TEXT;
  _hash     TEXT;
  _key_id   UUID;
BEGIN
  SELECT encode(gen_random_bytes(24), 'hex') INTO _rand;
  _full_key := _prefix || _rand;
  _hash     := md5(_full_key);

  INSERT INTO public.api_keys (shop_id, name, key_prefix, key_hash, scopes, expires_at, created_by)
  VALUES (_shop_id, _name, _prefix, _hash, _scopes, _expires_at, auth.uid())
  RETURNING id INTO _key_id;

  RETURN jsonb_build_object(
    'key_id',   _key_id,
    'full_key', _full_key,
    'prefix',   _prefix
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_api_key TO authenticated;

-- =============================================================================
-- SECTION 8 — PLATFORM SETTINGS SEED (gateway & email defaults)
-- =============================================================================
-- Baris ini membuat entry platform_settings untuk konfigurasi payment gateway
-- dan email. Nilai awal NULL / default; diisi via Super Admin UI.
INSERT INTO public.platform_settings (key, value, is_encrypted, category, description)
VALUES
  -- Midtrans
  ('gateway_midtrans_enabled',     'false',   FALSE, 'payment', 'Aktifkan Midtrans'),
  ('gateway_midtrans_server_key',  NULL,      TRUE,  'payment', 'Midtrans Server Key'),
  ('gateway_midtrans_client_key',  NULL,      TRUE,  'payment', 'Midtrans Client Key'),
  ('gateway_midtrans_mode',        'sandbox', FALSE, 'payment', 'Mode Midtrans (sandbox/production)'),
  -- Xendit
  ('gateway_xendit_enabled',       'false',   FALSE, 'payment', 'Aktifkan Xendit'),
  ('gateway_xendit_secret_key',    NULL,      TRUE,  'payment', 'Xendit Secret Key'),
  ('gateway_xendit_webhook_token', NULL,      FALSE, 'payment', 'Xendit Webhook Verification Token'),
  ('gateway_xendit_mode',          'test',    FALSE, 'payment', 'Mode Xendit (test/live)'),
  -- Email / Resend
  ('email_resend_api_key',         NULL,      TRUE,  'email',   'Resend API Key'),
  ('email_from',       'UMKMgo <noreply@umkmgo.id>', FALSE, 'email', 'Pengirim Email Default'),
  ('email_enabled',                'false',   FALSE, 'email',   'Aktifkan Pengiriman Email'),
  -- System behaviour
  ('auto_cancel_enabled', 'true',  FALSE, 'system', 'Auto-cancel pesanan kedaluwarsa'),
  ('auto_cancel_hours',   '24',    FALSE, 'system', 'Jam sebelum pesanan otomatis dibatalkan'),
  ('commission_config',
    '{"enabled":false,"default_rate":4,"free_plan_rate":5,"pro_plan_rate":3,"apply_to_marketplace_only":true,"min_order_value":10000}',
    FALSE, 'payment', 'Konfigurasi komisi platform')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SECTION 9 — RLS POLICIES (tabel yang dibuat di 06_post_consolidation)
-- =============================================================================

-- ── group_buys ────────────────────────────────────────────────────────────────
ALTER TABLE public.group_buys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gb_public_read  ON public.group_buys;
DROP POLICY IF EXISTS gb_shop_owner   ON public.group_buys;
CREATE POLICY gb_public_read ON public.group_buys
  FOR SELECT USING (true);
CREATE POLICY gb_shop_owner  ON public.group_buys
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── group_buy_participants ────────────────────────────────────────────────────
ALTER TABLE public.group_buy_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gbp_owner  ON public.group_buy_participants;
DROP POLICY IF EXISTS gbp_insert ON public.group_buy_participants;
CREATE POLICY gbp_owner ON public.group_buy_participants
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY gbp_insert ON public.group_buy_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── product_subscription_plans ───────────────────────────────────────────────
ALTER TABLE public.product_subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psp_public_read  ON public.product_subscription_plans;
DROP POLICY IF EXISTS psp_shop_owner   ON public.product_subscription_plans;
CREATE POLICY psp_public_read ON public.product_subscription_plans
  FOR SELECT USING (true);
CREATE POLICY psp_shop_owner  ON public.product_subscription_plans
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── product_subscriptions ────────────────────────────────────────────────────
ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ps_user_or_shop ON public.product_subscriptions;
DROP POLICY IF EXISTS ps_insert       ON public.product_subscriptions;
CREATE POLICY ps_user_or_shop ON public.product_subscriptions
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY ps_insert ON public.product_subscriptions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── bnpl_applications ────────────────────────────────────────────────────────
ALTER TABLE public.bnpl_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bnpl_user_or_shop ON public.bnpl_applications;
DROP POLICY IF EXISTS bnpl_insert       ON public.bnpl_applications;
CREATE POLICY bnpl_user_or_shop ON public.bnpl_applications
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY bnpl_insert ON public.bnpl_applications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── consultation_slots ────────────────────────────────────────────────────────
ALTER TABLE public.consultation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS csl_public_read ON public.consultation_slots;
DROP POLICY IF EXISTS csl_shop_owner  ON public.consultation_slots;
CREATE POLICY csl_public_read ON public.consultation_slots
  FOR SELECT USING (true);
CREATE POLICY csl_shop_owner  ON public.consultation_slots
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── consultation_sessions ────────────────────────────────────────────────────
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cse_user_or_shop ON public.consultation_sessions;
DROP POLICY IF EXISTS cse_insert       ON public.consultation_sessions;
CREATE POLICY cse_user_or_shop ON public.consultation_sessions
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY cse_insert ON public.consultation_sessions
  FOR INSERT WITH CHECK (true);

-- ── live_sessions ─────────────────────────────────────────────────────────────
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ls_public_read ON public.live_sessions;
DROP POLICY IF EXISTS ls_shop_owner  ON public.live_sessions;
CREATE POLICY ls_public_read ON public.live_sessions
  FOR SELECT USING (true);
CREATE POLICY ls_shop_owner  ON public.live_sessions
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── live_chat_messages ────────────────────────────────────────────────────────
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lcm_public_read ON public.live_chat_messages;
DROP POLICY IF EXISTS lcm_insert      ON public.live_chat_messages;
CREATE POLICY lcm_public_read ON public.live_chat_messages
  FOR SELECT USING (true);
CREATE POLICY lcm_insert ON public.live_chat_messages
  FOR INSERT WITH CHECK (true);

-- ── courier_ratings ───────────────────────────────────────────────────────────
ALTER TABLE public.courier_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courier_ratings_insert ON public.courier_ratings;
DROP POLICY IF EXISTS courier_ratings_select ON public.courier_ratings;
CREATE POLICY courier_ratings_insert ON public.courier_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY courier_ratings_select ON public.courier_ratings
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.couriers c WHERE c.id = courier_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.shop_id = courier_ratings.shop_id AND sm.user_id = auth.uid())
  );

-- ── platform_settings RLS ─────────────────────────────────────────────────────
-- Super admin bisa baca/tulis semua, user biasa tidak bisa akses
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_settings_admin   ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_service ON public.platform_settings;
CREATE POLICY platform_settings_admin ON public.platform_settings
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY platform_settings_service ON public.platform_settings
  TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- SECTION 10 — SUPABASE REALTIME
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- publication mungkin sudah ada atau tidak tersedia; skip
  NULL;
END $$;

-- =============================================================================
-- SECTION 11 — RLS TAMBAHAN (tabel dari 06 yang belum punya RLS di 07)
-- =============================================================================

-- ── wa_broadcasts ─────────────────────────────────────────────────────────────
ALTER TABLE public.wa_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wab_shop_owner ON public.wa_broadcasts;
DROP POLICY IF EXISTS wab_insert     ON public.wa_broadcasts;
CREATE POLICY wab_shop_owner ON public.wa_broadcasts
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role));
CREATE POLICY wab_insert ON public.wa_broadcasts
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
  );

-- =============================================================================
-- SECTION 12 — MERCHANT ANALYTICS RPCs (Fase 11)
-- Dibutuhkan oleh /pos-app/marketplace-analytics
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_stats(
  _shop_id uuid,
  _from    timestamptz,
  _to      timestamptz
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'gross_sales',      COALESCE(SUM(total), 0),
    'commission_paid',  COALESCE(SUM(commission_amount), 0),
    'net_revenue',      COALESCE(SUM(total) - SUM(commission_amount), 0),
    'orders',           COUNT(*),
    'aov',              CASE WHEN COUNT(*) > 0
                             THEN ROUND(SUM(total) / COUNT(*), 0)
                             ELSE 0 END,
    'unique_customers', (SELECT COUNT(DISTINCT customer_user_id)
                         FROM public.orders
                         WHERE shop_id = _shop_id
                           AND customer_user_id IS NOT NULL
                           AND status IN ('completed','delivering')
                           AND created_at BETWEEN _from AND _to),
    'completed',        COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress',      COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))
  )
  FROM public.orders
  WHERE shop_id = _shop_id
    AND status IN ('completed', 'delivering', 'paid', 'processing', 'ready')
    AND created_at BETWEEN _from AND _to;
$$;

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_daily(
  _shop_id uuid,
  _from    timestamptz,
  _to      timestamptz
)
RETURNS TABLE(day date, revenue numeric, orders bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    created_at::date                                      AS day,
    COALESCE(SUM(total) - SUM(commission_amount), 0)     AS revenue,
    COUNT(*)                                              AS orders
  FROM public.orders
  WHERE shop_id = _shop_id
    AND status IN ('completed', 'delivering', 'paid', 'processing', 'ready')
    AND created_at BETWEEN _from AND _to
  GROUP BY created_at::date
  ORDER BY day;
$$;

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_top_products(
  _shop_id uuid,
  _from    timestamptz,
  _to      timestamptz,
  _limit   int DEFAULT 10
)
RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    oi.menu_item_id,
    oi.name                                               AS item_name,
    SUM(oi.quantity)                                      AS qty,
    SUM(oi.quantity * oi.unit_price)                      AS revenue
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.shop_id = _shop_id
    AND o.status IN ('completed', 'delivering', 'paid', 'processing', 'ready')
    AND o.created_at BETWEEN _from AND _to
    AND oi.menu_item_id IS NOT NULL
  GROUP BY oi.menu_item_id, oi.name
  ORDER BY revenue DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_top_products TO authenticated;

-- =============================================================================
-- SECTION 13 — pg_cron SCHEDULE SETUP (BL-12)
-- ⚠️  PRASYARAT: Enable pg_cron di Supabase Dashboard terlebih dahulu:
--     Dashboard → Database → Extensions → cari "pg_cron" → Enable
--
-- Setelah pg_cron aktif, jalankan blok SQL di bawah ini di SQL Editor:
-- =============================================================================

-- Auto-cancel pesanan expired — setiap jam (menit 0)
/*
SELECT cron.schedule(
  'auto-cancel-expired-orders',
  '0 * * * *',
  $$ SELECT public.fn_auto_cancel_expired(); $$
);
*/

-- Snapshot metrik churn — setiap hari jam 01:00 WIB (18:00 UTC)
/*
SELECT cron.schedule(
  'churn-metrics-snapshot',
  '0 18 * * *',
  $$ SELECT public.fn_churn_metrics_snapshot(); $$
);
*/

-- Cek status cron jobs yang sudah dijadwalkan:
-- SELECT * FROM cron.job;
-- Hapus job: SELECT cron.unschedule('auto-cancel-expired-orders');

-- =============================================================================
-- SELESAI — 07_functions_and_late_migrations.sql
-- =============================================================================

-- =============================================================================
-- END OF FULL_MIGRATION.sql
-- =============================================================================
