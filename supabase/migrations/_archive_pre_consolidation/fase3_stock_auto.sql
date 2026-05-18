-- ============================================================
-- Fase 3: Manajemen Stok Otomatis
-- F3-1: Auto-deduct ingredients saat order masuk
-- F3-3: Auto-nonaktif menu jika bahan habis
-- ============================================================

-- ── Fungsi utama deduction ───────────────────────────────────
CREATE OR REPLACE FUNCTION fn_deduct_stock_on_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item        RECORD;
  v_recipe      RECORD;
  v_qty_used    NUMERIC;
  v_new_stock   NUMERIC;
  v_ing         RECORD;
  v_menu        RECORD;
  v_owner_id    uuid;
  v_notif_title TEXT;
  v_notif_body  TEXT;
BEGIN
  -- Hanya proses jika status tepat:
  -- INSERT dengan status 'completed' (POS langsung bayar)
  -- UPDATE menjadi 'confirmed' atau 'preparing' (online/marketplace)
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
     (TG_OP = 'UPDATE' AND NEW.status IN ('confirmed','preparing')
      AND OLD.status NOT IN ('confirmed','preparing','completed','cancelled','refunded')) THEN

    -- Ambil owner toko untuk notifikasi
    SELECT owner_id INTO v_owner_id
    FROM coffee_shops WHERE id = NEW.shop_id;

    -- Loop setiap item di pesanan
    FOR v_item IN
      SELECT oi.product_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      -- Cek apakah menu ini track_stock = true
      SELECT id, name, track_stock, is_available, auto_disable_on_empty
      INTO v_menu
      FROM menu_items
      WHERE id = v_item.product_id AND track_stock = true;

      IF NOT FOUND THEN CONTINUE; END IF;

      -- Loop setiap bahan dalam resep menu ini
      FOR v_recipe IN
        SELECT r.ingredient_id, r.quantity AS qty_per_portion
        FROM recipes r
        WHERE r.menu_item_id = v_item.product_id
      LOOP
        v_qty_used := v_recipe.qty_per_portion * v_item.quantity;

        -- Kurangi stok ingredient
        UPDATE ingredients
        SET current_stock = GREATEST(current_stock - v_qty_used, 0),
            updated_at    = now()
        WHERE id = v_recipe.ingredient_id
        RETURNING id, name, unit, current_stock, min_stock INTO v_ing;

        IF NOT FOUND THEN CONTINUE; END IF;

        -- Catat stock_movement tipe 'sale'
        INSERT INTO stock_movements (
          shop_id, ingredient_id, type, quantity, note, created_at
        ) VALUES (
          NEW.shop_id,
          v_ing.id,
          'sale',
          v_qty_used,
          'Auto: order #' || COALESCE(NEW.order_no, NEW.id::text),
          now()
        );

        v_new_stock := v_ing.current_stock;

        -- ── F3-3: Auto-nonaktif menu jika bahan habis ───────
        IF v_new_stock <= 0 THEN
          -- Nonaktifkan semua menu yang pakai bahan ini + auto_disable_on_empty
          UPDATE menu_items mi
          SET is_available = false,
              updated_at   = now()
          FROM recipes r
          WHERE r.menu_item_id = mi.id
            AND r.ingredient_id = v_ing.id
            AND mi.track_stock = true
            AND mi.auto_disable_on_empty = true
            AND mi.is_available = true;

          -- ── F3-2: Kirim notifikasi ke owner jika bahan habis ──
          IF v_owner_id IS NOT NULL THEN
            INSERT INTO notifications (
              recipient_user_id, type, title, body, link, severity, created_at
            ) VALUES (
              v_owner_id,
              'stock_empty',
              '⚠️ Stok habis: ' || v_ing.name,
              'Bahan "' || v_ing.name || '" telah habis akibat pesanan #'
                || COALESCE(NEW.order_no, NEW.id::text)
                || '. Beberapa menu mungkin dinonaktifkan otomatis.',
              '/pos-app/inventory',
              'danger',
              now()
            )
            ON CONFLICT DO NOTHING;
          END IF;

        -- ── F3-2: Notifikasi stok kritis (mendekati min_stock) ──
        ELSIF v_new_stock <= v_ing.min_stock AND v_ing.min_stock > 0 THEN
          IF v_owner_id IS NOT NULL THEN
            INSERT INTO notifications (
              recipient_user_id, type, title, body, link, severity, created_at
            )
            SELECT
              v_owner_id,
              'stock_critical',
              '🔴 Stok kritis: ' || v_ing.name,
              'Sisa ' || v_new_stock || ' ' || v_ing.unit
                || ' (minimum: ' || v_ing.min_stock || ' ' || v_ing.unit || '). Segera restok.',
              '/pos-app/inventory',
              'danger',
              now()
            WHERE NOT EXISTS (
              SELECT 1 FROM notifications
              WHERE recipient_user_id = v_owner_id
                AND type = 'stock_critical'
                AND link = '/pos-app/inventory'
                AND created_at > now() - INTERVAL '1 hour'
                AND title LIKE '%' || v_ing.name || '%'
            );
          END IF;
        END IF;

      END LOOP; -- end recipe loop
    END LOOP; -- end order_items loop
  END IF;

  RETURN NEW;
END;
$$;

-- ── Trigger pada tabel orders ─────────────────────────────────
DROP TRIGGER IF EXISTS trg_deduct_stock_on_order ON orders;
CREATE TRIGGER trg_deduct_stock_on_order
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_deduct_stock_on_order();

-- ── View helper: ingredient stok kritis per toko ─────────────
CREATE OR REPLACE VIEW v_low_stock_ingredients AS
SELECT
  i.id,
  i.shop_id,
  i.name,
  i.unit,
  i.current_stock,
  i.min_stock,
  i.category,
  CASE
    WHEN i.current_stock <= 0              THEN 'empty'
    WHEN i.current_stock <= i.min_stock    THEN 'critical'
    ELSE 'ok'
  END AS stock_status,
  -- hitung berapa menu yang terblokir jika bahan ini habis
  COUNT(DISTINCT r.menu_item_id) AS affected_menu_count
FROM ingredients i
LEFT JOIN recipes r ON r.ingredient_id = i.id
WHERE i.is_active = true
GROUP BY i.id, i.shop_id, i.name, i.unit, i.current_stock, i.min_stock, i.category;

-- Index untuk performa realtime query
CREATE INDEX IF NOT EXISTS idx_ingredients_stock ON ingredients(shop_id, current_stock, min_stock)
  WHERE is_active = true;
