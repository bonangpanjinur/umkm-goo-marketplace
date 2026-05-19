-- Allow owner to insert their own owner role on a shop they own,
-- and allow owners to add staff roles for their shop.
CREATE POLICY "user_roles_owner_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  shop_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = user_roles.shop_id
      AND s.owner_id = auth.uid()
  )
);

-- Allow owner to update staff roles in their shop (e.g. is_active toggles)
CREATE POLICY "user_roles_owner_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  shop_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = user_roles.shop_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  shop_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = user_roles.shop_id
      AND s.owner_id = auth.uid()
  )
);