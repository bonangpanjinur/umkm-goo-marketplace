-- ============================================
-- G-3: UPSELLING ENGINE ("Sering Dibeli Bersama")
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_upsell_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL,
  product_id    uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  suggested_id  uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  score         numeric(10,2) NOT NULL DEFAULT 0,
  position      smallint NOT NULL DEFAULT 0,
  source        text NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
  is_pinned     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upsell_no_self CHECK (product_id <> suggested_id),
  UNIQUE (product_id, suggested_id)
);

CREATE INDEX IF NOT EXISTS idx_upsell_product ON public.product_upsell_suggestions(product_id, position);
CREATE INDEX IF NOT EXISTS idx_upsell_shop    ON public.product_upsell_suggestions(shop_id);
CREATE INDEX IF NOT EXISTS idx_upsell_source  ON public.product_upsell_suggestions(source);

DROP TRIGGER IF EXISTS trg_upsell_updated_at ON public.product_upsell_suggestions;
CREATE TRIGGER trg_upsell_updated_at
BEFORE UPDATE ON public.product_upsell_suggestions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.upsell_fill_shop_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    SELECT shop_id INTO NEW.shop_id FROM public.menu_items WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.upsell_fill_shop_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_upsell_fill_shop ON public.product_upsell_suggestions;
CREATE TRIGGER trg_upsell_fill_shop
BEFORE INSERT ON public.product_upsell_suggestions
FOR EACH ROW EXECUTE FUNCTION public.upsell_fill_shop_id();

ALTER TABLE public.product_upsell_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upsell_public_read" ON public.product_upsell_suggestions;
CREATE POLICY "upsell_public_read" ON public.product_upsell_suggestions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "upsell_owner_manage" ON public.product_upsell_suggestions;
CREATE POLICY "upsell_owner_manage" ON public.product_upsell_suggestions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = product_upsell_suggestions.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = product_upsell_suggestions.shop_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.compute_upsell_suggestions()
RETURNS TABLE(processed_products integer, inserted_pairs integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_processed int := 0;
  v_inserted  int := 0;
BEGIN
  DELETE FROM public.product_upsell_suggestions
   WHERE source = 'auto' AND is_pinned = false;

  WITH recent_items AS (
    SELECT DISTINCT oi.order_id, oi.menu_item_id
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
     WHERE oi.menu_item_id IS NOT NULL
       AND o.created_at >= now() - INTERVAL '90 days'
       AND COALESCE(o.status::text, '') NOT IN ('cancelled','refunded','draft','pending')
  ),
  pairs AS (
    SELECT a.menu_item_id AS product_id,
           b.menu_item_id AS suggested_id,
           COUNT(*)::numeric AS score
      FROM recent_items a
      JOIN recent_items b ON a.order_id = b.order_id AND a.menu_item_id <> b.menu_item_id
     GROUP BY a.menu_item_id, b.menu_item_id
    HAVING COUNT(*) >= 2
  ),
  ranked AS (
    SELECT p.*,
           m1.shop_id AS product_shop,
           m2.shop_id AS suggested_shop,
           ROW_NUMBER() OVER (PARTITION BY p.product_id ORDER BY p.score DESC) AS rn
      FROM pairs p
      JOIN public.menu_items m1 ON m1.id = p.product_id   AND m1.is_available = true
      JOIN public.menu_items m2 ON m2.id = p.suggested_id AND m2.is_available = true
  ),
  filtered AS (
    SELECT * FROM ranked WHERE rn <= 6 AND product_shop = suggested_shop
  ),
  ins AS (
    INSERT INTO public.product_upsell_suggestions
           (shop_id, product_id, suggested_id, score, position, source)
    SELECT product_shop, product_id, suggested_id, score, rn::smallint, 'auto'
      FROM filtered
    ON CONFLICT (product_id, suggested_id) DO UPDATE
      SET score = EXCLUDED.score, position = EXCLUDED.position, updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(DISTINCT product_id)::int, COUNT(*)::int FROM filtered
    INTO v_processed, v_inserted;

  RETURN QUERY SELECT v_processed, v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.compute_upsell_suggestions() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compute-upsell-weekly') THEN
    PERFORM cron.unschedule('compute-upsell-weekly');
  END IF;
  PERFORM cron.schedule(
    'compute-upsell-weekly',
    '0 3 * * 0',
    $cmd$ SELECT public.compute_upsell_suggestions(); $cmd$
  );
END $$;