-- 1. Seed kategori baru
INSERT INTO public.business_categories (slug, name, sort_order, is_active)
VALUES ('sales-jasa-profesional', 'Sales & Layanan Profesional', 100, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Sub-tipe di coffee_shops
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS business_subtype TEXT;

-- 3. Tabel umroh_packages
CREATE TABLE IF NOT EXISTS public.umroh_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  departure_date DATE,
  return_date DATE,
  duration_days INT,
  hotel_makkah TEXT,
  hotel_madinah TEXT,
  airline TEXT,
  room_type TEXT,
  price_quad NUMERIC(14,2),
  price_triple NUMERIC(14,2),
  price_double NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'IDR',
  includes TEXT[] DEFAULT ARRAY[]::TEXT[],
  excludes TEXT[] DEFAULT ARRAY[]::TEXT[],
  cover_image_url TEXT,
  brochure_pdf_url TEXT,
  quota_total INT,
  quota_filled INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_umroh_packages_shop ON public.umroh_packages(shop_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.umroh_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  icon TEXT NOT NULL DEFAULT 'Star',
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_umroh_facilities_shop ON public.umroh_facilities(shop_id, sort_order);

CREATE TABLE IF NOT EXISTS public.umroh_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_umroh_faqs_shop ON public.umroh_faqs(shop_id, category, sort_order);

CREATE TABLE IF NOT EXISTS public.flyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  file_url TEXT,
  linked_id UUID,
  linked_type TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flyers_shop ON public.flyers(shop_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.sales_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_desc TEXT,
  long_desc TEXT,
  price_label TEXT,
  cover_image_url TEXT,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_offerings_shop ON public.sales_offerings(shop_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_or_trip TEXT,
  quote TEXT NOT NULL,
  photo_url TEXT,
  rating SMALLINT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_testimonials_shop ON public.testimonials(shop_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'sales_inquiry',
  linked_id UUID,
  linked_type TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_shop ON public.leads(shop_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shop_about (
  shop_id UUID PRIMARY KEY REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  story TEXT,
  vision TEXT,
  certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  team JSONB NOT NULL DEFAULT '[]'::jsonb,
  credentials JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_umroh_packages_updated BEFORE UPDATE ON public.umroh_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_umroh_facilities_updated BEFORE UPDATE ON public.umroh_facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_umroh_faqs_updated BEFORE UPDATE ON public.umroh_faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_flyers_updated BEFORE UPDATE ON public.flyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_offerings_updated BEFORE UPDATE ON public.sales_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_shop_about_updated BEFORE UPDATE ON public.shop_about FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.umroh_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umroh_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umroh_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_about ENABLE ROW LEVEL SECURITY;

CREATE POLICY "umroh_packages public read" ON public.umroh_packages FOR SELECT USING (true);
CREATE POLICY "umroh_packages owner all" ON public.umroh_packages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "umroh_facilities public read" ON public.umroh_facilities FOR SELECT USING (true);
CREATE POLICY "umroh_facilities owner all" ON public.umroh_facilities FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "umroh_faqs public read" ON public.umroh_faqs FOR SELECT USING (true);
CREATE POLICY "umroh_faqs owner all" ON public.umroh_faqs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "flyers public read" ON public.flyers FOR SELECT USING (true);
CREATE POLICY "flyers owner all" ON public.flyers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "sales_offerings public read" ON public.sales_offerings FOR SELECT USING (true);
CREATE POLICY "sales_offerings owner all" ON public.sales_offerings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "testimonials public read" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "testimonials owner all" ON public.testimonials FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "leads public insert" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads owner read" ON public.leads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE POLICY "leads owner update" ON public.leads FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));
CREATE POLICY "leads owner delete" ON public.leads FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "shop_about public read" ON public.shop_about FOR SELECT USING (true);
CREATE POLICY "shop_about owner all" ON public.shop_about FOR ALL
  USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('flyers', 'flyers', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('umroh-brochures', 'umroh-brochures', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "flyers public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'flyers');
CREATE POLICY "flyers owner write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'flyers'
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid())
  );
CREATE POLICY "flyers owner update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'flyers'
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid())
  );
CREATE POLICY "flyers owner delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'flyers'
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid())
  );

CREATE POLICY "brochures public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'umroh-brochures');
CREATE POLICY "brochures owner write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'umroh-brochures'
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid())
  );
CREATE POLICY "brochures owner update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'umroh-brochures'
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid())
  );
CREATE POLICY "brochures owner delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'umroh-brochures'
    AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid())
  );