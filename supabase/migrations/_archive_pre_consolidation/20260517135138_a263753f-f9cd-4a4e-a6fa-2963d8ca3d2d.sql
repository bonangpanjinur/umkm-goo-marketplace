
-- Add theme_key to shops if missing
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS theme_key text NOT NULL DEFAULT 'classic';

-- Add recommended_theme_key to business_categories
ALTER TABLE public.business_categories ADD COLUMN IF NOT EXISTS recommended_theme_key text;

-- Seed/refresh themes
DELETE FROM public.themes;
INSERT INTO public.themes (key, name, description, component_id, tier_hint, is_active, sort_order) VALUES
  ('classic',       'Klasik Serbaguna', 'Tema default fleksibel untuk semua jenis bisnis.',           'classic',       'basic', true, 1),
  ('minimal',       'Minimal Editorial', 'Tipografi serif, garis tegas, banyak ruang putih.',          'minimal',       'basic', true, 2),
  ('kuliner-warm',  'Kuliner Hangat',   'Coklat hangat, foto hidangan besar, ideal F&B.',              'kuliner-warm',  'basic', true, 3),
  ('retail-bold',   'Retail Bold',      'Kontras tinggi + aksen merah, katalog produk grid.',          'retail-bold',   'basic', true, 4),
  ('service-clean', 'Service Clean',    'Navy + putih, fokus CTA pesan layanan & testimoni.',          'service-clean', 'basic', true, 5),
  ('rental-drive',  'Rental Drive',     'Hitam metalik + kuning, kartu unit & harga per hari.',        'rental-drive',  'basic', true, 6),
  ('edu-bright',    'Edu Bright',       'Indigo + kuning, daftar kursus + instruktur.',                'edu-bright',    'basic', true, 7),
  ('beauty-soft',   'Beauty Soft',      'Pink pastel, look-book mosaic, tombol booking sticky.',       'beauty-soft',   'basic', true, 8),
  ('medic-trust',   'Medic Trust',      'Hijau toska + putih, jadwal dokter, trust badge.',            'medic-trust',   'basic', true, 9),
  ('studio-mono',   'Studio Mono',      'Monokrom, gallery masonry full-bleed, paket foto.',           'studio-mono',   'basic', true, 10),
  ('umroh',         'Travel & Umroh',   'Hijau emas, paket perjalanan + fasilitas.',                   'umroh',         'basic', true, 11),
  ('craft-paper',   'Craft Paper',      'Kraft beige + serif, WIP gallery & form custom order.',       'craft-paper',   'basic', true, 12),
  ('sales-pro',     'Sales Pro',        'Konversi tinggi, hero CTA + lead form.',                      'sales-pro',     'basic', true, 13);

-- Map kategori → rekomendasi
UPDATE public.business_categories SET recommended_theme_key = CASE slug
  WHEN 'fnb'         THEN 'kuliner-warm'
  WHEN 'retail'      THEN 'retail-bold'
  WHEN 'jasa'        THEN 'service-clean'
  WHEN 'rental'      THEN 'rental-drive'
  WHEN 'kursus'      THEN 'edu-bright'
  WHEN 'salon'       THEN 'beauty-soft'
  WHEN 'klinik'      THEN 'medic-trust'
  WHEN 'studio-foto' THEN 'studio-mono'
  WHEN 'travel'      THEN 'umroh'
  WHEN 'custom-order'THEN 'craft-paper'
  ELSE 'classic'
END;

-- RPC get_my_entitlements (simple: returns plan + themes + active key + features placeholder)
CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_theme_key text;
  v_plan_code text := 'basic';
  v_started timestamptz;
  v_months numeric := 0;
  v_themes jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT id, theme_key, plan_started_at INTO v_shop_id, v_theme_key, v_started
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;
  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'key', key,
    'name', name,
    'description', description,
    'preview_image_url', preview_image_url,
    'allowed', true,
    'reason', NULL,
    'component_id', component_id
  ) ORDER BY sort_order)
  INTO v_themes FROM public.themes WHERE is_active = true;
  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'months_active', v_months,
    'active_theme_key', COALESCE(v_theme_key, 'classic'),
    'features', '[]'::jsonb,
    'themes', COALESCE(v_themes, '[]'::jsonb)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_my_entitlements() TO authenticated;
