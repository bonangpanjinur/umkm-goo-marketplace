-- Sprint 9: Product Metadata, Booking History, & Public Booking
-- Jalankan di Supabase SQL Editor

-- ============================================================
-- P-06: Histori Harga Produk
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_item_price_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  uuid        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  price         numeric     NOT NULL,
  recorded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_item_date
  ON menu_item_price_history (menu_item_id, recorded_at DESC);

-- Trigger: catat otomatis ke price_history setiap kali harga berubah
CREATE OR REPLACE FUNCTION fn_record_price_history()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO menu_item_price_history (menu_item_id, price, recorded_at)
    VALUES (NEW.id, OLD.price, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_price_history ON menu_items;
CREATE TRIGGER trg_record_price_history
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_record_price_history();

-- ============================================================
-- P-07: Size Chart per Produk (JSON)
-- P-08: Tag Alergen & Dietary
-- P-09: Ingredient List & Nomor BPOM
-- ============================================================
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS allergens    text[],
  ADD COLUMN IF NOT EXISTS dietary_tags text[],
  ADD COLUMN IF NOT EXISTS ingredients  text,
  ADD COLUMN IF NOT EXISTS bpom_number  text,
  ADD COLUMN IF NOT EXISTS size_chart   jsonb;

COMMENT ON COLUMN menu_items.allergens    IS 'Daftar alergen, contoh: {susu,kacang,gluten}';
COMMENT ON COLUMN menu_items.dietary_tags IS 'Label diet, contoh: {Halal,Vegan,Vegetarian}';
COMMENT ON COLUMN menu_items.ingredients  IS 'Daftar komposisi/bahan dalam teks bebas';
COMMENT ON COLUMN menu_items.bpom_number  IS 'Nomor izin edar BPOM, contoh: MD123456789';
COMMENT ON COLUMN menu_items.size_chart   IS 'Tabel ukuran JSON: {"label":"Ukuran Baju","sizes":[{"size":"S","lingkar_dada":"88","panjang":"60"},...]}';

-- ============================================================
-- P-01: Tabel Booking (jika belum ada)
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_slots (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  service_name  text        NOT NULL,
  slot_date     date        NOT NULL,
  slot_time     time        NOT NULL,
  duration_min  int         NOT NULL DEFAULT 60,
  max_capacity  int         NOT NULL DEFAULT 1,
  booked_count  int         NOT NULL DEFAULT 0,
  price         numeric     NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_slots_shop_date
  ON booking_slots (shop_id, slot_date);

CREATE TABLE IF NOT EXISTS bookings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         uuid        NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
  customer_name   text        NOT NULL,
  customer_phone  text,
  party_size      int         NOT NULL DEFAULT 1,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','confirmed','cancelled','completed')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings (slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
