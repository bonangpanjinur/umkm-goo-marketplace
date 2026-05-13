
-- Add membership tracking columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS membership_tier_id UUID REFERENCES public.shop_membership_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS membership_discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS membership_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Replace marketplace_checkout to auto-apply active membership discount per shop
CREATE OR REPLACE FUNCTION public.marketplace_checkout(
  _recipient_name text,
  _phone text,
  _address text,
  _fulfillment text DEFAULT 'delivery'::text,
  _notes text DEFAULT NULL::text,
  _shipping jsonb DEFAULT '{}'::jsonb,
  _shop_voucher_codes jsonb DEFAULT '{}'::jsonb,
  _platform_voucher_code text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  _shop_voucher_code TEXT;
  _shop_voucher RECORD;
  _shop_discount NUMERIC;
  _platform_voucher RECORD;
  _platform_discount NUMERIC := 0;
  _platform_total_subtotal NUMERIC := 0;
  _used_count_user INTEGER;
  _shop_subtotals jsonb := '{}'::jsonb;
  _membership RECORD;
  _membership_discount NUMERIC;
  _membership_pct NUMERIC;
  _membership_tier_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;

  SELECT COALESCE((value)::numeric, 0.05) INTO _global_rate
  FROM platform_settings WHERE key = 'commission_global_rate';
  IF _global_rate IS NULL THEN _global_rate := 0.05; END IF;

  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN RAISE EXCEPTION 'Cart kosong'; END IF;

  IF _platform_voucher_code IS NOT NULL AND _platform_voucher_code <> '' THEN
    SELECT * INTO _platform_voucher FROM platform_vouchers
    WHERE code = _platform_voucher_code AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (expires_at IS NULL OR expires_at >= now());
    IF _platform_voucher.id IS NULL THEN
      RAISE EXCEPTION 'Voucher platform tidak valid';
    END IF;
    IF _platform_voucher.usage_limit IS NOT NULL AND _platform_voucher.usage_count >= _platform_voucher.usage_limit THEN
      RAISE EXCEPTION 'Voucher platform habis';
    END IF;
    SELECT COUNT(*) INTO _used_count_user FROM platform_voucher_redemptions
      WHERE voucher_id = _platform_voucher.id AND user_id = _user_id;
    IF _platform_voucher.per_user_limit IS NOT NULL AND _used_count_user >= _platform_voucher.per_user_limit THEN
      RAISE EXCEPTION 'Voucher platform sudah pernah dipakai';
    END IF;
  END IF;

  FOR _shop IN
    SELECT ci.shop_id
    FROM marketplace_cart_items ci
    GROUP BY ci.shop_id
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END * ci.quantity
    ), 0)
    INTO _subtotal
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;
    _shop_subtotals := _shop_subtotals || jsonb_build_object(_shop.shop_id::text, _subtotal);
    _platform_total_subtotal := _platform_total_subtotal + _subtotal;
  END LOOP;

  FOR _shop IN
    SELECT ci.shop_id, s.commission_rate_override, s.business_category_id
    FROM marketplace_cart_items ci
    JOIN coffee_shops s ON s.id = ci.shop_id
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id, s.commission_rate_override, s.business_category_id
  LOOP
    SELECT id INTO _outlet_id FROM outlets WHERE shop_id = _shop.shop_id AND is_active = true ORDER BY created_at LIMIT 1;
    IF _outlet_id IS NULL THEN
      INSERT INTO outlets (shop_id, name) VALUES (_shop.shop_id, 'Outlet Utama') RETURNING id INTO _outlet_id;
    END IF;

    _subtotal := COALESCE((_shop_subtotals->>(_shop.shop_id::text))::numeric, 0);

    -- Resolve shipping
    _zone_id := NULL; _delivery_fee := 0;
    IF _fulfillment = 'delivery' THEN
      _zone_id := NULLIF(_shipping->>(_shop.shop_id::text), '')::uuid;
      IF _zone_id IS NOT NULL THEN
        SELECT fee INTO _delivery_fee FROM delivery_zones
        WHERE id = _zone_id AND shop_id = _shop.shop_id AND is_active = true;
        IF _delivery_fee IS NULL THEN _delivery_fee := 0; _zone_id := NULL; END IF;
      END IF;
      IF _zone_id IS NULL THEN
        SELECT COALESCE(base_fee, 0) INTO _delivery_fee FROM delivery_settings WHERE shop_id = _shop.shop_id;
        _delivery_fee := COALESCE(_delivery_fee, 0);
      END IF;
    END IF;

    -- Per-shop voucher
    _shop_voucher_code := _shop_voucher_codes->>(_shop.shop_id::text);
    _shop_discount := 0;
    IF _shop_voucher_code IS NOT NULL AND _shop_voucher_code <> '' THEN
      SELECT * INTO _shop_voucher FROM promos
      WHERE shop_id = _shop.shop_id AND code = _shop_voucher_code AND is_active = true
        AND channel IN ('online','all')
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (min_order IS NULL OR _subtotal >= min_order);
      IF _shop_voucher.id IS NOT NULL THEN
        IF _shop_voucher.type = 'percent' THEN
          _shop_discount := ROUND(_subtotal * _shop_voucher.value / 100, 2);
        ELSE
          _shop_discount := _shop_voucher.value;
        END IF;
        IF _shop_voucher.max_discount IS NOT NULL AND _shop_discount > _shop_voucher.max_discount THEN
          _shop_discount := _shop_voucher.max_discount;
        END IF;
        IF _shop_discount > _subtotal THEN _shop_discount := _subtotal; END IF;
        UPDATE promos SET usage_count = usage_count + 1 WHERE id = _shop_voucher.id;
      ELSE
        _shop_voucher_code := NULL;
      END IF;
    END IF;

    -- Auto-apply active membership discount for this shop
    _membership_discount := 0;
    _membership_pct := 0;
    _membership_tier_id := NULL;
    SELECT cm.tier_id, t.discount_percent
      INTO _membership
      FROM customer_memberships cm
      JOIN shop_membership_tiers t ON t.id = cm.tier_id
      WHERE cm.customer_user_id = _user_id
        AND cm.shop_id = _shop.shop_id
        AND cm.status = 'active'
        AND cm.expires_at > now()
      ORDER BY t.discount_percent DESC
      LIMIT 1;
    IF _membership.tier_id IS NOT NULL AND _membership.discount_percent > 0 THEN
      _membership_tier_id := _membership.tier_id;
      _membership_pct := _membership.discount_percent;
      -- Discount applied on subtotal AFTER shop voucher
      _membership_discount := ROUND((_subtotal - _shop_discount) * _membership_pct / 100, 2);
      IF _membership_discount < 0 THEN _membership_discount := 0; END IF;
    END IF;

    -- Platform voucher allocated proportionally on (subtotal - shop_discount - membership_discount)
    _platform_discount := 0;
    IF _platform_voucher.id IS NOT NULL AND _platform_total_subtotal >= COALESCE(_platform_voucher.min_order, 0) THEN
      DECLARE
        _platform_total_disc NUMERIC;
        _share NUMERIC;
      BEGIN
        IF _platform_voucher.discount_type = 'percent' THEN
          _platform_total_disc := ROUND(_platform_total_subtotal * _platform_voucher.value / 100, 2);
        ELSE
          _platform_total_disc := _platform_voucher.value;
        END IF;
        IF _platform_voucher.max_discount IS NOT NULL AND _platform_total_disc > _platform_voucher.max_discount THEN
          _platform_total_disc := _platform_voucher.max_discount;
        END IF;
        _share := CASE WHEN _platform_total_subtotal > 0
          THEN (_subtotal - _shop_discount - _membership_discount) / NULLIF(_platform_total_subtotal, 0) ELSE 0 END;
        _platform_discount := ROUND(_platform_total_disc * _share, 2);
        IF _platform_discount < 0 THEN _platform_discount := 0; END IF;
      END;
    END IF;

    _commission_rate := _shop.commission_rate_override;
    IF _commission_rate IS NULL AND _shop.business_category_id IS NOT NULL THEN
      SELECT commission_override INTO _commission_rate FROM business_categories WHERE id = _shop.business_category_id;
    END IF;
    IF _commission_rate IS NULL THEN _commission_rate := _global_rate; END IF;

    DECLARE _net_subtotal NUMERIC := _subtotal - _shop_discount - _membership_discount;
    BEGIN
      IF _net_subtotal < 0 THEN _net_subtotal := 0; END IF;
      _commission_amount := ROUND(_net_subtotal * _commission_rate, 2);
      _net_to_shop := _net_subtotal - _commission_amount;
      _total := _net_subtotal - _platform_discount + _delivery_fee;
      IF _total < 0 THEN _total := 0; END IF;
    END;

    _order_no := 'MKT-' || to_char(now(),'YYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6);

    INSERT INTO orders (
      shop_id, outlet_id, order_no, customer_name, customer_phone, customer_user_id,
      delivery_address, fulfillment, channel, status, payment_status, payment_method,
      subtotal, discount, total, delivery_fee, delivery_zone_id,
      commission_rate, commission_amount, net_to_shop,
      escrow_status, marketplace_order, note,
      shop_voucher_code, shop_voucher_discount,
      platform_voucher_code, platform_voucher_discount,
      membership_tier_id, membership_discount, membership_discount_percent
    ) VALUES (
      _shop.shop_id, _outlet_id, _order_no, _recipient_name, _phone, _user_id,
      _address, _fulfillment::fulfillment_type, 'online'::order_channel, 'pending'::order_status,
      'unpaid'::payment_status, 'manual_transfer'::payment_method,
      _subtotal, _shop_discount + _platform_discount + _membership_discount, _total, _delivery_fee, _zone_id,
      ROUND(_commission_rate * 100, 2), _commission_amount, _net_to_shop,
      'held', true, _notes,
      _shop_voucher_code, _shop_discount,
      CASE WHEN _platform_voucher.id IS NOT NULL THEN _platform_voucher.code ELSE NULL END,
      _platform_discount,
      _membership_tier_id, _membership_discount, _membership_pct
    ) RETURNING id INTO _order_id;

    INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, subtotal, note)
    SELECT _order_id, ci.product_id, mi.name,
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END,
      ci.quantity,
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END * ci.quantity,
      ci.notes
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    PERFORM escrow_hold_order(_order_id);
    _order_ids := _order_ids || _order_id;
  END LOOP;

  IF _platform_voucher.id IS NOT NULL THEN
    INSERT INTO platform_voucher_redemptions (voucher_id, user_id, order_ids, amount)
    VALUES (_platform_voucher.id, _user_id, _order_ids,
      (SELECT COALESCE(SUM(platform_voucher_discount),0) FROM orders WHERE id = ANY(_order_ids)));
    UPDATE platform_vouchers SET usage_count = usage_count + 1 WHERE id = _platform_voucher.id;
  END IF;

  DELETE FROM marketplace_cart_items WHERE cart_id = _cart_id;
  RETURN jsonb_build_object('order_ids', to_jsonb(_order_ids));
END;
$function$;

-- Helper: fetch active memberships for current user across given shops (used by checkout UI preview)
CREATE OR REPLACE FUNCTION public.get_my_active_memberships(_shop_ids uuid[])
RETURNS TABLE (
  shop_id uuid,
  tier_id uuid,
  tier_name text,
  discount_percent numeric,
  expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cm.shop_id, t.id, t.name, t.discount_percent, cm.expires_at
  FROM customer_memberships cm
  JOIN shop_membership_tiers t ON t.id = cm.tier_id
  WHERE cm.customer_user_id = auth.uid()
    AND cm.shop_id = ANY(_shop_ids)
    AND cm.status = 'active'
    AND cm.expires_at > now()
  ORDER BY t.discount_percent DESC;
$$;
