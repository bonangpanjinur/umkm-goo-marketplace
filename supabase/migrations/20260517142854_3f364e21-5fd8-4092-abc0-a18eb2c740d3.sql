-- Buckets for new Fase A/B UI features
INSERT INTO storage.buckets (id, name, public) VALUES
  ('treatment-photos', 'treatment-photos', true),
  ('studio-galleries', 'studio-galleries', true),
  ('rental-inspections', 'rental-inspections', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for these buckets
CREATE POLICY "public read treatment-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'treatment-photos');

CREATE POLICY "public read studio-galleries"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-galleries');

CREATE POLICY "public read rental-inspections"
ON storage.objects FOR SELECT
USING (bucket_id = 'rental-inspections');

-- Owner-scoped writes: first path segment must be a shop id owned by user
CREATE POLICY "owner upload treatment-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'treatment-photos'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);
CREATE POLICY "owner update treatment-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'treatment-photos'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);
CREATE POLICY "owner delete treatment-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'treatment-photos'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);

CREATE POLICY "owner upload studio-galleries"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-galleries'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);
CREATE POLICY "owner update studio-galleries"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'studio-galleries'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);
CREATE POLICY "owner delete studio-galleries"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'studio-galleries'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);

CREATE POLICY "owner upload rental-inspections"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rental-inspections'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);
CREATE POLICY "owner update rental-inspections"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rental-inspections'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);
CREATE POLICY "owner delete rental-inspections"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'rental-inspections'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.shops WHERE owner_id = auth.uid())
);