ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_staff_members_user ON public.staff_members(user_id);
UPDATE public.staff_members sm
SET user_id = ur.user_id
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE sm.user_id IS NULL
  AND ur.shop_id = sm.shop_id
  AND lower(p.display_name) = lower(sm.name);