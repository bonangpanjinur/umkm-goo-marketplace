
CREATE TABLE IF NOT EXISTS public.flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  flash_price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,
  stock_limit INTEGER,
  stock_sold INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view flash sales"
  ON public.flash_sales FOR SELECT USING (true);

CREATE POLICY "Owners manage their flash sales (insert)"
  ON public.flash_sales FOR INSERT TO authenticated
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Owners manage their flash sales (update)"
  ON public.flash_sales FOR UPDATE TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Owners manage their flash sales (delete)"
  ON public.flash_sales FOR DELETE TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_flash_sales_shop ON public.flash_sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_flash_sales_window ON public.flash_sales(starts_at, ends_at);

CREATE TRIGGER update_flash_sales_updated_at
  BEFORE UPDATE ON public.flash_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.bulk_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER,
  price NUMERIC(10,2) NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view bulk pricing"
  ON public.bulk_pricing_rules FOR SELECT USING (true);

CREATE POLICY "Owners manage bulk pricing (insert)"
  ON public.bulk_pricing_rules FOR INSERT TO authenticated
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Owners manage bulk pricing (update)"
  ON public.bulk_pricing_rules FOR UPDATE TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Owners manage bulk pricing (delete)"
  ON public.bulk_pricing_rules FOR DELETE TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_menu ON public.bulk_pricing_rules(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_bulk_pricing_shop ON public.bulk_pricing_rules(shop_id);

CREATE TRIGGER update_bulk_pricing_rules_updated_at
  BEFORE UPDATE ON public.bulk_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
