
-- ============================================================================
-- FASE 0 — Fondasi Marketplace Multi-Kategori
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. business_categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  commission_override NUMERIC(5,4),
  product_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled_features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_categories_public_read
  ON public.business_categories FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY business_categories_admin_read_all
  ON public.business_categories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY business_categories_admin_write
  ON public.business_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Seed 16 default categories
INSERT INTO public.business_categories (slug, name, description, sort_order, enabled_features) VALUES
  ('fnb', 'Food & Beverage', 'Makanan, minuman, kue, katering, kedai kopi', 1, ARRAY['pos','kds','tables','recipes','ingredients']),
  ('fashion', 'Fashion & Pakaian', 'Baju, celana, sepatu, tas, aksesoris, hijab', 2, ARRAY['variants','size_chart']),
  ('digital', 'Produk Digital', 'Template, e-book, font, musik, preset, kode', 3, ARRAY['digital_delivery']),
  ('beauty', 'Kecantikan & Perawatan', 'Skincare, makeup, parfum, perawatan rambut', 4, ARRAY['ingredients_list','bpom']),
  ('electronics', 'Elektronik & Gadget', 'Aksesoris HP, charger, earphone, komponen', 5, ARRAY['warranty','serial_number']),
  ('craft', 'Kerajinan Tangan', 'Anyaman, ukiran, batik, gerabah, lilin, sabun', 6, ARRAY['variants','custom_order']),
  ('books', 'Buku & Edukasi', 'Buku fisik, modul, materi belajar, komik', 7, ARRAY['isbn']),
  ('home', 'Rumah & Dekorasi', 'Furnitur mini, bantal, karpet, lilin dekor, rak', 8, ARRAY['dimensions']),
  ('food_packaged', 'Makanan Kemasan', 'Keripik, sambal, kue kering, frozen', 9, ARRAY['expiry_date','net_weight']),
  ('plants', 'Tanaman & Pertanian', 'Tanaman hias, bibit, pupuk, media tanam', 10, ARRAY['care_guide']),
  ('art', 'Seni & Koleksi', 'Lukisan, fotografi, patung, memorabilia', 11, ARRAY['certificate','limited_edition']),
  ('services', 'Jasa & Layanan', 'Fotografi, desain grafis, konsultasi, les', 12, ARRAY['booking']),
  ('kids', 'Anak-anak & Mainan', 'Mainan edukatif, baju anak, perlengkapan bayi', 13, ARRAY['age_range','safety_cert']),
  ('sports', 'Olahraga & Outdoor', 'Perlengkapan gym, camping, sepeda, renang', 14, ARRAY['size_chart']),
  ('pets', 'Hewan Peliharaan', 'Pakan, aksesoris, kandang, grooming', 15, ARRAY['species']),
  ('other', 'Lainnya', 'Kategori umum tanpa atribut khusus', 99, ARRAY[]::text[])
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. platform_settings (key-value)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  value_encrypted TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_settings_super_admin_all
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Public-readable subset for branding (name, logo) used by storefront
CREATE POLICY platform_settings_public_branding
  ON public.platform_settings FOR SELECT TO public
  USING (key IN ('platform_name', 'platform_logo_url', 'platform_tagline', 'platform_primary_color'));

-- Seed default settings
INSERT INTO public.platform_settings (key, value, category, description) VALUES
  ('platform_name', 'KopiHub Marketplace', 'branding', 'Nama platform yang ditampilkan di seluruh halaman'),
  ('platform_tagline', 'Marketplace untuk semua usaha kecil', 'branding', 'Tagline platform'),
  ('platform_logo_url', NULL, 'branding', 'URL logo platform'),
  ('platform_primary_color', '#0ea5e9', 'branding', 'Warna utama brand'),
  ('commission_global_rate', '0.05', 'commission', 'Komisi platform global (0.05 = 5%)'),
  ('commission_apply_on_shipping', 'false', 'commission', 'Komisi dihitung dari ongkir juga?'),
  ('withdrawal_min_amount', '50000', 'withdrawal', 'Minimum penarikan dana (Rp)'),
  ('withdrawal_admin_fee', '2500', 'withdrawal', 'Biaya admin penarikan (Rp)'),
  ('withdrawal_processing_days', '3', 'withdrawal', 'Lama proses penarikan (hari kerja)'),
  ('withdrawal_free_plans_monthly_only', 'true', 'withdrawal', 'Paket gratis hanya bisa tarik bulanan'),
  ('escrow_release_days', '7', 'escrow', 'Hari setelah pesanan selesai sebelum dana dilepas ke saldo toko'),
  ('verification_required', 'true', 'verification', 'Wajib verifikasi KTP sebelum toko aktif'),
  ('verification_re_verify_years', '2', 'verification', 'Re-verifikasi setiap berapa tahun'),
  ('payment_gateway_active', 'manual', 'payment', 'Gateway aktif: midtrans, xendit, manual, atau both'),
  ('midtrans_environment', 'sandbox', 'payment', 'sandbox atau production'),
  ('xendit_environment', 'test', 'payment', 'test atau live')
