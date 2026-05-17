-- F-17: Konsolidasi gating per kategori usaha
-- 1) Tambah flow_types ke business_categories
ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS flow_types text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.business_categories.flow_types IS
  'Tipe alur bisnis dari PRD §0.7: T1 (produk fisik), T2 (digital), T3 (booking sesi), T4 (rental), T5 (pre-order/custom). Satu kategori bisa punya lebih dari satu.';

COMMENT ON COLUMN public.business_categories.enabled_features IS
  'Daftar feature key kanonik yang aktif untuk kategori ini. Dipakai nav gating pos-app + storefront. Lihat src/lib/feature-keys.ts.';

-- 2) Trigger validasi nilai flow_types (T1..T5 saja)
CREATE OR REPLACE FUNCTION public.validate_business_category_flow_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF NEW.flow_types IS NULL THEN
    NEW.flow_types := '{}'::text[];
  END IF;
  FOREACH v IN ARRAY NEW.flow_types LOOP
    IF v NOT IN ('T1','T2','T3','T4','T5') THEN
      RAISE EXCEPTION 'Invalid flow_type "%": must be one of T1,T2,T3,T4,T5', v;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_business_category_flow_types ON public.business_categories;
CREATE TRIGGER trg_validate_business_category_flow_types
  BEFORE INSERT OR UPDATE ON public.business_categories
  FOR EACH ROW EXECUTE FUNCTION public.validate_business_category_flow_types();

-- 3) Override per-shop opsional (owner enable/disable fitur di luar default kategori)
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS feature_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.shops.feature_overrides IS
  'Override fitur per-shop. Bentuk: {"enable":["X","Y"],"disable":["Z"]}. Digabung dengan business_categories.enabled_features di v_shop_capabilities.';

-- 4) VIEW v_shop_capabilities: gabungan kategori + override per shop
CREATE OR REPLACE VIEW public.v_shop_capabilities AS
SELECT
  s.id                              AS shop_id,
  s.business_category_id,
  s.business_subtype,
  bc.slug                           AS category_slug,
  bc.name                           AS category_name,
  COALESCE(bc.flow_types, '{}')     AS flow_types,
  bc.booking_type,
  bc.booking_config,
  -- enabled_features efektif = (kategori ∪ enable) \ disable
  (
    SELECT COALESCE(array_agg(DISTINCT f ORDER BY f), '{}')
    FROM (
      SELECT unnest(COALESCE(bc.enabled_features, '{}')) AS f
      UNION
      SELECT jsonb_array_elements_text(COALESCE(s.feature_overrides->'enable', '[]'::jsonb))
    ) u
    WHERE f NOT IN (
      SELECT jsonb_array_elements_text(COALESCE(s.feature_overrides->'disable', '[]'::jsonb))
    )
  ) AS enabled_features
FROM public.shops s
LEFT JOIN public.business_categories bc ON bc.id = s.business_category_id;

COMMENT ON VIEW public.v_shop_capabilities IS
  'Single source of truth untuk gating fitur per shop. Gabung business_categories.enabled_features + shops.feature_overrides. Dibaca oleh hook useShopCapabilities.';

GRANT SELECT ON public.v_shop_capabilities TO anon, authenticated;