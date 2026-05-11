
-- 1. Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  shop_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications (recipient_user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Helper function (SECURITY DEFINER) — internal use by triggers/admin
CREATE OR REPLACE FUNCTION public.create_notification(
  _recipient UUID,
  _type TEXT,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _severity TEXT DEFAULT 'info',
  _shop_id UUID DEFAULT NULL,
  _dedupe_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF _recipient IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications
    (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
  VALUES (_recipient, _shop_id, _type, _title, _body, _link, _severity, _dedupe_key)
  ON CONFLICT (recipient_user_id, dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- 3. Mark read RPCs
CREATE OR REPLACE FUNCTION public.mark_notification_read(_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = _id AND recipient_user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  WITH upd AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE recipient_user_id = auth.uid() AND read_at IS NULL
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- 4. Trigger: new marketplace order → notify shop owner
CREATE OR REPLACE FUNCTION public.notify_new_marketplace_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner UUID;
BEGIN
  IF NEW.marketplace_order = true THEN
    SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = NEW.shop_id;
    PERFORM public.create_notification(
      v_owner,
      'order_new',
      'Pesanan baru: ' || NEW.order_no,
      'Total Rp ' || to_char(NEW.total, 'FM999G999G999'),
      '/pos-app/marketplace-orders',
      'info',
      NEW.shop_id,
      'order_new:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_marketplace_order ON public.orders;
CREATE TRIGGER trg_notify_new_marketplace_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_new_marketplace_order();

-- 5. Trigger: order status change → notify customer
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label TEXT;
  v_sev TEXT := 'info';
BEGIN
  IF NEW.customer_user_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  v_label := CASE NEW.status::text
    WHEN 'preparing' THEN 'Pesanan sedang disiapkan'
    WHEN 'ready' THEN 'Pesanan siap'
    WHEN 'delivered' THEN 'Pesanan dikirim'
    WHEN 'completed' THEN 'Pesanan selesai'
    WHEN 'cancelled' THEN 'Pesanan dibatalkan'
    WHEN 'voided' THEN 'Pesanan dibatalkan'
    ELSE 'Status pesanan diperbarui'
  END;

  IF NEW.status::text IN ('cancelled','voided') THEN v_sev := 'warning'; END IF;

  PERFORM public.create_notification(
    NEW.customer_user_id,
    'order_status',
    v_label,
    'Pesanan ' || NEW.order_no,
    '/akun/pesanan/' || NEW.id::text,
    v_sev,
    NEW.shop_id,
    'order_status:' || NEW.id::text || ':' || NEW.status::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- 6. Dispute notifications (only if order_disputes table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_disputes') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.notify_dispute_event()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $body$
      DECLARE
        v_order orders%ROWTYPE;
        v_owner UUID;
      BEGIN
        SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
        IF NOT FOUND THEN RETURN NEW; END IF;
        SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = v_order.shop_id;

        IF TG_OP = 'INSERT' THEN
          PERFORM public.create_notification(
            v_owner, 'dispute_opened', 'Sengketa baru pada ' || v_order.order_no,
            'Customer melaporkan masalah, silakan tinjau.',
            '/pos-app/marketplace-orders', 'warning', v_order.shop_id,
            'dispute_open:' || NEW.id::text
          );
        ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
          IF NEW.status IN ('resolved','rejected') THEN
            PERFORM public.create_notification(
              v_order.customer_user_id, 'dispute_resolved',
              'Sengketa pesanan ' || v_order.order_no || ' diperbarui',
              'Status sengketa: ' || NEW.status,
              '/akun/pesanan/' || v_order.id::text,
              CASE WHEN NEW.status='resolved' THEN 'success' ELSE 'warning' END,
              v_order.shop_id,
              'dispute_resolved:' || NEW.id::text || ':' || NEW.status
            );
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $f$;

    EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_dispute_event ON public.order_disputes';
    EXECUTE 'CREATE TRIGGER trg_notify_dispute_event AFTER INSERT OR UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_event()';
  END IF;
END $$;

-- 7. Withdrawal notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='withdrawal_requests') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.notify_withdrawal_status()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $body$
      DECLARE v_owner UUID;
      BEGIN
        IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
        SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = NEW.shop_id;
        IF NEW.status IN ('approved','paid') THEN
          PERFORM public.create_notification(
            v_owner, 'withdrawal_'||NEW.status,
            CASE NEW.status WHEN 'approved' THEN 'Penarikan dana disetujui' ELSE 'Penarikan dana sudah dibayar' END,
            'Jumlah Rp '||to_char(NEW.amount,'FM999G999G999'),
            '/pos-app/wallet','success',NEW.shop_id,
            'withdrawal_'||NEW.status||':'||NEW.id::text
          );
        ELSIF NEW.status = 'rejected' THEN
          PERFORM public.create_notification(
            v_owner,'withdrawal_rejected','Penarikan dana ditolak',
            COALESCE(NEW.reject_reason,'Hubungi admin untuk detail.'),
            '/pos-app/wallet','warning',NEW.shop_id,
            'withdrawal_rejected:'||NEW.id::text
          );
        END IF;
        RETURN NEW;
      END;
      $body$;
    $f$;
    EXECUTE 'DROP TRIGGER IF EXISTS trg_notify_withdrawal_status ON public.withdrawal_requests';
    EXECUTE 'CREATE TRIGGER trg_notify_withdrawal_status AFTER UPDATE OF status ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status()';
  END IF;
END $$;