ON CONFLICT (key) DO NOTHING;

-- Encrypted secret slots (value_encrypted will be filled by Super Admin via UI)
INSERT INTO public.platform_settings (key, is_encrypted, category, description) VALUES
  ('midtrans_server_key', true, 'payment', 'Midtrans Server Key'),
  ('midtrans_client_key', true, 'payment', 'Midtrans Client Key'),
  ('xendit_secret_key', true, 'payment', 'Xendit Secret API Key'),
  ('xendit_webhook_token', true, 'payment', 'Xendit Webhook Verification Token')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. shop_verifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  ktp_url TEXT NOT NULL,
  ktp_full_name TEXT,
  ktp_number TEXT,
  selfie_ktp_url TEXT,
  npwp_url TEXT,
  business_license_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_review','approved','rejected','expired')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_verifications_shop_id ON public.shop_verifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_verifications_status ON public.shop_verifications(status);

ALTER TABLE public.shop_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY shop_verifications_owner_read
  ON public.shop_verifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_verifications.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY shop_verifications_owner_insert
  ON public.shop_verifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_verifications.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY shop_verifications_owner_update_pending
  ON public.shop_verifications FOR UPDATE TO authenticated
  USING (status IN ('rejected','expired') AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_verifications.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_verifications.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY shop_verifications_super_admin_all
  ON public.shop_verifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER shop_verifications_updated_at
  BEFORE UPDATE ON public.shop_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Extend coffee_shops with marketplace columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS business_category_id UUID REFERENCES public.business_categories(id),
  ADD COLUMN IF NOT EXISTS marketplace_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','in_review','approved','rejected','expired')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_sales_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gmv NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate_override NUMERIC(5,4);

-- Default existing shops to fnb category
UPDATE public.coffee_shops
  SET business_category_id = (SELECT id FROM public.business_categories WHERE slug = 'fnb' LIMIT 1)
  WHERE business_category_id IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Extend menu_items with marketplace columns + create products view
-- ----------------------------------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS compare_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS stock INTEGER,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS is_digital BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS digital_file_url TEXT,
  ADD COLUMN IF NOT EXISTS digital_file_name TEXT,
  ADD COLUMN IF NOT EXISTS is_pre_order BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_order_days INTEGER,
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_sold INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

-- Backward-compat alias view
CREATE OR REPLACE VIEW public.products AS
  SELECT
    id, shop_id, category_id AS product_category_id,
    name, slug, description, price, compare_price, cost_price, sku,
    weight_grams, length_cm, width_cm, height_cm,
    stock, low_stock_threshold,
    is_digital, digital_file_url, digital_file_name,
    is_pre_order, pre_order_days,
    images, video_url, attributes, tags,
    is_available, is_featured, sort_order,
    total_sold, total_views, average_rating, review_count,
    track_stock, recipe_yield, image_url,
    created_at, updated_at
  FROM public.menu_items;

-- ----------------------------------------------------------------------------
-- 6. Seed features catalog + default plans + plan_features
-- ----------------------------------------------------------------------------
INSERT INTO public.features (key, name, description, category, sort_order) VALUES
  -- Catalog
  ('max_products', 'Batas Produk', 'Jumlah maksimum produk aktif', 'catalog', 10),
  ('max_categories_product', 'Batas Kategori Produk', 'Jumlah maksimum kategori produk', 'catalog', 11),
  ('product_variants', 'Variasi Produk', 'Ukuran, warna, dan variasi lain', 'catalog', 12),
  ('digital_products', 'Produk Digital', 'Upload dan jual file digital', 'catalog', 13),
  ('bulk_import_csv', 'Import CSV', 'Import produk via file CSV', 'catalog', 14),
  ('product_videos', 'Video Produk', 'Upload video produk', 'catalog', 15),
  ('pre_order', 'Pre-Order', 'Mode pre-order produk', 'catalog', 16),
  ('max_images_per_product', 'Foto per Produk', 'Batas foto per produk', 'catalog', 17),
  -- Storefront
  ('custom_domain', 'Custom Domain', 'Hubungkan domain sendiri', 'storefront', 20),
  ('premium_themes', 'Tema Premium', 'Akses tema berbayar', 'storefront', 21),
  ('custom_css', 'Custom CSS', 'Edit CSS kustom', 'storefront', 22),
  ('remove_watermark', 'Hapus Watermark', 'Hilangkan watermark platform', 'storefront', 23),
  ('announcement_bar', 'Announcement Bar', 'Bar pengumuman di toko', 'storefront', 24),
  -- Sales
  ('max_orders_per_month', 'Pesanan per Bulan', 'Batas pesanan per bulan', 'sales', 30),
  ('payment_gateway_online', 'Pembayaran Online', 'Terima pembayaran online otomatis', 'sales', 31),
  ('cod_payment', 'COD', 'Bayar di tempat', 'sales', 32),
  ('promo_codes', 'Kode Promo', 'Buat kode promo / diskon', 'sales', 33),
  ('flash_sale', 'Flash Sale', 'Flash sale waktu terbatas', 'sales', 34),
  ('commission_rate', 'Komisi Platform', 'Persentase komisi (override paket)', 'sales', 35),
  -- Shipping
  ('shipping_management', 'Manajemen Pengiriman', 'Atur kurir & ongkir', 'shipping', 40),
  ('courier_api_integration', 'Integrasi API Kurir', 'Ongkir & resi otomatis', 'shipping', 41),
  ('free_shipping_promo', 'Promo Gratis Ongkir', 'Program gratis ongkir', 'shipping', 42),
  -- F&B
  ('pos_system', 'POS Kasir', 'Aplikasi kasir', 'fnb', 50),
  ('kds_display', 'Kitchen Display', 'KDS dapur', 'fnb', 51),
  -- Withdrawal
  ('withdrawal_anytime', 'Tarik Dana Kapan Saja', 'Bukan hanya bulanan', 'finance', 60),
  ('multi_warehouse', 'Multi Gudang', 'Beberapa lokasi gudang', 'finance', 61)
ON CONFLICT (key) DO NOTHING;

-- Seed default plans
INSERT INTO public.plans (code, name, price_idr, duration_days, sort_order, is_active) VALUES
  ('free', 'Gratis', 0, 30, 1, true),
  ('starter', 'Starter', 99000, 30, 2, true),
  ('growth', 'Growth', 299000, 30, 3, true),
  ('pro', 'Pro', 599000, 30, 4, true)
ON CONFLICT (code) DO NOTHING;

-- Seed plan_features matrix for the 4 default plans
DO $$
DECLARE
  free_id UUID := (SELECT id FROM public.plans WHERE code = 'free');
  starter_id UUID := (SELECT id FROM public.plans WHERE code = 'starter');
  growth_id UUID := (SELECT id FROM public.plans WHERE code = 'growth');
  pro_id UUID := (SELECT id FROM public.plans WHERE code = 'pro');
BEGIN
  -- Helper insert (boolean as limit_value 1=true 0=false; numeric in meta)
  -- Free plan
  INSERT INTO public.plan_features (plan_id, feature_key, limit_value, meta) VALUES
    (free_id, 'max_products', 10, '{}'),
    (free_id, 'max_categories_product', 3, '{}'),
    (free_id, 'max_images_per_product', 3, '{}'),
    (free_id, 'max_orders_per_month', 30, '{}'),
    (free_id, 'commission_rate', NULL, '{"rate":0.10}'),
    (free_id, 'shipping_management', 1, '{}'),
    -- Starter
    (starter_id, 'max_products', 50, '{}'),
    (starter_id, 'max_categories_product', 10, '{}'),
    (starter_id, 'max_images_per_product', 5, '{}'),
    (starter_id, 'max_orders_per_month', 200, '{}'),
    (starter_id, 'product_variants', 1, '{}'),
    (starter_id, 'pre_order', 1, '{}'),
    (starter_id, 'announcement_bar', 1, '{}'),
    (starter_id, 'payment_gateway_online', 1, '{}'),
    (starter_id, 'promo_codes', 1, '{}'),
    (starter_id, 'commission_rate', NULL, '{"rate":0.07}'),
    (starter_id, 'shipping_management', 1, '{}'),
    (starter_id, 'free_shipping_promo', 1, '{}'),
    (starter_id, 'pos_system', 1, '{}'),
    -- Growth
    (growth_id, 'max_products', 200, '{}'),
    (growth_id, 'max_categories_product', 30, '{}'),
    (growth_id, 'max_images_per_product', 10, '{}'),
    (growth_id, 'max_orders_per_month', 1000, '{}'),
    (growth_id, 'product_variants', 1, '{}'),
    (growth_id, 'digital_products', 1, '{}'),
    (growth_id, 'bulk_import_csv', 1, '{}'),
    (growth_id, 'product_videos', 1, '{}'),
    (growth_id, 'pre_order', 1, '{}'),
    (growth_id, 'announcement_bar', 1, '{}'),
    (growth_id, 'custom_domain', 1, '{}'),
    (growth_id, 'premium_themes', 1, '{}'),
    (growth_id, 'remove_watermark', 1, '{}'),
    (growth_id, 'payment_gateway_online', 1, '{}'),
    (growth_id, 'cod_payment', 1, '{}'),
    (growth_id, 'promo_codes', 1, '{}'),
    (growth_id, 'flash_sale', 1, '{}'),
    (growth_id, 'commission_rate', NULL, '{"rate":0.05}'),
    (growth_id, 'shipping_management', 1, '{}'),
    (growth_id, 'courier_api_integration', 1, '{}'),
    (growth_id, 'free_shipping_promo', 1, '{}'),
    (growth_id, 'pos_system', 1, '{}'),
    (growth_id, 'kds_display', 1, '{}'),
    (growth_id, 'withdrawal_anytime', 1, '{}'),
    -- Pro
    (pro_id, 'max_products', NULL, '{"unlimited":true}'),
    (pro_id, 'max_categories_product', NULL, '{"unlimited":true}'),
    (pro_id, 'max_images_per_product', 20, '{}'),
    (pro_id, 'max_orders_per_month', NULL, '{"unlimited":true}'),
    (pro_id, 'product_variants', 1, '{}'),
    (pro_id, 'digital_products', 1, '{}'),
    (pro_id, 'bulk_import_csv', 1, '{}'),
    (pro_id, 'product_videos', 1, '{}'),
    (pro_id, 'pre_order', 1, '{}'),
    (pro_id, 'announcement_bar', 1, '{}'),
    (pro_id, 'custom_domain', 1, '{}'),
    (pro_id, 'premium_themes', 1, '{}'),
    (pro_id, 'custom_css', 1, '{}'),
    (pro_id, 'remove_watermark', 1, '{}'),
    (pro_id, 'payment_gateway_online', 1, '{}'),
    (pro_id, 'cod_payment', 1, '{}'),
    (pro_id, 'promo_codes', 1, '{}'),
    (pro_id, 'flash_sale', 1, '{}'),
    (pro_id, 'commission_rate', NULL, '{"rate":0.03}'),
    (pro_id, 'shipping_management', 1, '{}'),
    (pro_id, 'courier_api_integration', 1, '{}'),
    (pro_id, 'free_shipping_promo', 1, '{}'),
    (pro_id, 'pos_system', 1, '{}'),
    (pro_id, 'kds_display', 1, '{}'),
    (pro_id, 'withdrawal_anytime', 1, '{}'),
    (pro_id, 'multi_warehouse', 1, '{}')
  ON CONFLICT DO NOTHING;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Storage bucket for verification documents (private)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-verifications', 'shop-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Owner can upload/read files under {shop_id}/...
CREATE POLICY shop_verifications_storage_owner_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'shop-verifications'
    AND EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY shop_verifications_storage_owner_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-verifications'
    AND EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY shop_verifications_storage_super_admin
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'shop-verifications'
    AND public.has_role(auth.uid(), 'super_admin'::app_role)
  );
