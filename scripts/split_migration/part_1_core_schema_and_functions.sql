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
CREATE TABLE public.shops__bootstrap_placeholder (
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

CREATE FUNCTION public.accept_staff_invitation(_token text) RETURNS jsonb
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

CREATE FUNCTION public.admin_dashboard_stats() RETURNS jsonb
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

CREATE FUNCTION public.admin_remove_plan_feature(_plan_id uuid, _feature_key text) RETURNS void
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

CREATE FUNCTION public.admin_remove_plan_theme(_plan_id uuid, _theme_key text) RETURNS void
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

CREATE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamp with time zone) RETURNS void
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

CREATE FUNCTION public.admin_shop_detail(_shop_id uuid) RETURNS jsonb
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

CREATE FUNCTION public.admin_suspend_shop(_shop_id uuid, _reason text) RETURNS void
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

CREATE FUNCTION public.admin_unsuspend_shop(_shop_id uuid) RETURNS void
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

CREATE FUNCTION public.admin_upsert_feature(_key text, _name text, _description text, _category text, _is_active boolean, _sort_order integer) RETURNS void
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

CREATE FUNCTION public.admin_upsert_plan_feature(_plan_id uuid, _feature_key text, _requires_min_months integer, _limit_value integer, _meta jsonb) RETURNS void
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

CREATE FUNCTION public.admin_upsert_plan_theme(_plan_id uuid, _theme_key text, _requires_min_months integer) RETURNS void
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

CREATE FUNCTION public.admin_upsert_theme(_key text, _name text, _description text, _component_id text, _preview_image_url text, _tier_hint text, _is_active boolean, _sort_order integer) RETURNS void
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

CREATE FUNCTION public.apply_loyalty_post_order(_shop_id uuid, _user_id uuid, _order_id uuid, _earned integer, _redeemed integer) RETURNS void
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

CREATE FUNCTION public.apply_stock_movement() RETURNS trigger
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

CREATE FUNCTION public.approve_plan_invoice(_invoice_id uuid) RETURNS jsonb
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

CREATE FUNCTION public.approve_wallet_topup(_topup_id uuid) RETURNS uuid
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

CREATE FUNCTION public.approve_withdrawal(_id uuid, _proof_url text DEFAULT NULL::text) RETURNS void
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

CREATE FUNCTION public.assign_courier_atomic(_order_id uuid, _courier_id uuid) RETURNS jsonb
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

CREATE FUNCTION public.auto_cancel_pending_deposit_bookings() RETURNS TABLE(cancelled_count integer, cutoff_hours integer)
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

CREATE FUNCTION public.auto_release_escrow() RETURNS jsonb
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

CREATE FUNCTION public.auto_release_escrow_on_complete() RETURNS trigger
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

CREATE FUNCTION public.auto_unverify_domain(_shop_id uuid, _reason text) RETURNS void
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

CREATE FUNCTION public.booking_cancel_by_token(_token uuid, _reason text DEFAULT NULL::text) RETURNS jsonb
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

CREATE FUNCTION public.bookings_fill_shop_id() RETURNS trigger
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

CREATE FUNCTION public.calc_attendance_duration() RETURNS trigger
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

CREATE FUNCTION public.check_booking_capacity() RETURNS trigger
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

CREATE FUNCTION public.close_shift(_shift_id uuid, _closing_cash numeric, _note text DEFAULT NULL::text) RETURNS jsonb
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

CREATE FUNCTION public.compute_upsell_suggestions() RETURNS TABLE(processed_products integer, inserted_pairs integer)
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

CREATE FUNCTION public.consume_stock_for_order_item() RETURNS trigger
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

CREATE FUNCTION public.courier_mark_delivered(_order_id uuid, _proof_url text) RETURNS void
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

CREATE FUNCTION public.create_notification(_recipient uuid, _type text, _title text, _body text DEFAULT NULL::text, _link text DEFAULT NULL::text, _severity text DEFAULT 'info'::text, _shop_id uuid DEFAULT NULL::uuid, _dedupe_key text DEFAULT NULL::text) RETURNS uuid
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

CREATE FUNCTION public.enforce_qr_table_lock() RETURNS trigger
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

CREATE FUNCTION public.ensure_shop_wallet(_shop_id uuid) RETURNS void
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

