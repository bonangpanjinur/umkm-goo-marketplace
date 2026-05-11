-- ============================================================
-- PHASE 1 — MARKETPLACE FOUNDATION (Session 1: DB Schema)
-- Multi-shop cart, reviews, escrow, wallets, payouts, commissions
-- ============================================================

-- ============================================================
-- 1. SHOP WALLETS — saldo per toko
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_wallets (
  shop_id UUID PRIMARY KEY REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  available_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  pending_balance NUMERIC(14,2) NOT NULL DEFAULT 0,    -- escrow / belum release
  total_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_commission_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_wallet" ON public.shop_wallets FOR SELECT
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_shop_wallets_updated BEFORE UPDATE ON public.shop_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. WALLET TRANSACTIONS — ledger
-- ============================================================
CREATE TYPE public.wallet_txn_type AS ENUM (
  'sale_pending',     -- order paid, masuk escrow (pending)
  'sale_release',     -- escrow released ke available
  'commission',       -- platform commission deduction
  'withdrawal_hold',  -- request withdrawal, tahan dari available
  'withdrawal_paid',  -- withdrawal disetujui & dibayar
  'withdrawal_refund',-- withdrawal ditolak, kembalikan ke available
  'refund',           -- order refund ke pembeli
  'adjustment'        -- manual adjustment by super admin
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  type wallet_txn_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,             -- positive=credit, negative=debit
  balance_after NUMERIC(14,2),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  withdrawal_id UUID,
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_txn_shop_created ON public.wallet_transactions (shop_id, created_at DESC);
CREATE INDEX idx_wallet_txn_order ON public.wallet_transactions (order_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_wallet_txn" ON public.wallet_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- 3. WITHDRAWAL REQUESTS
-- ============================================================
CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','paid','cancelled');

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  admin_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  bank_name TEXT NOT NULL,
  bank_account_no TEXT NOT NULL,
  bank_account_name TEXT NOT NULL,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  reject_reason TEXT,
  proof_url TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawals_shop_status ON public.withdrawal_requests (shop_id, status, created_at DESC);
CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests (status, created_at DESC);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_view_withdrawals" ON public.withdrawal_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "owner_create_withdrawal" ON public.withdrawal_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "admin_update_withdrawal" ON public.withdrawal_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 4. ORDER ESCROW & COMMISSIONS — per order
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_to_shop NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'none',  -- none|holding|released|refunded
  ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketplace_order BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders (escrow_status) WHERE escrow_status IN ('holding','released');

-- ============================================================
-- 5. PRODUCT REVIEWS — generalized marketplace reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  shop_reply TEXT,
  shop_replied_at TIMESTAMPTZ,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id, order_id)
);

CREATE INDEX idx_product_reviews_product ON public.product_reviews (product_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX idx_product_reviews_shop ON public.product_reviews (shop_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX idx_product_reviews_user ON public.product_reviews (user_id, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_reviews" ON public.product_reviews FOR SELECT
  USING (NOT is_hidden);

CREATE POLICY "user_create_review" ON public.product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_update_own_review" ON public.product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_delete_own_review" ON public.product_reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "owner_reply_review" ON public.product_reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "admin_manage_review" ON public.product_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_product_reviews_updated BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Aggregate rating cache on menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_product UUID := COALESCE(NEW.product_id, OLD.product_id);
  v_shop UUID := COALESCE(NEW.shop_id, OLD.shop_id);
BEGIN
  UPDATE public.menu_items SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM product_reviews WHERE product_id = v_product AND NOT is_hidden), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE product_id = v_product AND NOT is_hidden), 0)
  WHERE id = v_product;

  UPDATE public.coffee_shops SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM product_reviews WHERE shop_id = v_shop AND NOT is_hidden), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE shop_id = v_shop AND NOT is_hidden), 0)
  WHERE id = v_shop;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_refresh_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();

