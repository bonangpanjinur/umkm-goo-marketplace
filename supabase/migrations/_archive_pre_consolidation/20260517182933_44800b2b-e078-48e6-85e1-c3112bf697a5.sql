ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS watermark_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.studio_photographers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'photographer',
  color text NOT NULL DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_photographers_shop ON public.studio_photographers(shop_id);

ALTER TABLE public.studio_photographers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photographers_owner_all" ON public.studio_photographers;
CREATE POLICY "photographers_owner_all" ON public.studio_photographers
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "photographers_staff_read" ON public.studio_photographers;
CREATE POLICY "photographers_staff_read" ON public.studio_photographers
  FOR SELECT TO authenticated
  USING (
    shop_id IN (
      SELECT shop_id FROM public.staff_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP TRIGGER IF EXISTS trg_photographers_updated_at ON public.studio_photographers;
CREATE TRIGGER trg_photographers_updated_at
  BEFORE UPDATE ON public.studio_photographers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.studio_galleries
  ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES public.studio_photographers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_galleries_photographer ON public.studio_galleries(photographer_id);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES public.studio_photographers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_photographer ON public.bookings(photographer_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-watermarks', 'studio-watermarks', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "watermarks_public_read" ON storage.objects;
CREATE POLICY "watermarks_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'studio-watermarks');

DROP POLICY IF EXISTS "watermarks_owner_write" ON storage.objects;
CREATE POLICY "watermarks_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'studio-watermarks' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "watermarks_owner_update" ON storage.objects;
CREATE POLICY "watermarks_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'studio-watermarks' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "watermarks_owner_delete" ON storage.objects;
CREATE POLICY "watermarks_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'studio-watermarks' AND
    (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
  );
