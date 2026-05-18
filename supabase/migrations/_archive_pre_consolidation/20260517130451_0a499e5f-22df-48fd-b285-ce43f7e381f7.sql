-- Bucket gambar standar untuk upload UI
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('shop-images', 'shop-images', true),
  ('admin-banners', 'admin-banners', true),
  ('platform-assets', 'platform-assets', true),
  ('umroh-covers', 'umroh-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Helper: cek apakah user adalah owner shop tertentu
CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops WHERE id = _shop_id AND owner_id = _user_id
  );
$$;

-- shop-images: path = "<shop_id>/<filename>"; owner-shop boleh write
DROP POLICY IF EXISTS "shop-images public read" ON storage.objects;
CREATE POLICY "shop-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-images');

DROP POLICY IF EXISTS "shop-images owner write" ON storage.objects;
CREATE POLICY "shop-images owner write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shop-images'
    AND public.is_shop_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "shop-images owner update" ON storage.objects;
CREATE POLICY "shop-images owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND public.is_shop_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "shop-images owner delete" ON storage.objects;
CREATE POLICY "shop-images owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shop-images'
    AND public.is_shop_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- umroh-covers: sama dgn shop-images
DROP POLICY IF EXISTS "umroh-covers public read" ON storage.objects;
CREATE POLICY "umroh-covers public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'umroh-covers');

DROP POLICY IF EXISTS "umroh-covers owner write" ON storage.objects;
CREATE POLICY "umroh-covers owner write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'umroh-covers'
    AND public.is_shop_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "umroh-covers owner update" ON storage.objects;
CREATE POLICY "umroh-covers owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'umroh-covers'
    AND public.is_shop_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "umroh-covers owner delete" ON storage.objects;
CREATE POLICY "umroh-covers owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'umroh-covers'
    AND public.is_shop_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- admin-banners & platform-assets: hanya super_admin yang boleh write
DROP POLICY IF EXISTS "admin-banners public read" ON storage.objects;
CREATE POLICY "admin-banners public read"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('admin-banners', 'platform-assets'));

DROP POLICY IF EXISTS "admin-banners admin write" ON storage.objects;
CREATE POLICY "admin-banners admin write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('admin-banners', 'platform-assets')
    AND public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "admin-banners admin update" ON storage.objects;
CREATE POLICY "admin-banners admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('admin-banners', 'platform-assets')
    AND public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "admin-banners admin delete" ON storage.objects;
CREATE POLICY "admin-banners admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('admin-banners', 'platform-assets')
    AND public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- F-18: Koreksi matriks kapabilitas per kategori (lihat plan Bagian C)
UPDATE public.business_categories
SET enabled_features = ARRAY[
  'POS','MENU','KDS','TABLES','INVENTORY','VARIANTS','RECIPES','COMBO_BUILDER',
  'SUPPLIERS','SHIFTS','RESERVASI','ANTRIAN','WAITLIST',
  'LIMITED_EDITIONS','PRE_ORDERS','CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','FOLLOWUP_REMINDERS'
]
WHERE slug = 'fnb';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'POS','MENU','VARIANTS','INVENTORY','SUPPLIERS','SHIFTS',
  'SIZE_GUIDE','LOOKBOOK','LIMITED_EDITIONS','BUNDLES','PRE_ORDERS'
]
WHERE slug = 'retail';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS',
  'ANTRIAN','WAITLIST','PORTFOLIO','CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','LEADS','TESTIMONIALS'
]
WHERE slug = 'jasa';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'RENTAL','RENTAL_AVAILABILITY','RENTAL_DEPOSIT','RENTAL_FINES',
  'RENTAL_CHECKLIST','RENTAL_TNC','RENTAL_EXTEND','RENTAL_UNIT_READY',
  'LEADS','TESTIMONIALS','PORTFOLIO'
]
WHERE slug = 'rental';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'DIGITAL','DIGITAL_LICENSES','DIGITAL_VERSION','KURSUS',
  'LEADS','TESTIMONIALS','PORTFOLIO'
]
WHERE slug = 'kursus';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS',
  'ANTRIAN','WAITLIST','PORTFOLIO','LOOKBOOK','TESTIMONIALS'
]
WHERE slug = 'salon';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'BOOKING','ANAMNESIS','MEDICAL_INVOICE','PATIENT_RECORDS',
  'ANTRIAN','WAITLIST','FOLLOWUP_REMINDERS','STAFF_PICKER','LEADS','RESERVASI'
]
WHERE slug = 'klinik';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'BOOKING','PORTFOLIO','STUDIO_PACKAGES','STUDIO_DELIVERY','STUDIO_BRIEF',
  'STUDIO_ADDONS','DIGITAL','LEADS','TESTIMONIALS','FLYERS'
]
WHERE slug = 'studio-foto';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'UMROH_PACKAGES','UMROH_FACILITIES','UMROH_FAQ','FLYERS','TESTIMONIALS',
  'LEADS','ABOUT_PAGE','RESERVASI','STAFF_PICKER'
]
WHERE slug = 'travel';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS',
  'JOB_DELIVERABLES','PRE_ORDERS','PORTFOLIO','LEADS','TESTIMONIALS','FLYERS'
]
WHERE slug = 'custom-order';

UPDATE public.business_categories
SET enabled_features = ARRAY[
  'POS','MENU','VARIANTS','INVENTORY','BOOKING','RENTAL','DIGITAL',
  'CUSTOM_ORDER','SHIFTS','ANTRIAN','PORTFOLIO','LEADS','TESTIMONIALS'
]
WHERE slug = 'lainnya';