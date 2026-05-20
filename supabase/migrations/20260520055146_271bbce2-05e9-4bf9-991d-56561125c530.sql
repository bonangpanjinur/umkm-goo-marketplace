CREATE OR REPLACE VIEW public.coffee_shops
WITH (security_invoker = true) AS
SELECT * FROM public.shops;

ALTER VIEW public.coffee_shops OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_shops TO authenticated, service_role;
GRANT SELECT ON public.coffee_shops TO anon;

CREATE OR REPLACE VIEW public.shops__bootstrap_placeholder
WITH (security_invoker = true) AS
SELECT * FROM public.shops;

ALTER VIEW public.shops__bootstrap_placeholder OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops__bootstrap_placeholder TO authenticated, service_role;
GRANT SELECT ON public.shops__bootstrap_placeholder TO anon;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(_from timestamp with time zone, _to timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'gmv', COALESCE(SUM(o.total), 0),
    'commission', COALESCE(SUM(o.commission_amount), 0),
    'net_to_shops', COALESCE(SUM(o.net_to_shop), 0),
    'orders', COUNT(*),
    'aov', COALESCE(AVG(o.total), 0),
    'take_rate', CASE WHEN COALESCE(SUM(o.total),0) > 0
                      THEN ROUND((COALESCE(SUM(o.commission_amount),0) / SUM(o.total) * 100)::numeric, 2)
                      ELSE 0 END,
    'shops_active', COUNT(DISTINCT o.shop_id),
    'customers', COUNT(DISTINCT o.customer_user_id)
  )
  INTO v_result
  FROM public.orders o
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(_from timestamp with time zone, _to timestamp with time zone)
RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
    COALESCE(SUM(o.total), 0)::numeric AS gmv,
    COALESCE(SUM(o.commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM public.orders o
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY 1
  ORDER BY 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(_from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10)
RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.shop_id,
    s.name AS shop_name,
    COALESCE(SUM(o.total), 0)::numeric AS gmv,
    COALESCE(SUM(o.commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM public.orders o
  JOIN public.shops s ON s.id = o.shop_id
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY o.shop_id, s.name
  ORDER BY gmv DESC
  LIMIT GREATEST(COALESCE(_limit, 10), 1);
END;
$function$;