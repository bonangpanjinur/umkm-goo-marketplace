
-- 1. Seed plans (idempotent)
INSERT INTO public.plans (code, name, price_idr, duration_days, is_active, sort_order)
VALUES
  ('basic',    'Basic',    0,       3650, true, 1),
  ('pro',      'Pro',      99000,   30,   true, 2),
  ('business', 'Bisnis',   249000,  30,   true, 3)
ON CONFLICT (code) DO NOTHING;

-- 2. Seed features (idempotent)
INSERT INTO public.features (key, name, description, category, is_active, sort_order)
VALUES
  ('website_builder',    'Website Builder',    'Builder halaman drag-and-drop berbasis Puck', 'appearance', true, 10),
  ('custom_css',         'Custom CSS',         'Tambah CSS sendiri untuk kustomisasi tampilan toko', 'appearance', true, 20),
  ('storefront_builder', 'Storefront Builder', 'Susun section toko (banner, produk unggulan, dll)', 'appearance', true, 30),
  ('premium_themes',     'Tema Premium',       'Akses semua tema premium', 'appearance', true, 40),
  ('custom_domain',      'Custom Domain',      'Hubungkan domain sendiri ke toko', 'appearance', true, 50)
ON CONFLICT (key) DO NOTHING;

-- 3. Map plan -> features (idempotent)
-- Basic: storefront_builder only (free entry-level builder)
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, 'storefront_builder' FROM public.plans p WHERE p.code = 'basic'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Pro: storefront_builder + website_builder + custom_css + premium_themes
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p,
  unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes']) k
WHERE p.code = 'pro'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Business: semua fitur Pro + custom_domain
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p,
  unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes','custom_domain']) k
WHERE p.code = 'business'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- 4. Fix get_my_entitlements to actually read shops.plan and merge with plan_features
CREATE OR REPLACE FUNCTION public.get_my_entitlements() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

  SELECT id, theme_key, plan_started_at, plan_expires_at, COALESCE(plan, 'basic')
    INTO v_shop_id, v_theme_key, v_started, v_expires, v_plan_code
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;

  -- normalize legacy / null values
  IF v_plan_code IS NULL OR v_plan_code = '' OR v_plan_code = 'free' THEN
    v_plan_code := 'basic';
  END IF;

  -- enforce expiry: if plan expired, fall back to basic
  IF v_plan_code <> 'basic' AND v_expires IS NOT NULL AND v_expires < now() THEN
    v_plan_code := 'basic';
  END IF;

  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;

  -- themes
  SELECT jsonb_agg(jsonb_build_object(
    'key', t.key, 'name', t.name, 'description', t.description,
    'preview_image_url', t.preview_image_url,
    'allowed', true, 'reason', NULL,
    'component_id', t.component_id,
    'requires_min_months', 0
  ) ORDER BY t.sort_order)
  INTO v_themes FROM public.themes t WHERE t.is_active = true;

  -- features: every active feature, marked allowed if plan grants it
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
END $$;
