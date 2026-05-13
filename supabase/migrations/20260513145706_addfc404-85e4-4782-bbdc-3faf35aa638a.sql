-- Membership tiers
CREATE TABLE public.shop_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_membership_tiers_shop ON public.shop_membership_tiers(shop_id) WHERE is_active = true;

-- Customer memberships
CREATE TABLE public.customer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.shop_membership_tiers(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cust_memberships_user ON public.customer_memberships(customer_user_id);
CREATE INDEX idx_cust_memberships_shop ON public.customer_memberships(shop_id);
CREATE INDEX idx_cust_memberships_active ON public.customer_memberships(customer_user_id, shop_id) WHERE status = 'active';

-- Topup presets
CREATE TABLE public.wallet_topup_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_topup_presets_shop ON public.wallet_topup_presets(shop_id) WHERE is_active = true;

-- Customer wallets (per shop)
CREATE TABLE public.customer_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_topped_up NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_user_id, shop_id)
);

-- Wallet transactions
CREATE TABLE public.customer_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.customer_wallets(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup','bonus','spend','refund','adjustment')),
  amount NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  ref_order_id UUID,
  ref_topup_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_wallet ON public.customer_wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_user ON public.customer_wallet_transactions(customer_user_id, created_at DESC);

-- Wallet topups (purchase orders for adding balance)
CREATE TABLE public.wallet_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES public.wallet_topup_presets(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  bonus_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(14,2) NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','cancelled')),
  paid_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_topups_user ON public.wallet_topups(customer_user_id, created_at DESC);
CREATE INDEX idx_topups_shop ON public.wallet_topups(shop_id, created_at DESC);
CREATE INDEX idx_topups_status ON public.wallet_topups(status) WHERE status = 'pending';

-- Triggers for updated_at
CREATE TRIGGER trg_membership_tiers_updated BEFORE UPDATE ON public.shop_membership_tiers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cust_memberships_updated BEFORE UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_topup_presets_updated BEFORE UPDATE ON public.wallet_topup_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cust_wallets_updated BEFORE UPDATE ON public.customer_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_wallet_topups_updated BEFORE UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS
ALTER TABLE public.shop_membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topup_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

-- Helper: is shop owner
-- Reuse pattern: EXISTS coffee_shops with owner_id = auth.uid()

-- Membership tiers policies
CREATE POLICY "anyone_view_active_tiers" ON public.shop_membership_tiers FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "owner_manage_tiers" ON public.shop_membership_tiers FOR ALL
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- Customer memberships policies
CREATE POLICY "customer_view_own_memberships" ON public.customer_memberships FOR SELECT
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "customer_create_membership" ON public.customer_memberships FOR INSERT
  WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "customer_update_own_membership" ON public.customer_memberships FOR UPDATE
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- Topup presets policies
CREATE POLICY "anyone_view_active_presets" ON public.wallet_topup_presets FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "owner_manage_presets" ON public.wallet_topup_presets FOR ALL
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- Customer wallets policies
CREATE POLICY "customer_view_own_wallet" ON public.customer_wallets FOR SELECT
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "customer_insert_own_wallet" ON public.customer_wallets FOR INSERT
  WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "customer_or_owner_update_wallet" ON public.customer_wallets FOR UPDATE
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- Wallet transactions policies
CREATE POLICY "view_own_wallet_tx" ON public.customer_wallet_transactions FOR SELECT
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "insert_own_wallet_tx" ON public.customer_wallet_transactions FOR INSERT
  WITH CHECK (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- Wallet topups policies
CREATE POLICY "view_own_topups" ON public.wallet_topups FOR SELECT
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()) OR has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "customer_create_topup" ON public.wallet_topups FOR INSERT
  WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "customer_or_owner_update_topup" ON public.wallet_topups FOR UPDATE
  USING (customer_user_id = auth.uid() OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));