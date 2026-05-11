-- Phase 4: Marketplace Analytics RPCs

-- Platform-wide marketplace analytics (super admin)
CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(
  _from timestamptz,
  _to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Daily series for charts
CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Top shops
CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(
  _from timestamptz,
  _to timestamptz,
  _limit integer DEFAULT 10
)
RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
  JOIN coffee_shops s ON s.id = o.shop_id
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY o.shop_id, s.name
  ORDER BY gmv DESC
  LIMIT _limit;
END;
$$;

-- Owner marketplace stats (per shop)
CREATE OR REPLACE FUNCTION public.get_shop_marketplace_stats(
  _shop_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
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

-- Owner top products in marketplace
CREATE OR REPLACE FUNCTION public.get_shop_marketplace_top_products(
  _shop_id uuid,
  _from timestamptz,
  _to timestamptz,
  _limit integer DEFAULT 10
)
RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    oi.menu_item_id,
    COALESCE(mi.name, oi.item_name) AS item_name,
    SUM(oi.quantity)::bigint AS qty,
    SUM(oi.line_total)::numeric AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.shop_id = _shop_id
    AND o.marketplace_order = true
    AND o.status NOT IN ('cancelled','pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY oi.menu_item_id, mi.name, oi.item_name
  ORDER BY revenue DESC
  LIMIT _limit;
END;
$$;

-- Owner daily series
CREATE OR REPLACE FUNCTION public.get_shop_marketplace_daily(
  _shop_id uuid,
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE(day date, revenue numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
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

REVOKE EXECUTE ON FUNCTION public.get_marketplace_admin_stats(timestamptz,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_marketplace_admin_daily(timestamptz,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_marketplace_admin_top_shops(timestamptz,timestamptz,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_shop_marketplace_stats(uuid,timestamptz,timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_shop_marketplace_top_products(uuid,timestamptz,timestamptz,integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_shop_marketplace_daily(uuid,timestamptz,timestamptz) FROM anon;