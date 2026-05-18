-- Allow staff (anyone with a role at the shop) to insert their own audit log entries.
-- Without this, logStaffAction() silently fails when called by staff users,
-- defeating the purpose of staff_audit_logs.

CREATE POLICY "Staff can insert own audit log"
ON public.staff_audit_logs
FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND (
    -- Owner of the shop
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = staff_audit_logs.shop_id AND s.owner_id = auth.uid()
    )
    -- Or registered staff (has a role at this shop)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.shop_id = staff_audit_logs.shop_id
    )
  )
);