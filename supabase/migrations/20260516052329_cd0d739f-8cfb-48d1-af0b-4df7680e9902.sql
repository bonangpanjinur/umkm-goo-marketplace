ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idem_shop
  ON public.orders (shop_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;