-- ============================================================
-- 6. MARKETPLACE CARTS — multi-shop persistent cart
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.marketplace_carts(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  variant_id UUID,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL,
  notes TEXT,
  options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart ON public.marketplace_cart_items (cart_id);
CREATE INDEX idx_cart_items_shop ON public.marketplace_cart_items (cart_id, shop_id);

ALTER TABLE public.marketplace_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_cart" ON public.marketplace_carts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_cart_items" ON public.marketplace_cart_items FOR ALL
  USING (EXISTS (SELECT 1 FROM marketplace_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM marketplace_carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.marketplace_carts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cart_items_updated BEFORE UPDATE ON public.marketplace_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 7. WALLET HELPER FUNCTIONS (escrow flow)
-- ============================================================

-- Ensure wallet exists for a shop
CREATE OR REPLACE FUNCTION public.ensure_shop_wallet(_shop_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  INSERT INTO public.shop_wallets (shop_id) VALUES (_shop_id)
  ON CONFLICT (shop_id) DO NOTHING;
$$;

-- Hold escrow when order is paid (called by app or webhook)
CREATE OR REPLACE FUNCTION public.escrow_hold_order(_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_rate NUMERIC(5,2);
  v_commission NUMERIC(14,2);
  v_net NUMERIC(14,2);
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status <> 'none' THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_order.escrow_status);
  END IF;

  -- Resolve commission rate: shop override > category > global default 5%
  SELECT COALESCE(
    (SELECT (value->>'rate')::numeric FROM platform_settings WHERE key = 'commission_shop_'||v_order.shop_id::text),
    (SELECT (value->>'rate')::numeric FROM platform_settings WHERE key = 'commission_default'),
    5
  ) INTO v_rate;

  v_commission := ROUND(v_order.total * v_rate / 100, 2);
  v_net := v_order.total - v_commission;

  PERFORM public.ensure_shop_wallet(v_order.shop_id);

  UPDATE orders SET
    commission_rate = v_rate,
    commission_amount = v_commission,
    net_to_shop = v_net,
    escrow_status = 'holding',
    updated_at = now()
  WHERE id = _order_id;

  UPDATE shop_wallets SET
    pending_balance = pending_balance + v_net,
    updated_at = now()
  WHERE shop_id = v_order.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'sale_pending', v_net, _order_id, v_order.order_no,
          'Escrow hold: total '||v_order.total||' - komisi '||v_commission);

  RETURN jsonb_build_object('order_id', _order_id, 'commission', v_commission, 'net', v_net);
END; $$;

-- Release escrow when order is completed/delivered
CREATE OR REPLACE FUNCTION public.escrow_release_order(_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller UUID := auth.uid();
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status <> 'holding' THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_order.escrow_status);
  END IF;

  IF NOT public.has_role(v_caller, 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = v_order.shop_id AND s.owner_id = v_caller) THEN
    -- allow trigger / system call (no auth.uid())
    IF v_caller IS NOT NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  END IF;

  UPDATE shop_wallets SET
    pending_balance = pending_balance - v_order.net_to_shop,
    available_balance = available_balance + v_order.net_to_shop,
    total_earned = total_earned + v_order.net_to_shop,
    total_commission_paid = total_commission_paid + v_order.commission_amount,
    updated_at = now()
  WHERE shop_id = v_order.shop_id;

  UPDATE orders SET
    escrow_status = 'released',
    escrow_released_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'sale_release', v_order.net_to_shop, _order_id, v_order.order_no, 'Dana cair ke saldo');

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'commission', -v_order.commission_amount, _order_id, v_order.order_no,
          'Komisi platform '||v_order.commission_rate||'%');

  RETURN jsonb_build_object('order_id', _order_id, 'released', v_order.net_to_shop);
END; $$;

-- Refund escrow (order cancelled/refunded)
CREATE OR REPLACE FUNCTION public.escrow_refund_order(_order_id UUID, _reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status NOT IN ('holding','released') THEN
    RETURN jsonb_build_object('skipped', true);
  END IF;

  IF v_order.escrow_status = 'holding' THEN
    UPDATE shop_wallets SET pending_balance = pending_balance - v_order.net_to_shop, updated_at=now()
      WHERE shop_id = v_order.shop_id;
  ELSE
    UPDATE shop_wallets SET available_balance = available_balance - v_order.net_to_shop,
      total_earned = GREATEST(total_earned - v_order.net_to_shop, 0), updated_at=now()
      WHERE shop_id = v_order.shop_id;
  END IF;

  UPDATE orders SET escrow_status='refunded', updated_at=now() WHERE id=_order_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'refund', -v_order.net_to_shop, _order_id, v_order.order_no, COALESCE(_reason,'Refund'));

  RETURN jsonb_build_object('order_id', _order_id, 'refunded', v_order.net_to_shop);
END; $$;

-- Auto release escrow when order status moves to delivered/completed
CREATE OR REPLACE FUNCTION public.auto_release_escrow_on_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.escrow_status = 'holding'
     AND NEW.status IN ('completed','delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_release_order(NEW.id);
  ELSIF NEW.escrow_status IN ('holding','released')
        AND NEW.status IN ('voided','cancelled')
        AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_refund_order(NEW.id, 'Order '||NEW.status::text);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auto_release_escrow
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_release_escrow_on_complete();

-- ============================================================
-- 8. WITHDRAWAL FLOW FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _shop_id UUID, _amount NUMERIC, _bank_name TEXT, _bank_account_no TEXT, _bank_account_name TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_wallet shop_wallets%ROWTYPE;
  v_min NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_id UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT COALESCE((value->>'amount')::numeric, 50000) INTO v_min FROM platform_settings WHERE key='withdrawal_min';
  SELECT COALESCE((value->>'amount')::numeric, 5000) INTO v_fee FROM platform_settings WHERE key='withdrawal_fee';

  IF _amount < v_min THEN RAISE EXCEPTION 'below_minimum: %', v_min; END IF;

  PERFORM public.ensure_shop_wallet(_shop_id);
  SELECT * INTO v_wallet FROM shop_wallets WHERE shop_id = _shop_id FOR UPDATE;
  IF v_wallet.available_balance < _amount THEN
    RAISE EXCEPTION 'insufficient_balance: available %', v_wallet.available_balance;
  END IF;

  v_net := _amount - v_fee;

  INSERT INTO withdrawal_requests (shop_id, amount, admin_fee, net_amount, bank_name, bank_account_no, bank_account_name, requested_by)
  VALUES (_shop_id, _amount, v_fee, v_net, _bank_name, _bank_account_no, _bank_account_name, v_caller)
  RETURNING id INTO v_id;

  UPDATE shop_wallets SET
    available_balance = available_balance - _amount,
    pending_balance = pending_balance + _amount,
    updated_at = now()
  WHERE shop_id = _shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (_shop_id, 'withdrawal_hold', -_amount, v_id, 'WD-'||substring(v_id::text,1,8), 'Tahan untuk request penarikan', v_caller);

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(_id UUID, _proof_url TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE withdrawal_requests SET status='paid', proof_url=COALESCE(_proof_url,proof_url),
    reviewed_by=auth.uid(), reviewed_at=now(), paid_at=now(), updated_at=now()
    WHERE id=_id;

  UPDATE shop_wallets SET
    pending_balance = pending_balance - w.amount,
    total_withdrawn = total_withdrawn + w.amount,
    updated_at = now()
  WHERE shop_id = w.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (w.shop_id, 'withdrawal_paid', 0, _id, 'WD-'||substring(_id::text,1,8), 'Penarikan disetujui & dibayar', auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id UUID, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE withdrawal_requests SET status='rejected', reject_reason=_reason,
    reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
    WHERE id=_id;

  -- Return funds: pending → available
  UPDATE shop_wallets SET
    pending_balance = pending_balance - w.amount,
    available_balance = available_balance + w.amount,
    updated_at = now()
  WHERE shop_id = w.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (w.shop_id, 'withdrawal_refund', w.amount, _id, 'WD-'||substring(_id::text,1,8),
          'Penarikan ditolak: '||_reason, auth.uid());
END; $$;

-- ============================================================
-- 9. SEED platform commission/withdrawal defaults if missing
-- ============================================================
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('commission_default', '{"rate": 5}'::jsonb, 'Komisi default platform per transaksi marketplace (%)'),
  ('withdrawal_min', '{"amount": 50000}'::jsonb, 'Minimum penarikan dana (IDR)'),
  ('withdrawal_fee', '{"amount": 5000}'::jsonb, 'Biaya admin per penarikan (IDR)'),
  ('marketplace_active', '{"enabled": true}'::jsonb, 'Marketplace publik aktif')
ON CONFLICT (key) DO NOTHING;