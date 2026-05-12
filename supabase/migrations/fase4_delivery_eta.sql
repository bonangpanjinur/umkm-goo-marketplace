-- ============================================================
-- Fase 4-4: Estimasi Waktu Pengiriman
-- Tambah kolom min_eta_minutes & max_eta_minutes ke
-- delivery_settings (flat mode) dan delivery_zones (zone mode)
-- ============================================================

-- delivery_settings: ETA global (dipakai untuk mode flat)
ALTER TABLE delivery_settings
  ADD COLUMN IF NOT EXISTS min_eta_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_eta_minutes integer NOT NULL DEFAULT 60;

-- delivery_zones: ETA per zona (dipakai untuk mode zone)
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS min_eta_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_eta_minutes integer NOT NULL DEFAULT 60;
