-- =========================================================
-- GUARD MIGRATION: Loyalty & Referral (idempotent, schema-aware)
-- =========================================================

-- 1) BASE TABLES -------------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cost_points integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr owner" ON public.loyalty_rewards;
CREATE POLICY "lr owner" ON public.loyalty_rewards
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lr public read" ON public.loyalty_rewards;
CREATE POLICY "lr public read" ON public.loyalty_rewards FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid,
  reward_id uuid,
  points_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Build owner policy dinamis (kompatibel dengan user_id atau customer_user_id)
DO $$
DECLARE
  uid_col text;
BEGIN
  SELECT column_name INTO uid_col
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='loyalty_redemptions'
    AND column_name IN ('user_id','customer_user_id')
  ORDER BY CASE column_name WHEN 'user_id' THEN 1 ELSE 2 END
  LIMIT 1;

  EXECUTE 'DROP POLICY IF EXISTS "lred owner" ON public.loyalty_redemptions';
  IF uid_col IS NOT NULL THEN
    EXECUTE format($f$
      CREATE POLICY "lred owner" ON public.loyalty_redemptions
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR %I = auth.uid())
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR %I = auth.uid())
    $f$, uid_col, uid_col);
  ELSE
    EXECUTE $f$
      CREATE POLICY "lred owner" ON public.loyalty_redemptions
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
    $f$;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp owner" ON public.referral_programs;
CREATE POLICY "rp owner" ON public.referral_programs
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rp public read" ON public.referral_programs;
CREATE POLICY "rp public read" ON public.referral_programs FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  referrer_user_id uuid,
  referee_user_id uuid,
  code text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ref owner" ON public.referrals;
CREATE POLICY "ref owner" ON public.referrals
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR referrer_user_id = auth.uid() OR referee_user_id = auth.uid())
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR referrer_user_id = auth.uid() OR referee_user_id = auth.uid());

-- 2) ENHANCED COLUMNS --------------------------------------

ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_required integer,
  ADD COLUMN IF NOT EXISTS reward_item_id uuid,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer integer,
  ADD COLUMN IF NOT EXISTS total_redemptions_limit integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.loyalty_rewards SET points_required = COALESCE(points_required, cost_points) WHERE points_required IS NULL;

-- FK reward_id pada loyalty_redemptions (jika belum ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='loyalty_redemptions'
      AND constraint_type='FOREIGN KEY' AND constraint_name='loyalty_redemptions_reward_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.loyalty_redemptions
        ADD CONSTRAINT loyalty_redemptions_reward_id_fkey
        FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.loyalty_redemptions
  ADD COLUMN IF NOT EXISTS points_redeemed integer,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
UPDATE public.loyalty_redemptions SET points_redeemed = COALESCE(points_redeemed, points_used) WHERE points_redeemed IS NULL;

ALTER TABLE public.referral_programs
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS referrer_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_value_for_bonus numeric,
  ADD COLUMN IF NOT EXISTS max_referrals_per_user integer;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.referral_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
UPDATE public.referrals SET referral_code = COALESCE(referral_code, code) WHERE referral_code IS NULL;

-- 3) ANALYTICS TABLE ---------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date date NOT NULL,
  new_members integer NOT NULL DEFAULT 0,
  points_issued integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  rewards_claimed integer NOT NULL DEFAULT 0,
  referral_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, date)
);
ALTER TABLE public.loyalty_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la owner" ON public.loyalty_analytics;
CREATE POLICY "la owner" ON public.loyalty_analytics
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- 4) SYNC TRIGGERS (legacy ↔ baru) -------------------------

CREATE OR REPLACE FUNCTION public.sync_loyalty_reward_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_required IS NULL AND NEW.cost_points IS NOT NULL THEN NEW.points_required := NEW.cost_points; END IF;
  IF NEW.cost_points IS NULL AND NEW.points_required IS NOT NULL THEN NEW.cost_points := NEW.points_required; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lr_sync ON public.loyalty_rewards;
CREATE TRIGGER trg_lr_sync BEFORE INSERT OR UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_reward_cols();

CREATE OR REPLACE FUNCTION public.sync_loyalty_redemption_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_redeemed IS NULL AND NEW.points_used IS NOT NULL THEN NEW.points_redeemed := NEW.points_used; END IF;
  IF NEW.points_used IS NULL AND NEW.points_redeemed IS NOT NULL THEN NEW.points_used := NEW.points_redeemed; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lred_sync ON public.loyalty_redemptions;
CREATE TRIGGER trg_lred_sync BEFORE INSERT OR UPDATE ON public.loyalty_redemptions FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_redemption_cols();