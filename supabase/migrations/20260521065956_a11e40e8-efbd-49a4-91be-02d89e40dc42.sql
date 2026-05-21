
ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_required integer,
  ADD COLUMN IF NOT EXISTS reward_item_id uuid,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer integer,
  ADD COLUMN IF NOT EXISTS total_redemptions_limit integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.loyalty_rewards SET points_required = COALESCE(points_required, cost_points) WHERE points_required IS NULL;

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

-- Auto-fill kolom legacy ↔ baru via trigger
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
