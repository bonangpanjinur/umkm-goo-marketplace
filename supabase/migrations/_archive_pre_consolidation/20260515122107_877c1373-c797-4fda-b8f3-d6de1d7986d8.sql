
CREATE OR REPLACE FUNCTION public.get_shop_marketplace_top_products(
  _shop_id uuid, _from timestamptz, _to timestamptz, _limit integer DEFAULT 10
)
RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
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
$function$;
