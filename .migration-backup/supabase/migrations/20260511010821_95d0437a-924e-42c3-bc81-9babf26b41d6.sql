
-- ============================================================
-- Marketplace Checkout RPC: create one order per shop from cart
-- ============================================================
CREATE OR REPLACE FUNCTION public.marketplace_checkout(
  _recipient_name TEXT,
  _phone TEXT,
  _address TEXT,
  _fulfillment TEXT DEFAULT 'delivery',
  _notes TEXT DEFAULT NULL
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
  _item RECORD;
  _order_id UUID;
  _outlet_id UUID;
  _order_no TEXT;
  _subtotal NUMERIC;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
  _net_to_shop NUMERIC;
  _global_rate NUMERIC;
  _order_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;

  -- Get default global commission rate (5% fallback)
  SELECT COALESCE((value)::numeric, 0.05) INTO _global_rate
  FROM platform_settings WHERE key = 'commission_global_rate';
  IF _global_rate IS NULL THEN _global_rate := 0.05; END IF;

  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN
    RAISE EXCEPTION 'Cart kosong';
  END IF;

  -- Iterate over distinct shops in the cart
  FOR _shop IN
    SELECT ci.shop_id, s.commission_rate_override, s.business_category_id
    FROM marketplace_cart_items ci
    JOIN coffee_shops s ON s.id = ci.shop_id
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id, s.commission_rate_override, s.business_category_id
  LOOP
    -- Pick first active outlet of shop
    SELECT id INTO _outlet_id
    FROM outlets WHERE shop_id = _shop.shop_id AND is_active = true
    ORDER BY created_at LIMIT 1;
    IF _outlet_id IS NULL THEN
      -- create a default outlet for the shop
      INSERT INTO outlets (shop_id, name) VALUES (_shop.shop_id, 'Outlet Utama') RETURNING id INTO _outlet_id;
    END IF;

    -- Compute subtotal for this shop
    SELECT COALESCE(SUM(ci.unit_price * ci.quantity), 0)
    INTO _subtotal
    FROM marketplace_cart_items ci
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    -- Resolve commission rate priority: shop override > category override > global
    _commission_rate := _shop.commission_rate_override;
    IF _commission_rate IS NULL AND _shop.business_category_id IS NOT NULL THEN
      SELECT commission_override INTO _commission_rate
      FROM business_categories WHERE id = _shop.business_category_id;
    END IF;
    IF _commission_rate IS NULL THEN
      _commission_rate := _global_rate;
    END IF;
    -- Convert decimal (0.05) to percent (5.00) for orders.commission_rate (numeric(5,2))
    _commission_amount := ROUND(_subtotal * _commission_rate, 2);
    _net_to_shop := _subtotal - _commission_amount;

    -- Generate order_no
    _order_no := 'MKT-' || to_char(now(),'YYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6);

    INSERT INTO orders (
      shop_id, outlet_id, order_no, customer_name, customer_phone, customer_user_id,
      delivery_address, fulfillment, channel, status, payment_status, payment_method,
      subtotal, total, commission_rate, commission_amount, net_to_shop,
      escrow_status, marketplace_order, note
    ) VALUES (
      _shop.shop_id, _outlet_id, _order_no, _recipient_name, _phone, _user_id,
      _address, _fulfillment::fulfillment_type, 'online'::order_channel, 'pending'::order_status,
      'unpaid'::payment_status, 'manual_transfer'::payment_method,
      _subtotal, _subtotal, ROUND(_commission_rate * 100, 2), _commission_amount, _net_to_shop,
      'held', true, _notes
    ) RETURNING id INTO _order_id;

    -- Insert order items
    INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, subtotal, note)
    SELECT _order_id, ci.product_id, mi.name, ci.unit_price, ci.quantity,
           ci.unit_price * ci.quantity, ci.notes
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    -- Hold escrow (records pending balance & wallet txn)
    PERFORM escrow_hold_order(_order_id);

    _order_ids := _order_ids || _order_id;
  END LOOP;

  -- Clear cart items
  DELETE FROM marketplace_cart_items WHERE cart_id = _cart_id;

  RETURN jsonb_build_object('order_ids', to_jsonb(_order_ids));
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_checkout(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.marketplace_checkout(TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, public;

-- ============================================================
-- Helper: get_or_create_marketplace_cart
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_marketplace_cart()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cart_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;
  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN
    INSERT INTO marketplace_carts (user_id) VALUES (_user_id) RETURNING id INTO _cart_id;
  END IF;
  RETURN _cart_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_marketplace_cart() TO authenticated;

-- ============================================================
-- Public read policy on order_items for marketplace customer
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'order_items_customer_self_read' AND polrelid = 'public.order_items'::regclass) THEN
    CREATE POLICY "order_items_customer_self_read" ON public.order_items
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.customer_user_id = auth.uid()));
  END IF;
END $$;