CREATE FUNCTION public.escrow_hold_order(_order_id uuid) RETURNS jsonb
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

CREATE FUNCTION public.escrow_refund_order(_order_id uuid, _reason text DEFAULT NULL::text) RETURNS jsonb
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

CREATE FUNCTION public.escrow_release_order(_order_id uuid) RETURNS jsonb
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

CREATE FUNCTION public.expire_overdue_plans() RETURNS TABLE(shop_id uuid)
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

CREATE FUNCTION public.expire_stale_pending_invoices() RETURNS integer
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

CREATE FUNCTION public.fn_issue_course_certificate() RETURNS trigger
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

CREATE FUNCTION public.generate_owner_reminders() RETURNS jsonb
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

CREATE FUNCTION public.get_billing_settings_public() RETURNS TABLE(bank_name text, account_no text, account_name text, instructions text, qris_image_url text)
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

CREATE FUNCTION public.get_customer_custom_orders(p_shop_slug text, p_contact text) RETURNS TABLE(id uuid, shop_id uuid, product_id uuid, product_name text, customer_name text, description text, budget_min numeric, budget_max numeric, deadline date, reference_image_url text, status text, owner_note text, created_at timestamp with time zone, updated_at timestamp with time zone, history jsonb)
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

CREATE FUNCTION public.get_marketplace_admin_daily(_from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
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

CREATE FUNCTION public.get_marketplace_admin_stats(_from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
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

CREATE FUNCTION public.get_marketplace_admin_top_shops(_from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10) RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
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

CREATE FUNCTION public.get_my_active_memberships(_shop_ids uuid[]) RETURNS TABLE(shop_id uuid, tier_id uuid, tier_name text, discount_percent numeric, expires_at timestamp with time zone)
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

CREATE FUNCTION public.get_my_entitlements() RETURNS jsonb
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

CREATE FUNCTION public.get_or_create_marketplace_cart() RETURNS uuid
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

CREATE FUNCTION public.get_order_tracking(_order_id uuid) RETURNS TABLE(id uuid, order_no text, status public.order_status, fulfillment public.fulfillment_type, channel public.order_channel, total numeric, delivery_fee numeric, delivery_address text, customer_name text, created_at timestamp with time zone, updated_at timestamp with time zone, shop_name text, shop_slug text, courier_name text, courier_phone text, courier_plate text, delivery_proof_url text, delivered_at timestamp with time zone)
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

CREATE FUNCTION public.get_profit_report(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
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

CREATE FUNCTION public.get_profit_report_daily(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, revenue numeric, cogs numeric, gross_profit numeric, orders integer)
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

CREATE FUNCTION public.get_shop_entitlements(_shop_id uuid) RETURNS jsonb
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

CREATE FUNCTION public.get_shop_marketplace_daily(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, revenue numeric, orders bigint)
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

CREATE FUNCTION public.get_shop_marketplace_stats(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
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

CREATE FUNCTION public.get_shop_marketplace_top_products(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10) RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
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

CREATE FUNCTION public.handle_new_customer_signup() RETURNS trigger
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

CREATE FUNCTION public.handle_new_user() RETURNS trigger
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

CREATE FUNCTION public.has_outlet_access(_user_id uuid, _outlet_id uuid) RETURNS boolean
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

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
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

CREATE FUNCTION public.has_shop_role(_user_id uuid, _role public.app_role, _shop_id uuid) RETURNS boolean
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

CREATE FUNCTION public.increment_promo_usage(_promo_id uuid) RETURNS void
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

CREATE FUNCTION public.is_courier_of_shop(_user_id uuid, _shop_id uuid) RETURNS boolean
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

CREATE FUNCTION public.is_shop_owner(_shop_id uuid, _user_id uuid) RETURNS boolean
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

CREATE FUNCTION public.link_courier_account() RETURNS integer
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

CREATE FUNCTION public.list_available_delivery_orders(_courier_id uuid) RETURNS TABLE(id uuid, order_no text, status public.order_status, total numeric, delivery_fee numeric, delivery_address text, customer_name text, customer_phone text, note text, created_at timestamp with time zone)
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

CREATE FUNCTION public.log_custom_order_status_change() RETURNS trigger
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

CREATE FUNCTION public.log_shift_change() RETURNS trigger
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

CREATE FUNCTION public.log_system_event(_event_type text, _shop_id uuid, _payload jsonb DEFAULT '{}'::jsonb, _notes text DEFAULT NULL::text) RETURNS uuid
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

CREATE FUNCTION public.mark_all_notifications_read() RETURNS integer
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

CREATE FUNCTION public.mark_notification_read(_id uuid) RETURNS void
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

CREATE FUNCTION public.marketplace_checkout(_recipient_name text, _phone text, _address text, _fulfillment text DEFAULT 'delivery'::text, _payment_method text DEFAULT 'manual_transfer'::text, _notes text DEFAULT NULL::text, _shipping jsonb DEFAULT '{}'::jsonb, _shop_voucher_codes jsonb DEFAULT '{}'::jsonb, _platform_voucher_code text DEFAULT NULL::text) RETURNS jsonb
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

CREATE FUNCTION public.next_order_no(_outlet_id uuid) RETURNS text
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

CREATE FUNCTION public.notify_dispute_event() RETURNS trigger
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

CREATE FUNCTION public.notify_low_stock() RETURNS trigger
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

CREATE FUNCTION public.notify_membership_event() RETURNS trigger
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

CREATE FUNCTION public.notify_new_marketplace_order() RETURNS trigger
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

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
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

CREATE FUNCTION public.notify_wallet_topup_event() RETURNS trigger
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

CREATE FUNCTION public.notify_withdrawal_status() RETURNS trigger
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

CREATE FUNCTION public.open_dispute(_order_id uuid, _reason text, _description text DEFAULT NULL::text, _photos jsonb DEFAULT '[]'::jsonb) RETURNS uuid
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

CREATE FUNCTION public.open_shift(_outlet_id uuid, _opening_cash numeric) RETURNS uuid
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

CREATE FUNCTION public.process_booking_reminders() RETURNS TABLE(h1_count integer, h1h_count integer, review_count integer)
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

CREATE FUNCTION public.process_subscription_renewals() RETURNS jsonb
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

CREATE FUNCTION public.receive_purchase_order(_po_id uuid) RETURNS void
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

CREATE FUNCTION public.refresh_product_rating() RETURNS trigger
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

CREATE FUNCTION public.refund_order(_order_id uuid, _amount numeric, _reason text DEFAULT NULL::text, _method text DEFAULT 'cash'::text) RETURNS uuid
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

CREATE FUNCTION public.reject_plan_invoice(_invoice_id uuid, _reason text DEFAULT NULL::text) RETURNS void
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

CREATE FUNCTION public.reject_wallet_topup(_topup_id uuid, _reason text DEFAULT NULL::text) RETURNS void
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

CREATE FUNCTION public.reject_withdrawal(_id uuid, _reason text) RETURNS void
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

CREATE FUNCTION public.reload_postgrest_schema() RETURNS void
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

CREATE FUNCTION public.request_withdrawal(_shop_id uuid, _amount numeric, _bank_name text, _bank_account_no text, _bank_account_name text) RETURNS uuid
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

CREATE FUNCTION public.resolve_dispute(_dispute_id uuid, _status text, _resolution text DEFAULT NULL::text, _refund_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
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

CREATE FUNCTION public.run_expiry_reminders_v2() RETURNS jsonb
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

CREATE FUNCTION public.run_scheduled_publishes() RETURNS jsonb
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

CREATE FUNCTION public.send_booking_reminders() RETURNS jsonb
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

CREATE FUNCTION public.send_membership_expiry_reminders() RETURNS integer
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

CREATE FUNCTION public.send_order_message(_order_id uuid, _body text, _attachment_url text DEFAULT NULL::text) RETURNS uuid
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

CREATE FUNCTION public.set_booking_type_from_slot() RETURNS trigger
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

CREATE FUNCTION public.set_custom_domain_verified(_shop_id uuid, _verified boolean) RETURNS void
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

CREATE FUNCTION public.set_order_no() RETURNS trigger
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

CREATE FUNCTION public.set_shop_theme(_shop_id uuid, _theme_key text) RETURNS void
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

CREATE FUNCTION public.shop_chat_set_last_message_at() RETURNS trigger
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

CREATE FUNCTION public.test_qr_table_lock() RETURNS text
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

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: update_shop_chat_last_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shop_chat_last_message() RETURNS trigger
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

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
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

CREATE FUNCTION public.upsell_fill_shop_id() RETURNS trigger
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

CREATE FUNCTION public.upsert_shop_customer_on_order() RETURNS trigger
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

CREATE FUNCTION public.user_belongs_to_shop(_user_id uuid, _shop_id uuid) RETURNS boolean
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

CREATE FUNCTION public.validate_business_category_flow_types() RETURNS trigger
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

CREATE FUNCTION public.validate_plan_feature_min_months() RETURNS trigger
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

CREATE FUNCTION public.validate_plan_theme_min_months() RETURNS trigger
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

CREATE FUNCTION public.validate_promo(_shop_id uuid, _code text, _subtotal numeric, _channel text) RETURNS TABLE(promo_id uuid, code text, discount numeric, error text)
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

CREATE FUNCTION public.validate_shift_no_overlap() RETURNS trigger
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

CREATE FUNCTION public.void_order(_order_id uuid, _reason text DEFAULT NULL::text) RETURNS void
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

CREATE TABLE public.ad_requests (
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

CREATE TABLE public.attendances (
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

CREATE TABLE public.backup_schedules (
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

CREATE TABLE public.banners (
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

CREATE TABLE public.billing_settings (
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

CREATE TABLE public.booking_reschedule_tokens (
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

CREATE TABLE public.booking_review_requests (
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

CREATE TABLE public.booking_reviews (
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

CREATE TABLE public.booking_slots (
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

CREATE TABLE public.booking_waitlist (
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

CREATE TABLE public.bookings (
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

CREATE TABLE public.branding_audit (
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

CREATE TABLE public.bulk_pricing_rules (
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

CREATE TABLE public.bundle_items (
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

CREATE TABLE public.business_categories (
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

CREATE TABLE public.campaign_recipients (
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

CREATE TABLE public.cash_movements (
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

CREATE TABLE public.cash_shifts (
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

CREATE TABLE public.categories (
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

CREATE TABLE public.couriers (
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

CREATE TABLE public.orders (
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

CREATE TABLE public.course_certificates (
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

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_lessons (
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

CREATE TABLE public.course_modules (
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

CREATE TABLE public.cron_runs (
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

CREATE TABLE public.custom_order_quotes (
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

CREATE TABLE public.custom_order_requests (
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

CREATE TABLE public.custom_order_status_history (
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

CREATE TABLE public.customer_addresses (
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

CREATE TABLE public.customer_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_memberships (
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

CREATE TABLE public.customer_profiles (
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

CREATE TABLE public.customer_segments (
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

CREATE TABLE public.customer_treatments (
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

CREATE TABLE public.customer_wallet_transactions (
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

CREATE TABLE public.customer_wallets (
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

CREATE TABLE public.delivery_settings (
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

CREATE TABLE public.delivery_zones (
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

CREATE TABLE public.domain_audit (
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

CREATE TABLE public.domain_blacklist (
    domain text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_verify_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_verify_attempts (
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

CREATE TABLE public.expiry_reminder_rules (
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

CREATE TABLE public.expiry_reminder_shop_rules (
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

CREATE TABLE public.expiry_reminder_shop_settings (
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

CREATE TABLE public.features (
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

CREATE TABLE public.flash_sales (
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

CREATE TABLE public.flyers (
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

CREATE TABLE public.fnb_combos (
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

CREATE TABLE public.freelance_contracts (
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

CREATE TABLE public.icd10_codes (
    code text NOT NULL,
    label_id text NOT NULL,
    category text
);


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
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

CREATE TABLE public.job_deliverables (
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

CREATE TABLE public.leads (
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

CREATE TABLE public.lesson_progress (
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

CREATE TABLE public.loyalty_ledger (
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

CREATE TABLE public.loyalty_points (
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

CREATE TABLE public.loyalty_settings (
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

CREATE TABLE public.marketing_campaigns (
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

CREATE TABLE public.marketplace_cart_items (
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

CREATE TABLE public.marketplace_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
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

CREATE TABLE public.menu_item_option_groups (
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

CREATE TABLE public.menu_item_options (
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

CREATE TABLE public.menu_item_variants (
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

CREATE TABLE public.menu_items (
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

CREATE TABLE public.menu_reviews (
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

CREATE TABLE public.notifications (
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

CREATE TABLE public.open_bills (
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

CREATE TABLE public.order_audit_log (
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

CREATE TABLE public.order_disputes (
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

CREATE TABLE public.order_items (
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

CREATE TABLE public.order_messages (
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

CREATE TABLE public.outlet_couriers (
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

CREATE TABLE public.outlets (
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

CREATE TABLE public.owner_notifications (
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

CREATE TABLE public.page_layout_versions (
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

CREATE TABLE public.page_layouts (
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

CREATE TABLE public.parked_carts (
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

CREATE TABLE public.patient_records (
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

CREATE TABLE public.patient_visits (
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

CREATE TABLE public.plan_features (
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

CREATE TABLE public.plan_invoices (
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

CREATE TABLE public.plan_subscriptions (
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

CREATE TABLE public.plan_themes (
    plan_id uuid NOT NULL,
    theme_key text NOT NULL,
    requires_min_months integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
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

CREATE TABLE public.platform_settings (
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

CREATE TABLE public.platform_voucher_redemptions (
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

CREATE TABLE public.platform_vouchers (
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

CREATE TABLE public.po_audit_log (
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

CREATE TABLE public.pos_audit_log (
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

CREATE TABLE public.prescription_items (
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

CREATE TABLE public.prescriptions (
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

CREATE TABLE public.printers (
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

CREATE TABLE public.product_attribute_defs (
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

CREATE TABLE public.product_qa (
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

CREATE TABLE public.product_returns (
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

CREATE TABLE public.product_reviews (
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

CREATE TABLE public.product_upsell_suggestions (
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

CREATE TABLE public.profiles (
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

CREATE TABLE public.promo_redemptions (
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

CREATE TABLE public.promos (
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

CREATE TABLE public.purchase_order_items (
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

CREATE TABLE public.purchase_orders (
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

CREATE TABLE public.push_subscriptions (
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

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
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

CREATE TABLE public.rental_bookings (
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

CREATE TABLE public.rental_inspections (
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

CREATE TABLE public.rental_units (
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

CREATE TABLE public.restock_subscribers (
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

CREATE TABLE public.sales_offerings (
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

CREATE TABLE public.service_bundle_items (
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

CREATE TABLE public.service_bundles (
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

CREATE TABLE public.shifts (
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

CREATE TABLE public.shop_about (
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

CREATE TABLE public.shop_backups (
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

CREATE TABLE public.shop_chat_messages (
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

CREATE TABLE public.shop_chats (
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

CREATE TABLE public.shop_customers (
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

CREATE TABLE public.shops (
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

CREATE TABLE public.shop_membership_tiers (
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

CREATE TABLE public.shop_portfolio (
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

CREATE TABLE public.shop_size_charts (
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

CREATE TABLE public.shop_verifications (
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

CREATE TABLE public.shop_vouchers (
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

CREATE TABLE public.shop_wallets (
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

CREATE TABLE public.staff_audit_logs (
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

CREATE TABLE public.staff_invitations (
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

CREATE TABLE public.staff_members (
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

CREATE TABLE public.staff_permissions (
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

CREATE TABLE public.stock_movements (
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

CREATE TABLE public.stock_opname_items (
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

CREATE TABLE public.stock_opnames (
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

CREATE TABLE public.studio_galleries (
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

CREATE TABLE public.studio_gallery_photos (
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

CREATE TABLE public.studio_locations (
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

CREATE TABLE public.studio_packages (
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

CREATE TABLE public.studio_photographers (
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

CREATE TABLE public.suppliers (
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

CREATE TABLE public.system_audit (
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

CREATE TABLE public.testimonials (
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

CREATE TABLE public.themes (
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

CREATE TABLE public.travel_installments (
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

CREATE TABLE public.travel_itineraries (
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

CREATE TABLE public.travel_jamaah_documents (
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

CREATE TABLE public.travel_jamaah_manifest (
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

CREATE TABLE public.umroh_facilities (
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

CREATE TABLE public.umroh_faqs (
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

CREATE TABLE public.umroh_packages (
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

CREATE TABLE public.user_preferences (
    user_id uuid NOT NULL,
    default_outlet_id uuid,
    active_carts jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
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

CREATE TABLE public.wallet_topup_presets (
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

CREATE TABLE public.wallet_topups (
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

CREATE TABLE public.wallet_transactions (
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

CREATE TABLE public.webhook_events (
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

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_requests (
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

