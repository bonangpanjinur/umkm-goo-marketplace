-- Profit / margin report functions (Sprint 2.2 + 2.8)
CREATE OR REPLACE FUNCTION public.get_profit_report(_shop_id uuid, _from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_revenue numeric := 0;
  v_cogs numeric := 0;
  v_orders int := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = v_caller)
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

CREATE OR REPLACE FUNCTION public.get_profit_report_daily(_shop_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE(day date, revenue numeric, cogs numeric, gross_profit numeric, orders int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = v_caller)
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