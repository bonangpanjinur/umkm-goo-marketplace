
-- Version history for page_layouts
CREATE TABLE IF NOT EXISTS public.page_layout_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES public.page_layouts(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL,
  puck_data JSONB NOT NULL,
  title TEXT,
  is_published_snapshot BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_layout_versions_layout ON public.page_layout_versions(layout_id, created_at DESC);

ALTER TABLE public.page_layout_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their layout versions"
ON public.page_layout_versions FOR ALL
USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

-- Storage bucket for builder uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('builder-assets', 'builder-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Builder assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'builder-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Shop owners upload builder assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'builder-assets'
    AND EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Shop owners update builder assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'builder-assets'
    AND EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Shop owners delete builder assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'builder-assets'
    AND EXISTS (
      SELECT 1 FROM public.coffee_shops s
      WHERE s.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = s.id::text
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
