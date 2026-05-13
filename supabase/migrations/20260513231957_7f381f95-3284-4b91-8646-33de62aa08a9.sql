
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS deposit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_percent integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS deposit_min_total numeric NOT NULL DEFAULT 0;

ALTER TABLE public.coffee_shops
  ADD CONSTRAINT coffee_shops_deposit_percent_chk
  CHECK (deposit_percent >= 0 AND deposit_percent <= 100);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS requires_deposit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_requires_deposit
  ON public.orders (shop_id, requires_deposit)
  WHERE requires_deposit = true;
