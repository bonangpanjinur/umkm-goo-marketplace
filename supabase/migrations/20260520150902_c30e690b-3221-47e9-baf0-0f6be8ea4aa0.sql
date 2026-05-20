
CREATE TABLE IF NOT EXISTS public.shop_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_bank_accounts_shop ON public.shop_bank_accounts(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shop_bank_primary
  ON public.shop_bank_accounts(shop_id) WHERE is_primary = true;

ALTER TABLE public.shop_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their bank accounts"
  ON public.shop_bank_accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Shop owners can insert their bank accounts"
  ON public.shop_bank_accounts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Shop owners can update their bank accounts"
  ON public.shop_bank_accounts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Shop owners can delete their bank accounts"
  ON public.shop_bank_accounts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_shop_bank_accounts_updated_at
  BEFORE UPDATE ON public.shop_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
