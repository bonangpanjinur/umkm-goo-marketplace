-- Audit log untuk perubahan status Purchase Order
CREATE TABLE IF NOT EXISTS public.po_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  metadata JSONB,
  actor_id UUID,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_audit_log_po_id ON public.po_audit_log(po_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_audit_log_shop_id ON public.po_audit_log(shop_id, created_at DESC);

ALTER TABLE public.po_audit_log ENABLE ROW LEVEL SECURITY;

-- Owner / staff yang punya akses ke shop bisa baca audit log shop mereka
CREATE POLICY "Shop members can read PO audit log"
  ON public.po_audit_log FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_shop(auth.uid(), shop_id));

-- Hanya owner / staff yang bisa insert
CREATE POLICY "Shop members can insert PO audit log"
  ON public.po_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));