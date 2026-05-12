-- ============================================================
-- Fase 3-4: Bundle Produk / Paket
-- ============================================================

-- ── 1. Tambah kolom item_type ke menu_items ─────────────────
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'regular'
  CHECK (item_type IN ('regular', 'bundle'));

-- ── 2. Tabel bundle_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS bundle_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, component_id),
  -- Cegah bundle menunjuk ke dirinya sendiri
  CHECK (bundle_id <> component_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_component ON bundle_items(component_id);

-- ── 3. View: detail bundle beserta komponen ──────────────────
CREATE OR REPLACE VIEW v_bundle_components AS
SELECT
  bi.bundle_id,
  bi.component_id,
  bi.quantity,
  mi_bundle.shop_id,
  mi_bundle.name    AS bundle_name,
  mi_bundle.price   AS bundle_price,
  mi_comp.name      AS component_name,
  mi_comp.price     AS component_price,
  mi_comp.image_url AS component_image,
  mi_comp.track_stock AS component_track_stock
FROM bundle_items bi
JOIN menu_items mi_bundle ON mi_bundle.id = bi.bundle_id
JOIN menu_items mi_comp   ON mi_comp.id   = bi.component_id;

-- ── 4. Fungsi deduction yang diperbarui (handle bundle) ─────
CREATE OR REPLACE FUNCTION fn_deduct_stock_on_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item          RECORD;
  v_comp          RECORD;
  v_recipe        RECORD;
  v_menu          RECORD;
  v_ing           RECORD;
  v_qty_used      NUMERIC;
  v_effective_qty NUMERIC;
  v_new_stock     NUMERIC;
  v_owner_id      uuid;
BEGIN
  -- POS: INSERT dengan status completed
  -- Online/Marketplace: UPDATE ke confirmed atau preparing
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
    (TG_OP = 'UPDATE'
     AND NEW.status IN ('confirmed','preparing')
     AND OLD.status NOT IN ('confirmed','preparing','completed','cancelled','refunded'))
  ) THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO v_owner_id FROM coffee_shops WHERE id = NEW.shop_id;

  -- Loop tiap baris order_item
  FOR v_item IN
    SELECT oi.product_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id
  LOOP
    SELECT id, name, track_stock, item_type
    INTO v_menu
    FROM menu_items
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN CONTINUE; END IF;

    -- ── Kasus A: Bundle — expand ke komponen ─────────────────
    IF v_menu.item_type = 'bundle' THEN
      FOR v_comp IN
        SELECT bi.component_id, bi.quantity AS comp_qty
        FROM bundle_items bi
        WHERE bi.bundle_id = v_item.product_id
      LOOP
        -- Qty efektif = qty pesanan × qty komponen dalam bundle
        v_effective_qty := v_comp.comp_qty * v_item.quantity;

        -- Hanya deduct komponen yang track_stock = true
        PERFORM id FROM menu_items
        WHERE id = v_comp.component_id AND track_stock = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        -- Deduct semua ingredient dari resep komponen
        FOR v_recipe IN
          SELECT r.ingredient_id, r.quantity AS qty_per_portion
          FROM recipes r
          WHERE r.menu_item_id = v_comp.component_id
        LOOP
          v_qty_used := v_recipe.qty_per_portion * v_effective_qty;

          UPDATE ingredients
          SET current_stock = GREATEST(current_stock - v_qty_used, 0),
              updated_at    = now()
          WHERE id = v_recipe.ingredient_id
          RETURNING id, name, unit, current_stock, min_stock INTO v_ing;

          IF NOT FOUND THEN CONTINUE; END IF;

          INSERT INTO stock_movements (shop_id, ingredient_id, type, quantity, note, created_at)
          VALUES (
            NEW.shop_id, v_ing.id, 'sale', v_qty_used,
            'Bundle order #' || COALESCE(NEW.order_no, NEW.id::text),
            now()
          );

          v_new_stock := v_ing.current_stock;

          -- Auto-nonaktif menu & notifikasi (sama seperti regular)
          IF v_new_stock <= 0 THEN
            UPDATE menu_items mi
            SET is_available = false, updated_at = now()
            FROM recipes r
            WHERE r.menu_item_id = mi.id
              AND r.ingredient_id = v_ing.id
              AND mi.track_stock = true
              AND mi.auto_disable_on_empty = true
              AND mi.is_available = true;

            IF v_owner_id IS NOT NULL THEN
              INSERT INTO notifications (
                recipient_user_id, type, title, body, link, severity, created_at
              ) VALUES (
                v_owner_id, 'stock_empty',
                '⚠️ Stok habis: ' || v_ing.name,
                'Bahan "' || v_ing.name || '" habis akibat order bundle #'
                  || COALESCE(NEW.order_no, NEW.id::text),
                '/pos-app/inventory', 'danger', now()
              ) ON CONFLICT DO NOTHING;
            END IF;

          ELSIF v_new_stock <= v_ing.min_stock AND v_ing.min_stock > 0 THEN
            IF v_owner_id IS NOT NULL THEN
              INSERT INTO notifications (
                recipient_user_id, type, title, body, link, severity, created_at
              )
              SELECT v_owner_id, 'stock_critical',
                '🔴 Stok kritis: ' || v_ing.name,
                'Sisa ' || v_new_stock || ' ' || v_ing.unit
                  || ' (min: ' || v_ing.min_stock || '). Segera restok.',
                '/pos-app/inventory', 'danger', now()
              WHERE NOT EXISTS (
                SELECT 1 FROM notifications
                WHERE recipient_user_id = v_owner_id
                  AND type = 'stock_critical'
                  AND created_at > now() - INTERVAL '1 hour'
                  AND title LIKE '%' || v_ing.name || '%'
              );
            END IF;
          END IF;

        END LOOP; -- recipe loop (bundle component)
      END LOOP; -- bundle components loop

    -- ── Kasus B: Regular — logika existing ───────────────────
    ELSE
      IF NOT v_menu.track_stock THEN CONTINUE; END IF;

      FOR v_recipe IN
        SELECT r.ingredient_id, r.quantity AS qty_per_portion
        FROM recipes r
        WHERE r.menu_item_id = v_item.product_id
      LOOP
        v_qty_used := v_recipe.qty_per_portion * v_item.quantity;

        UPDATE ingredients
        SET current_stock = GREATEST(current_stock - v_qty_used, 0),
            updated_at    = now()
        WHERE id = v_recipe.ingredient_id
        RETURNING id, name, unit, current_stock, min_stock INTO v_ing;

        IF NOT FOUND THEN CONTINUE; END IF;

        INSERT INTO stock_movements (shop_id, ingredient_id, type, quantity, note, created_at)
        VALUES (
          NEW.shop_id, v_ing.id, 'sale', v_qty_used,
          'Order #' || COALESCE(NEW.order_no, NEW.id::text),
          now()
        );

        v_new_stock := v_ing.current_stock;

        IF v_new_stock <= 0 THEN
          UPDATE menu_items mi
          SET is_available = false, updated_at = now()
          FROM recipes r
          WHERE r.menu_item_id = mi.id
            AND r.ingredient_id = v_ing.id
            AND mi.track_stock = true
            AND mi.auto_disable_on_empty = true
            AND mi.is_available = true;

          IF v_owner_id IS NOT NULL THEN
            INSERT INTO notifications (
              recipient_user_id, type, title, body, link, severity, created_at
            ) VALUES (
              v_owner_id, 'stock_empty',
              '⚠️ Stok habis: ' || v_ing.name,
              'Bahan "' || v_ing.name || '" habis akibat order #'
                || COALESCE(NEW.order_no, NEW.id::text),
              '/pos-app/inventory', 'danger', now()
            ) ON CONFLICT DO NOTHING;
          END IF;

        ELSIF v_new_stock <= v_ing.min_stock AND v_ing.min_stock > 0 THEN
          IF v_owner_id IS NOT NULL THEN
            INSERT INTO notifications (
              recipient_user_id, type, title, body, link, severity, created_at
            )
            SELECT v_owner_id, 'stock_critical',
              '🔴 Stok kritis: ' || v_ing.name,
              'Sisa ' || v_new_stock || ' ' || v_ing.unit
                || ' (min: ' || v_ing.min_stock || '). Segera restok.',
              '/pos-app/inventory', 'danger', now()
            WHERE NOT EXISTS (
              SELECT 1 FROM notifications
              WHERE recipient_user_id = v_owner_id
                AND type = 'stock_critical'
                AND created_at > now() - INTERVAL '1 hour'
                AND title LIKE '%' || v_ing.name || '%'
            );
          END IF;
        END IF;

      END LOOP; -- recipe loop (regular)
    END IF;

  END LOOP; -- order_items loop

  RETURN NEW;
END;
$$;

-- Re-attach trigger (DROP IF EXISTS lalu CREATE ulang)
DROP TRIGGER IF EXISTS trg_deduct_stock_on_order ON orders;
CREATE TRIGGER trg_deduct_stock_on_order
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_deduct_stock_on_order();
