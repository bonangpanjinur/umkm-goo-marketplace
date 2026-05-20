
CREATE OR REPLACE FUNCTION public.approve_invoice(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inv plan_invoices%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_inv FROM plan_invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status = 'paid' THEN RETURN; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_inv.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  UPDATE plan_invoices
    SET status='paid', paid_at=now(), reviewed_by=v_caller, reviewed_at=now(), updated_at=now()
    WHERE id=_invoice_id;

  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO v_start FROM shops WHERE id = v_inv.shop_id;
  v_end := v_start + make_interval(days => v_plan.duration_days);

  UPDATE shops
    SET plan = v_plan.code,
        plan_started_at = COALESCE(plan_started_at, now()),
        plan_expires_at = v_end,
        suspended_at = NULL,
        suspended_reason = NULL,
        updated_at = now()
    WHERE id = v_inv.shop_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE plan_invoices
    SET status='rejected',
        reviewed_by=v_caller,
        reviewed_at=now(),
        notes=COALESCE(_reason, notes),
        updated_at=now()
    WHERE id=_invoice_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_invoice(uuid, text) TO authenticated;
