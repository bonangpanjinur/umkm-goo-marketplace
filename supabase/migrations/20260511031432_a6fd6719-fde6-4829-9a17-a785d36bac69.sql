
-- 1. Add delivery proof column
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_proof_url text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- 2. Storage bucket for proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "delivery_proofs_public_read" ON storage.objects;
CREATE POLICY "delivery_proofs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-proofs');

DROP POLICY IF EXISTS "delivery_proofs_courier_upload" ON storage.objects;
CREATE POLICY "delivery_proofs_courier_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-proofs'
    AND EXISTS (SELECT 1 FROM public.couriers c WHERE c.user_id = auth.uid() AND c.is_active = true)
  );

-- 3. Updated marketplace_checkout with shipping selection per shop
CREATE OR REPLACE FUNCTION public.marketplace_checkout(
  _recipient_name text,
  _phone text,
  _address text,
  _fulfillment text DEFAULT 'delivery',
  _notes text DEFAULT NULL,
  _shipping jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cart_id UUID;
  _shop RECORD;
  _order_id UUID;
  _outlet_id UUID;
  _order_no TEXT;
  _subtotal NUMERIC;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
  _net_to_shop NUMERIC;
  _global_rate NUMERIC;
  _order_ids UUID[] := ARRAY[]::UUID[];
  _zone_id UUID;
  _delivery_fee NUMERIC;
  _total NUMERIC;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;

  SELECT COALESCE((value)::numeric, 0.05) INTO _global_rate
  FROM platform_settings WHERE key = 'commission_global_rate';
  IF _global_rate IS NULL THEN _global_rate := 0.05; END IF;

  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN
    RAISE EXCEPTION 'Cart kosong';
  END IF;

  FOR _shop IN
    SELECT ci.shop_id, s.commission_rate_override, s.business_category_id
    FROM marketplace_cart_items ci
    JOIN coffee_shops s ON s.id = ci.shop_id
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id, s.commission_rate_override, s.business_category_id
  LOOP
    SELECT id INTO _outlet_id
    FROM outlets WHERE shop_id = _shop.shop_id AND is_active = true
    ORDER BY created_at LIMIT 1;
    IF _outlet_id IS NULL THEN
      INSERT INTO outlets (shop_id, name) VALUES (_shop.shop_id, 'Outlet Utama') RETURNING id INTO _outlet_id;
    END IF;

    SELECT COALESCE(SUM(ci.unit_price * ci.quantity), 0)
    INTO _subtotal
    FROM marketplace_cart_items ci
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    -- Resolve shipping
    _zone_id := NULL;
    _delivery_fee := 0;
    IF _fulfillment = 'delivery' THEN
      _zone_id := NULLIF(_shipping->>(_shop.shop_id::text), '')::uuid;
      IF _zone_id IS NOT NULL THEN
        SELECT fee INTO _delivery_fee FROM delivery_zones
        WHERE id = _zone_id AND shop_id = _shop.shop_id AND is_active = true;
        IF _delivery_fee IS NULL THEN
          _delivery_fee := 0;
          _zone_id := NULL;
        END IF;
      END IF;
      IF _zone_id IS NULL THEN
        -- fallback to shop's base delivery fee
        SELECT COALESCE(base_fee, 0) INTO _delivery_fee FROM delivery_settings WHERE shop_id = _shop.shop_id;
        _delivery_fee := COALESCE(_delivery_fee, 0);
      END IF;
    END IF;

    _commission_rate := _shop.commission_rate_override;
    IF _commission_rate IS NULL AND _shop.business_category_id IS NOT NULL THEN
      SELECT commission_override INTO _commission_rate
      FROM business_categories WHERE id = _shop.business_category_id;
    END IF;
    IF _commission_rate IS NULL THEN
      _commission_rate := _global_rate;
    END IF;
    _commission_amount := ROUND(_subtotal * _commission_rate, 2);
    _net_to_shop := _subtotal - _commission_amount;
    _total := _subtotal + _delivery_fee;

    _order_no := 'MKT-' || to_char(now(),'YYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6);

    INSERT INTO orders (
      shop_id, outlet_id, order_no, customer_name, customer_phone, customer_user_id,
      delivery_address, fulfillment, channel, status, payment_status, payment_method,
      subtotal, total, delivery_fee, delivery_zone_id,
      commission_rate, commission_amount, net_to_shop,
      escrow_status, marketplace_order, note
    ) VALUES (
      _shop.shop_id, _outlet_id, _order_no, _recipient_name, _phone, _user_id,
      _address, _fulfillment::fulfillment_type, 'online'::order_channel, 'pending'::order_status,
      'unpaid'::payment_status, 'manual_transfer'::payment_method,
      _subtotal, _total, _delivery_fee, _zone_id,
      ROUND(_commission_rate * 100, 2), _commission_amount, _net_to_shop,
      'held', true, _notes
    ) RETURNING id INTO _order_id;

    INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, subtotal, note)
    SELECT _order_id, ci.product_id, mi.name, ci.unit_price, ci.quantity,
           ci.unit_price * ci.quantity, ci.notes
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    PERFORM escrow_hold_order(_order_id);
    _order_ids := _order_ids || _order_id;
  END LOOP;

  DELETE FROM marketplace_cart_items WHERE cart_id = _cart_id;

  RETURN jsonb_build_object('order_ids', to_jsonb(_order_ids));
END;
$$;

-- 4. RPC for courier to mark delivered with photo
CREATE OR REPLACE FUNCTION public.courier_mark_delivered(
  _order_id uuid,
  _proof_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders o
    JOIN couriers c ON c.id = o.courier_id
    WHERE o.id = _order_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE orders
  SET status = 'completed'::order_status,
      delivery_proof_url = _proof_url,
      delivered_at = now(),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;
