
-- Sprint 3: Realtime publish for orders, order_items, kds; low-stock trigger

-- Ensure full row data on changes for these tables (so UPDATE/DELETE payloads include all columns)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.owner_notifications REPLICA IDENTITY FULL;

-- Add to realtime publication (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Low-stock trigger: when ingredient current_stock drops to <= min_stock, insert a deduped owner_notification
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today text := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
BEGIN
  IF NEW.is_active = false THEN RETURN NEW; END IF;
  IF NEW.min_stock IS NULL OR NEW.min_stock <= 0 THEN RETURN NEW; END IF;
  IF NEW.current_stock <= NEW.min_stock
     AND (TG_OP = 'INSERT' OR OLD.current_stock > OLD.min_stock OR OLD.current_stock > NEW.current_stock) THEN
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (
      NEW.shop_id,
      'low_stock',
      'Stok bahan menipis',
      NEW.name || ' tinggal ' || NEW.current_stock || ' ' || NEW.unit || ' (min ' || NEW.min_stock || ')',
      '/app/inventory',
      'warning',
      'low_stock:' || NEW.id::text || ':' || v_today
    )
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.ingredients;
CREATE TRIGGER trg_notify_low_stock
AFTER INSERT OR UPDATE OF current_stock, min_stock ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();
