-- 1) Add order_source enum-like text column to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source text;

-- Backfill existing rows
UPDATE public.orders
SET order_source = CASE
  WHEN marketplace_order IS TRUE THEN 'marketplace'
  WHEN channel = 'online' AND table_label IS NOT NULL THEN 'qr_table'
  WHEN channel = 'online' THEN 'website'
  ELSE 'pos'
END
WHERE order_source IS NULL;

-- Constrain to known values
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_source_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_source_check
  CHECK (order_source IS NULL OR order_source IN ('pos','qr_table','website','marketplace'));

CREATE INDEX IF NOT EXISTS idx_orders_order_source
  ON public.orders (shop_id, business_date, order_source);

-- 2) Backend lock: prevent table_label edits on QR table orders
CREATE OR REPLACE FUNCTION public.enforce_qr_table_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce on QR-table orders that remain QR-table.
  IF OLD.order_source = 'qr_table'
     AND NEW.order_source = 'qr_table'
     AND COALESCE(NEW.table_label, '') IS DISTINCT FROM COALESCE(OLD.table_label, '')
  THEN
    RAISE EXCEPTION
      'Meja terkunci untuk order QR. Batalkan QR (dengan alasan) terlebih dahulu.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_qr_table_lock ON public.orders;
CREATE TRIGGER trg_enforce_qr_table_lock
  BEFORE UPDATE OF table_label, order_source ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_qr_table_lock();

-- 3) Allow 'qr_unlock' as an audit log action
ALTER TABLE public.order_audit_log
  DROP CONSTRAINT IF EXISTS order_audit_log_action_check;
ALTER TABLE public.order_audit_log
  ADD CONSTRAINT order_audit_log_action_check
  CHECK (action = ANY (ARRAY['void','cancel','refund','reopen','edit','qr_unlock']));
