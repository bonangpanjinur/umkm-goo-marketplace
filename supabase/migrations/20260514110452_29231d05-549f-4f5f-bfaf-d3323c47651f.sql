
CREATE TABLE IF NOT EXISTS public.printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'thermal',
  connection_type text NOT NULL CHECK (connection_type IN ('bluetooth','usb','wifi','network')),
  address text,
  paper_size text NOT NULL DEFAULT '58',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_printers_outlet ON public.printers(outlet_id);
CREATE INDEX IF NOT EXISTS idx_printers_shop ON public.printers(shop_id);

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their printers"
  ON public.printers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = printers.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert their printers"
  ON public.printers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = printers.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owners can update their printers"
  ON public.printers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = printers.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owners can delete their printers"
  ON public.printers FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = printers.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER update_printers_updated_at
  BEFORE UPDATE ON public.printers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
