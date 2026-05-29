
-- 1. Fix broken helper functions referencing non-existent coffee_shops
CREATE OR REPLACE FUNCTION public.user_belongs_to_shop(_user_id uuid, _shop_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.shops WHERE id = _shop_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.staff_permissions WHERE shop_id = _shop_id AND user_id = _user_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_outlet_access(_user_id uuid, _outlet_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.outlets o
    JOIN public.shops s ON s.id = o.shop_id
    WHERE o.id = _outlet_id
      AND (
        s.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles r
          WHERE r.user_id = _user_id
            AND r.role IN ('cashier','barista','owner')
            AND (r.outlet_id = o.id OR r.shop_id = s.id)
        )
      )
  )
$function$;

-- 2. booking_reschedule_tokens: remove anon public read; token lookups must go via edge function/server fn
DROP POLICY IF EXISTS reschedule_tokens_public_read ON public.booking_reschedule_tokens;

-- 3. freelance_contracts: remove permissive public read & public sign
DROP POLICY IF EXISTS public_read_contract_by_token ON public.freelance_contracts;
DROP POLICY IF EXISTS public_sign_contract ON public.freelance_contracts;

-- 4. job_deliverables: remove permissive public read by status
DROP POLICY IF EXISTS public_read_job_deliverables_by_token ON public.job_deliverables;

-- 5. staff_invitations: remove anon enumeration; restrict to authenticated invitee only
DROP POLICY IF EXISTS staff_inv_token_read ON public.staff_invitations;
CREATE POLICY staff_inv_token_read ON public.staff_invitations
  FOR SELECT TO authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
    AND lower(email) = lower((auth.jwt() ->> 'email'::text))
  );

-- 6. custom-order-attachments bucket: require first path segment = shop owned by user
DROP POLICY IF EXISTS custom_order_attach_insert ON storage.objects;
CREATE POLICY custom_order_attach_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'custom-order-attachments'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

-- 7. staff-avatars bucket: restrict write/update/delete to shop owner (first path segment = shop_id)
DROP POLICY IF EXISTS "Authenticated users can upload staff avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update staff avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete staff avatars" ON storage.objects;

CREATE POLICY "Shop owners can upload staff avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'staff-avatars'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can update staff avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'staff-avatars'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can delete staff avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'staff-avatars'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );
