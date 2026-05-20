
-- 1) create_plan_invoice: builds invoice from current plans row (live pricing)
CREATE OR REPLACE FUNCTION public.create_plan_invoice(_plan_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_shop_id uuid;
  v_plan plans%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_no text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT id INTO v_shop_id FROM shops WHERE owner_id = v_caller LIMIT 1;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no_shop'; END IF;

  SELECT * INTO v_plan FROM plans WHERE code = _plan_code AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found_or_inactive'; END IF;

  v_invoice_no := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO plan_invoices (shop_id, plan_id, invoice_no, amount_idr, status, payment_method)
  VALUES (v_shop_id, v_plan.id, v_invoice_no, v_plan.price_idr, 'pending', 'manual')
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_plan_invoice(text) TO authenticated;

-- 2) approve_plan_invoice: use actual plan code, sync plan_subscriptions
CREATE OR REPLACE FUNCTION public.approve_plan_invoice(_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO v_base
    FROM shops WHERE id = v_inv.shop_id;
  v_new_expiry := v_base + (v_plan.duration_days || ' days')::interval;

  UPDATE plan_invoices
    SET status = 'paid', paid_at = now(),
        reviewed_by = v_caller, reviewed_at = now(),
        updated_at = now()
    WHERE id = _invoice_id;

  UPDATE shops
    SET plan = v_plan.code,
        plan_expires_at = v_new_expiry,
        updated_at = now()
    WHERE id = v_inv.shop_id;

  -- Sync subscription record (upsert)
  INSERT INTO plan_subscriptions (shop_id, plan_id, plan_code, status, billing_interval, next_billing_at, amount_idr, last_invoice_id, last_charge_at)
  VALUES (v_inv.shop_id, v_plan.id, v_plan.code, 'active', 'monthly', v_new_expiry, v_plan.price_idr, _invoice_id, now())
  ON CONFLICT (shop_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        plan_code = EXCLUDED.plan_code,
        amount_idr = EXCLUDED.amount_idr,
        next_billing_at = EXCLUDED.next_billing_at,
        last_invoice_id = EXCLUDED.last_invoice_id,
        last_charge_at = EXCLUDED.last_charge_at,
        status = 'active',
        failure_count = 0,
        updated_at = now();

  RETURN jsonb_build_object('shop_id', v_inv.shop_id, 'plan_code', v_plan.code, 'plan_expires_at', v_new_expiry);
END;
$$;

-- 3) admin_set_shop_plan: accept any active plan code, sync subscription
CREATE OR REPLACE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_plan text;
  old_exp timestamptz;
  v_plan plans%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Allow 'free' as a non-catalog reset, else require a matching active plan
  IF _plan <> 'free' THEN
    SELECT * INTO v_plan FROM plans WHERE code = _plan AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  END IF;

  SELECT plan, plan_expires_at INTO old_plan, old_exp FROM shops WHERE id = _shop_id;

  UPDATE shops
    SET plan = _plan,
        plan_expires_at = CASE WHEN _plan = 'free' THEN NULL ELSE _expires_at END,
        updated_at = now()
    WHERE id = _shop_id;

  -- Sync subscription mirror
  IF _plan = 'free' THEN
    UPDATE plan_subscriptions
      SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE shop_id = _shop_id;
  ELSE
    INSERT INTO plan_subscriptions (shop_id, plan_id, plan_code, status, billing_interval, next_billing_at, amount_idr)
    VALUES (_shop_id, v_plan.id, v_plan.code, 'active', 'monthly', COALESCE(_expires_at, now() + (v_plan.duration_days || ' days')::interval), v_plan.price_idr)
    ON CONFLICT (shop_id) DO UPDATE
      SET plan_id = EXCLUDED.plan_id,
          plan_code = EXCLUDED.plan_code,
          amount_idr = EXCLUDED.amount_idr,
          next_billing_at = EXCLUDED.next_billing_at,
          status = 'active',
          updated_at = now();
  END IF;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('plan_manual_set', _shop_id, auth.uid(),
    jsonb_build_object('old_plan', old_plan, 'old_expires_at', old_exp, 'new_plan', _plan, 'new_expires_at', _expires_at),
    'super-admin manual override');
END;
$$;
