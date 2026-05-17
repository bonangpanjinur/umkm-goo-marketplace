-- F-16 Phase 3: Consolidate deposit config truth source
-- Truth source per toko: shops.deposit_enabled + deposit_percentage + deposit_min_total + deposit_notes
-- business_categories.booking_config.deposit_* tetap ada sebagai DEFAULT SEED per kategori (bukan truth)
-- Drop kolom legacy duplikat shops.deposit_percent (int) — sudah digantikan deposit_percentage (numeric)

ALTER TABLE public.shops DROP COLUMN IF EXISTS deposit_percent;

COMMENT ON COLUMN public.shops.deposit_enabled IS 'F-16: Truth source — apakah toko mewajibkan DP untuk booking & order';
COMMENT ON COLUMN public.shops.deposit_percentage IS 'F-16: Truth source — persen DP (0-100), berlaku untuk booking & order checkout';
COMMENT ON COLUMN public.shops.deposit_min_total IS 'F-16: Truth source — minimum total order agar DP wajib (Rp)';
COMMENT ON COLUMN public.shops.deposit_notes IS 'F-16: Truth source — catatan DP yang ditampilkan ke customer';
COMMENT ON COLUMN public.business_categories.booking_config IS 'F-16: Default seed per kategori usaha (min_hours_before, deposit_required, deposit_percent, max_advance_days). BUKAN truth source — owner toko override via shops.deposit_*';