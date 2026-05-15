CREATE TABLE public.page_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  page_type text NOT NULL CHECK (page_type IN ('home','menu_detail','cart','checkout','custom')),
  slug text,
  title text NOT NULL DEFAULT 'Halaman',
  puck_data jsonb NOT NULL DEFAULT '{"content":[],"root":{"props":{}}}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX page_layouts_shop_page_slug_uniq
  ON public.page_layouts (shop_id, page_type, COALESCE(slug, ''));
CREATE INDEX page_layouts_shop_idx ON public.page_layouts(shop_id);
CREATE INDEX page_layouts_published_idx ON public.page_layouts(shop_id, page_type) WHERE is_published = true;

ALTER TABLE public.page_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_layouts_public_read"
  ON public.page_layouts FOR SELECT
  USING (is_published = true);

CREATE POLICY "page_layouts_owner_all"
  ON public.page_layouts FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = page_layouts.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = page_layouts.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER update_page_layouts_updated_at
  BEFORE UPDATE ON public.page_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.features (key, name, description, category, sort_order)
VALUES ('website_builder', 'Website Builder Drag-and-Drop', 'Bangun tampilan storefront sendiri dengan editor drag-and-drop', 'storefront', 100)
ON CONFLICT (key) DO NOTHING;