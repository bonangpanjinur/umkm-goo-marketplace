-- ============================================================
-- Fase 11 — Analytics RPC Functions
-- Dibutuhkan oleh:
--   /admin/analytics          → get_marketplace_admin_*
--   /pos-app/marketplace-analytics → get_shop_marketplace_*
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── ADMIN: Platform-wide marketplace statistics ────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(
  _from timestamptz,
  _to   timestamptz
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'gmv',           COALESCE(SUM(total), 0),
    'commission',    COALESCE(SUM(commission_amount), 0),
    'net_to_shops',  COALESCE(SUM(total) - SUM(commission_amount), 0),
    'orders',        COUNT(*),
    'aov',           CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total) / COUNT(*), 0) ELSE 0 END,
    'take_rate',     CASE WHEN SUM(total) > 0
                          THEN ROUND((SUM(commission_amount) / SUM(total)) * 100, 2)
                          ELSE 0 END,
    'shops_active',  (SELECT COUNT(DISTINCT shop_id) FROM public.orders
                      WHERE status IN ('completed','delivering')
                        AND created_at BETWEEN _from AND _to),
    'customers',     (SELECT COUNT(DISTINCT customer_user_id) FROM public.orders
                      WHERE status IN ('completed','delivering')
                        AND customer_user_id IS NOT NULL
                        AND created_at BETWEEN _from AND _to)
  )
  FROM public.orders
  WHERE status IN ('completed', 'delivering')
    AND created_at BETWEEN _from AND _to;
$$;

-- ── ADMIN: Daily breakdown ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(
  _from timestamptz,
  _to   timestamptz
)
RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    created_at::date                            AS day,
    COALESCE(SUM(total), 0)                    AS gmv,
    COALESCE(SUM(commission_amount), 0)        AS commission,
    COUNT(*)                                    AS orders
  FROM public.orders
  WHERE status IN ('completed', 'delivering')
    AND created_at BETWEEN _from AND _to
  GROUP BY created_at::date
  ORDER BY day;
$$;

-- ── ADMIN: Top shops by GMV ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(
  _from  timestamptz,
  _to    timestamptz,
  _limit int DEFAULT 10
)
RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    o.shop_id,
    s.name                                      AS shop_name,
    COALESCE(SUM(o.total), 0)                  AS gmv,
    COALESCE(SUM(o.commission_amount), 0)      AS commission,
    COUNT(*)                                    AS orders
  FROM public.orders o
  JOIN public.shops s ON s.id = o.shop_id
  WHERE o.status IN ('completed', 'delivering')
    AND o.created_at BETWEEN _from AND _to
  GROUP BY o.shop_id, s.name
  ORDER BY gmv DESC
  LIMIT _limit;
$$;

-- ── MERCHANT: Per-shop marketplace statistics ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_stats(
  _shop_id uuid,
  _from    timestamptz,
  _to      timestamptz
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
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

-- ── MERCHANT: Daily trend ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_daily(
  _shop_id uuid,
  _from    timestamptz,
  _to      timestamptz
)
RETURNS TABLE(day date, revenue numeric, orders bigint)
LANGUAGE sql STABLE SECURITY DEFINER
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

-- ── MERCHANT: Top products by marketplace revenue ──────────────────────────────

CREATE OR REPLACE FUNCTION public.get_shop_marketplace_top_products(
  _shop_id uuid,
  _from    timestamptz,
  _to      timestamptz,
  _limit   int DEFAULT 10
)
RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER
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

-- ── Grant execution to authenticated users ─────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.get_marketplace_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_admin_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_admin_top_shops TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_daily TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_marketplace_top_products TO authenticated;
