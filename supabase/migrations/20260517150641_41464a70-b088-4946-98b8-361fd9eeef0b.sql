
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_mode TEXT
  CHECK (order_mode IS NULL OR order_mode IN ('dine_in','takeaway','delivery','online'));

ALTER TABLE public.menu_item_variants
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_attributes
  ON public.menu_item_variants USING GIN (attributes);

CREATE TABLE IF NOT EXISTS public.travel_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.umroh_packages(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1),
  time_label TEXT,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_travel_itineraries_pkg ON public.travel_itineraries(package_id, day_number, sort_order);
ALTER TABLE public.travel_itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members manage itineraries"
  ON public.travel_itineraries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = travel_itineraries.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = travel_itineraries.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "public read itineraries of active packages"
  ON public.travel_itineraries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.umroh_packages p WHERE p.id = travel_itineraries.package_id AND p.is_active = true));

CREATE TRIGGER trg_travel_itineraries_updated
  BEFORE UPDATE ON public.travel_itineraries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.travel_jamaah_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  jamaah_id UUID NOT NULL REFERENCES public.travel_jamaah_manifest(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('paspor','visa','vaksin','ktp','identitas_lain')),
  doc_number TEXT,
  issued_at DATE,
  expiry_date DATE,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jamaah_docs_jamaah ON public.travel_jamaah_documents(jamaah_id);
CREATE INDEX IF NOT EXISTS idx_jamaah_docs_expiry ON public.travel_jamaah_documents(expiry_date) WHERE expiry_date IS NOT NULL;
ALTER TABLE public.travel_jamaah_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members manage jamaah docs"
  ON public.travel_jamaah_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = travel_jamaah_documents.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = travel_jamaah_documents.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER trg_jamaah_docs_updated
  BEFORE UPDATE ON public.travel_jamaah_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.course_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE DEFAULT ('CERT-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cert_user ON public.course_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_course ON public.course_certificates(course_id);
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student reads own cert"
  ON public.course_certificates FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "shop owner reads certs"
  ON public.course_certificates FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = course_certificates.shop_id AND s.owner_id = auth.uid()));
CREATE POLICY "public verify cert"
  ON public.course_certificates FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.fn_issue_course_certificate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_shop_id UUID;
  v_total INT;
  v_done INT;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cm.menu_item_id, mi.shop_id
    INTO v_course_id, v_shop_id
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  JOIN public.menu_items mi ON mi.id = cm.menu_item_id
  WHERE cl.id = NEW.lesson_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.menu_item_id = v_course_id;

  SELECT COUNT(*) INTO v_done
  FROM public.lesson_progress lp
  JOIN public.course_lessons cl ON cl.id = lp.lesson_id
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.menu_item_id = v_course_id
    AND lp.user_id = NEW.user_id
    AND lp.completed_at IS NOT NULL;

  IF v_total > 0 AND v_done >= v_total THEN
    INSERT INTO public.course_certificates (shop_id, course_id, user_id)
    VALUES (v_shop_id, v_course_id, NEW.user_id)
    ON CONFLICT (course_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issue_course_certificate ON public.lesson_progress;
CREATE TRIGGER trg_issue_course_certificate
  AFTER INSERT OR UPDATE OF completed_at ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.fn_issue_course_certificate();
