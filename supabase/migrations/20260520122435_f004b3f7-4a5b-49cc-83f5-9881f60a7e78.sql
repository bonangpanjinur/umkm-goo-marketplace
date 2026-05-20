CREATE OR REPLACE FUNCTION public.get_my_entitlements()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_theme_key text;
  v_plan_code text := 'basic';
  v_started timestamptz;
  v_expires timestamptz;
  v_months numeric := 0;
  v_themes jsonb;
  v_features jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT id, COALESCE(active_theme_key, theme_key), plan_started_at, plan_expires_at, COALESCE(plan, 'basic')
    INTO v_shop_id, v_theme_key, v_started, v_expires, v_plan_code
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;

  IF v_plan_code IS NULL OR v_plan_code = '' OR v_plan_code = 'free' THEN
    v_plan_code := 'basic';
  END IF;

  IF v_plan_code <> 'basic' AND v_expires IS NOT NULL AND v_expires < now() THEN
    v_plan_code := 'basic';
  END IF;

  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'key', t.key, 'name', t.name, 'description', t.description,
    'preview_image_url', t.preview_image_url,
    'allowed', true, 'reason', NULL,
    'component_id', t.component_id,
    'requires_min_months', 0
  ) ORDER BY t.sort_order)
  INTO v_themes FROM public.themes t WHERE t.is_active = true;

  SELECT jsonb_agg(jsonb_build_object(
    'key', f.key,
    'name', f.name,
    'description', f.description,
    'category', f.category,
    'requires_min_months', COALESCE(pf.requires_min_months, 0),
    'limit_value', pf.limit_value,
    'allowed', (pf.feature_key IS NOT NULL) AND (COALESCE(pf.requires_min_months, 0) <= v_months),
    'reason', CASE
                WHEN pf.feature_key IS NULL THEN 'plan_not_eligible'
                WHEN COALESCE(pf.requires_min_months, 0) > v_months THEN 'requires_min_months'
                ELSE NULL
              END
  ) ORDER BY f.sort_order)
  INTO v_features
  FROM public.features f
  LEFT JOIN public.plan_features pf
    ON pf.feature_key = f.key
   AND pf.plan_id = (SELECT id FROM public.plans WHERE code = v_plan_code LIMIT 1)
  WHERE f.is_active = true;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'plan_started_at', v_started,
    'plan_expires_at', v_expires,
    'months_active', v_months,
    'active_theme_key', COALESCE(v_theme_key, 'classic'),
    'features', COALESCE(v_features, '[]'::jsonb),
    'themes', COALESCE(v_themes, '[]'::jsonb)
  );
END $function$;