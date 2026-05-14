CREATE TABLE IF NOT EXISTS public.product_attribute_defs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  placeholder text,
  unit text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, category_id, key)
);

CREATE INDEX IF NOT EXISTS idx_product_attribute_defs_shop ON public.product_attribute_defs(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_defs_cat ON public.product_attribute_defs(category_id);

ALTER TABLE public.product_attribute_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owner can view attribute defs"
  ON public.product_attribute_defs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = product_attribute_defs.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owner can insert attribute defs"
  ON public.product_attribute_defs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = product_attribute_defs.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owner can update attribute defs"
  ON public.product_attribute_defs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = product_attribute_defs.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owner can delete attribute defs"
  ON public.product_attribute_defs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = product_attribute_defs.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER update_product_attribute_defs_updated_at
  BEFORE UPDATE ON public.product_attribute_defs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';