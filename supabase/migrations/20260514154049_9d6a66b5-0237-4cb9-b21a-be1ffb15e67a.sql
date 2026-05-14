-- Phase 2: extend staff tables and add audit log
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.staff_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  actor_id uuid,
  target_user_id uuid,
  target_email text,
  target_name text,
  action text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_audit_shop_created
  ON public.staff_audit_logs(shop_id, created_at DESC);

ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view staff audit" ON public.staff_audit_logs;
CREATE POLICY "Owners can view staff audit"
  ON public.staff_audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.coffee_shops c
    WHERE c.id = staff_audit_logs.shop_id AND c.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Owners can insert staff audit" ON public.staff_audit_logs;
CREATE POLICY "Owners can insert staff audit"
  ON public.staff_audit_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.coffee_shops c
    WHERE c.id = staff_audit_logs.shop_id AND c.owner_id = auth.uid()
  ));