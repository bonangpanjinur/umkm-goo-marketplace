CREATE TABLE IF NOT EXISTS public.buyer_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  channel text NOT NULL DEFAULT 'in_app',
  sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_broadcasts_admin_all"
ON public.buyer_broadcasts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));