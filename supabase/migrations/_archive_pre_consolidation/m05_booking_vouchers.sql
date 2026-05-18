-- ============================================================
-- M-05: Voucher Khusus Booking
-- Merchant bisa buat kode voucher untuk diskon harga slot
-- Pelanggan input kode saat booking untuk dapat diskon
-- ============================================================

-- 1. Tabel booking_vouchers
CREATE TABLE IF NOT EXISTS booking_vouchers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  code            text        NOT NULL,
  discount_type   text        NOT NULL DEFAULT 'percent'
                              CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  numeric(12,2) NOT NULL CHECK (discount_value > 0),
  min_slot_price  numeric(12,2) NOT NULL DEFAULT 0,
  max_uses        integer,        -- NULL = tidak terbatas
  used_count      integer     NOT NULL DEFAULT 0,
  valid_from      date,
  valid_until     date,
  is_active       boolean     NOT NULL DEFAULT true,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);

CREATE INDEX IF NOT EXISTS idx_booking_vouchers_shop
  ON booking_vouchers (shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_booking_vouchers_code
  ON booking_vouchers (shop_id, code);

-- 2. Tambah kolom voucher ke tabel bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS voucher_code     text,
  ADD COLUMN IF NOT EXISTS voucher_discount numeric(12,2) DEFAULT 0;

-- 3. RLS
ALTER TABLE booking_vouchers ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD untuk voucher toko sendiri
DROP POLICY IF EXISTS "owner_all_bv"    ON booking_vouchers;
CREATE POLICY "owner_all_bv" ON booking_vouchers
  USING  (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()));

-- Publik: hanya bisa READ voucher yang aktif (untuk validasi kode)
DROP POLICY IF EXISTS "public_read_active_bv" ON booking_vouchers;
CREATE POLICY "public_read_active_bv" ON booking_vouchers
  FOR SELECT USING (is_active = true);

-- 4. Function: validasi & pakai voucher (atomic, cegah race condition)
CREATE OR REPLACE FUNCTION fn_use_booking_voucher(
  p_shop_id    uuid,
  p_code       text,
  p_slot_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher booking_vouchers%ROWTYPE;
  v_today   date := current_date;
  v_disc    numeric(12,2);
BEGIN
  SELECT * INTO v_voucher
  FROM booking_vouchers
  WHERE shop_id = p_shop_id
    AND upper(code) = upper(p_code)
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kode voucher tidak ditemukan atau tidak aktif');
  END IF;

  IF v_voucher.valid_from IS NOT NULL AND v_today < v_voucher.valid_from THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Voucher belum berlaku');
  END IF;

  IF v_voucher.valid_until IS NOT NULL AND v_today > v_voucher.valid_until THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Voucher sudah kadaluarsa');
  END IF;

  IF v_voucher.max_uses IS NOT NULL AND v_voucher.used_count >= v_voucher.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kuota voucher sudah habis');
  END IF;

  IF p_slot_price < v_voucher.min_slot_price THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Harga slot minimum untuk voucher ini adalah Rp ' || to_char(v_voucher.min_slot_price, 'FM999,999,999')
    );
  END IF;

  -- Hitung diskon
  IF v_voucher.discount_type = 'percent' THEN
    v_disc := ROUND((p_slot_price * v_voucher.discount_value / 100.0)::numeric, 0);
  ELSE
    v_disc := LEAST(v_voucher.discount_value, p_slot_price);
  END IF;

  -- Increment used_count
  UPDATE booking_vouchers
  SET used_count = used_count + 1
  WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'ok',             true,
    'voucher_id',     v_voucher.id,
    'code',           v_voucher.code,
    'discount_type',  v_voucher.discount_type,
    'discount_value', v_voucher.discount_value,
    'discount_amount', v_disc,
    'final_price',    GREATEST(p_slot_price - v_disc, 0)
  );
END;
$$;
