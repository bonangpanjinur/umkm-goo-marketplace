-- ============ Order Disputes ============
CREATE TABLE public.order_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  reason text NOT NULL,
  description text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  refund_amount numeric,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_disputes_order ON public.order_disputes(order_id);
CREATE INDEX idx_disputes_shop_status ON public.order_disputes(shop_id, status);

ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_customer_read"
ON public.order_disputes FOR SELECT TO authenticated
USING (opened_by = auth.uid());

CREATE POLICY "disputes_owner_read"
ON public.order_disputes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = order_disputes.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "disputes_super_admin_read"
ON public.order_disputes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "disputes_owner_update"
ON public.order_disputes FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = order_disputes.shop_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = order_disputes.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "disputes_admin_update"
ON public.order_disputes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============ Order Messages (chat) ============
CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,
  body text NOT NULL,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_messages_order_created ON public.order_messages(order_id, created_at);

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_messages_participants_read"
ON public.order_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_messages.order_id
      AND (o.customer_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = o.shop_id AND s.owner_id = auth.uid()))
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "order_messages_participants_insert"
ON public.order_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_messages.order_id
      AND o.shop_id = order_messages.shop_id
      AND (o.customer_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = o.shop_id AND s.owner_id = auth.uid()))
  )
);

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_disputes;

-- ============ Functions ============

-- Open dispute (customer)
CREATE OR REPLACE FUNCTION public.open_dispute(
  _order_id uuid,
  _reason text,
  _description text DEFAULT NULL,
  _photos jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order tidak ditemukan';
  END IF;
  IF v_order.customer_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bukan pesanan Anda';
  END IF;
  IF v_order.status NOT IN ('completed','delivering','ready') THEN
    RAISE EXCEPTION 'Sengketa hanya dapat dibuka untuk pesanan yang sudah dikirim/selesai';
  END IF;
  IF EXISTS (SELECT 1 FROM order_disputes WHERE order_id = _order_id AND status IN ('open','under_review')) THEN
    RAISE EXCEPTION 'Sengketa untuk pesanan ini sudah ada';
  END IF;
  INSERT INTO order_disputes(order_id, shop_id, opened_by, reason, description, photos)
  VALUES (_order_id, v_order.shop_id, auth.uid(), _reason, _description, COALESCE(_photos, '[]'::jsonb))
  RETURNING id INTO v_id;
  -- Hold escrow if currently released? Mark escrow as held.
  UPDATE orders SET escrow_status = 'disputed', updated_at = now()
  WHERE id = _order_id AND escrow_status IN ('held','released');
  RETURN v_id;
END;
$$;

-- Resolve dispute (owner or super_admin)
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  _dispute_id uuid,
  _status text,
  _resolution text DEFAULT NULL,
  _refund_amount numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_d order_disputes%ROWTYPE;
  v_is_owner boolean;
  v_is_admin boolean;
BEGIN
  SELECT * INTO v_d FROM order_disputes WHERE id = _dispute_id;
  IF v_d.id IS NULL THEN RAISE EXCEPTION 'Sengketa tidak ditemukan'; END IF;
  v_is_admin := has_role(auth.uid(), 'super_admin'::app_role);
  SELECT EXISTS (SELECT 1 FROM coffee_shops WHERE id = v_d.shop_id AND owner_id = auth.uid())
    INTO v_is_owner;
  IF NOT (v_is_owner OR v_is_admin) THEN
    RAISE EXCEPTION 'Tidak berwenang';
  END IF;
  IF _status NOT IN ('resolved','rejected','under_review') THEN
    RAISE EXCEPTION 'Status tidak valid';
  END IF;

  UPDATE order_disputes
  SET status = _status,
      resolution = _resolution,
      refund_amount = _refund_amount,
      resolved_by = CASE WHEN _status IN ('resolved','rejected') THEN auth.uid() ELSE resolved_by END,
      resolved_at = CASE WHEN _status IN ('resolved','rejected') THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = _dispute_id;

  -- If resolved with refund, trigger escrow refund (partial supported via amount)
  IF _status = 'resolved' AND COALESCE(_refund_amount, 0) > 0 THEN
    PERFORM escrow_refund_order(v_d.order_id);
  ELSIF _status = 'rejected' THEN
    -- Restore escrow status held -> released eligible
    UPDATE orders SET escrow_status = 'held', updated_at = now()
    WHERE id = v_d.order_id AND escrow_status = 'disputed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;

-- Send order message
CREATE OR REPLACE FUNCTION public.send_order_message(
  _order_id uuid,
  _body text,
  _attachment_url text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_role text;
  v_id uuid;
BEGIN
  IF length(trim(_body)) = 0 THEN RAISE EXCEPTION 'Pesan kosong'; END IF;
  IF length(_body) > 2000 THEN RAISE EXCEPTION 'Pesan terlalu panjang'; END IF;
  SELECT * INTO v_order FROM orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.customer_user_id = auth.uid() THEN
    v_role := 'customer';
  ELSIF EXISTS (SELECT 1 FROM coffee_shops WHERE id = v_order.shop_id AND owner_id = auth.uid()) THEN
    v_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Bukan peserta percakapan';
  END IF;
  INSERT INTO order_messages(order_id, shop_id, sender_id, sender_role, body, attachment_url)
  VALUES (_order_id, v_order.shop_id, auth.uid(), v_role, _body, _attachment_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Auto release escrow for orders delivered > 3 days ago without active dispute
CREATE OR REPLACE FUNCTION public.auto_release_escrow()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT o.id FROM orders o
    WHERE o.escrow_status = 'held'
      AND o.status = 'completed'
      AND o.delivered_at IS NOT NULL
      AND o.delivered_at < now() - interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM order_disputes d
        WHERE d.order_id = o.id AND d.status IN ('open','under_review')
      )
  LOOP
    PERFORM escrow_release_order(v_order.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('released', v_count);
END;
$$;

CREATE TRIGGER trg_disputes_updated
BEFORE UPDATE ON public.order_disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();