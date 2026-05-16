-- Integration test: verify the QR-table_label lock trigger blocks edits while order_source='qr_table'
-- and only allows edits after a clean transition to a non-locked source.
-- Runs once at migration time; safe to re-run (cleanup is in EXCEPTION/finally pattern).
DO $$
DECLARE
  v_shop uuid;
  v_outlet uuid;
  v_order uuid;
  v_after text;
  v_blocked boolean := false;
BEGIN
  SELECT s.id, o.id INTO v_shop, v_outlet
  FROM public.coffee_shops s
  JOIN public.outlets o ON o.shop_id = s.id
  ORDER BY s.created_at
  LIMIT 1;

  IF v_shop IS NULL OR v_outlet IS NULL THEN
    RAISE NOTICE '[qr-lock-test] skipped — no shop/outlet present';
    RETURN;
  END IF;

  -- Seed a synthetic QR-table order
  INSERT INTO public.orders (shop_id, outlet_id, channel, fulfillment, order_source, table_label, payment_method, status)
  VALUES (v_shop, v_outlet, 'online', 'dine_in', 'qr_table', 'TEST-LOCK-1', 'cash', 'pending')
  RETURNING id INTO v_order;

  -- Case 1: editing table_label while qr_table MUST be blocked
  BEGIN
    UPDATE public.orders SET table_label = 'TEST-LOCK-CHANGED' WHERE id = v_order;
  EXCEPTION WHEN check_violation THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    DELETE FROM public.orders WHERE id = v_order;
    RAISE EXCEPTION '[qr-lock-test] FAILED — table_label edit was NOT blocked on qr_table order';
  END IF;

  SELECT table_label INTO v_after FROM public.orders WHERE id = v_order;
  IF v_after <> 'TEST-LOCK-1' THEN
    DELETE FROM public.orders WHERE id = v_order;
    RAISE EXCEPTION '[qr-lock-test] FAILED — table_label changed despite block: got %', v_after;
  END IF;

  -- Case 2: switching order_source to 'pos' (unlock) MUST succeed
  UPDATE public.orders SET order_source = 'pos' WHERE id = v_order;

  -- Case 3: editing table_label after unlock MUST succeed
  UPDATE public.orders SET table_label = 'TEST-LOCK-UNLOCKED' WHERE id = v_order;
  SELECT table_label INTO v_after FROM public.orders WHERE id = v_order;
  IF v_after <> 'TEST-LOCK-UNLOCKED' THEN
    DELETE FROM public.orders WHERE id = v_order;
    RAISE EXCEPTION '[qr-lock-test] FAILED — table_label did not update after unlock: got %', v_after;
  END IF;

  -- Cleanup
  DELETE FROM public.orders WHERE id = v_order;
  RAISE NOTICE '[qr-lock-test] PASSED — trigger blocks edits while qr_table and allows edits after unlock';
END $$;

-- Reusable function so the test can be re-run at any time from psql:
--   SELECT public.test_qr_table_lock();
CREATE OR REPLACE FUNCTION public.test_qr_table_lock()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop uuid;
  v_outlet uuid;
  v_order uuid;
  v_after text;
  v_blocked boolean := false;
BEGIN
  SELECT s.id, o.id INTO v_shop, v_outlet
  FROM public.coffee_shops s JOIN public.outlets o ON o.shop_id = s.id LIMIT 1;
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