
-- Per-shop scheduling override
CREATE TABLE IF NOT EXISTS public.expiry_reminder_shop_settings (
  shop_id UUID PRIMARY KEY REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  override_schedule BOOLEAN NOT NULL DEFAULT FALSE,
  override_rules BOOLEAN NOT NULL DEFAULT FALSE,
  send_hour_local INT NOT NULL DEFAULT 9 CHECK (send_hour_local >= 0 AND send_hour_local <= 23),
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  max_per_shop_per_day INT NOT NULL DEFAULT 2 CHECK (max_per_shop_per_day >= 1 AND max_per_shop_per_day <= 20),
  on_expiry_action TEXT NOT NULL DEFAULT 'grace_then_suspend' CHECK (on_expiry_action IN ('none','suspend','grace_then_suspend')),
  grace_days INT NOT NULL DEFAULT 3 CHECK (grace_days >= 0 AND grace_days <= 90),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expiry_reminder_shop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_shop_reminder_settings" ON public.expiry_reminder_shop_settings;
CREATE POLICY "super_admin_all_shop_reminder_settings"
ON public.expiry_reminder_shop_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "owner_manage_own_shop_reminder_settings" ON public.expiry_reminder_shop_settings;
CREATE POLICY "owner_manage_own_shop_reminder_settings"
ON public.expiry_reminder_shop_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.coffee_shops cs WHERE cs.id = shop_id AND cs.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops cs WHERE cs.id = shop_id AND cs.owner_id = auth.uid()));

DROP TRIGGER IF EXISTS update_expiry_reminder_shop_settings_updated_at ON public.expiry_reminder_shop_settings;
CREATE TRIGGER update_expiry_reminder_shop_settings_updated_at
BEFORE UPDATE ON public.expiry_reminder_shop_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-shop rule overrides
CREATE TABLE IF NOT EXISTS public.expiry_reminder_shop_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('trial','paid')),
  days_before INT NOT NULL CHECK (days_before >= 0 AND days_before <= 90),
  channels TEXT[] NOT NULL DEFAULT ARRAY['inapp']::TEXT[],
  template_subject TEXT NOT NULL,
  template_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, audience, days_before)
);

CREATE INDEX IF NOT EXISTS idx_expiry_reminder_shop_rules_shop ON public.expiry_reminder_shop_rules(shop_id, audience, is_active);

ALTER TABLE public.expiry_reminder_shop_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_shop_reminder_rules" ON public.expiry_reminder_shop_rules;
CREATE POLICY "super_admin_all_shop_reminder_rules"
ON public.expiry_reminder_shop_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "owner_manage_own_shop_reminder_rules" ON public.expiry_reminder_shop_rules;
CREATE POLICY "owner_manage_own_shop_reminder_rules"
ON public.expiry_reminder_shop_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.coffee_shops cs WHERE cs.id = shop_id AND cs.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops cs WHERE cs.id = shop_id AND cs.owner_id = auth.uid()));

DROP TRIGGER IF EXISTS update_expiry_reminder_shop_rules_updated_at ON public.expiry_reminder_shop_rules;
CREATE TRIGGER update_expiry_reminder_shop_rules_updated_at
BEFORE UPDATE ON public.expiry_reminder_shop_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Refactor v2 to honor per-shop overrides
CREATE OR REPLACE FUNCTION public.run_expiry_reminders_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shop_row RECORD;
  rule_row RECORD;
  total_sent integer := 0;
  total_skipped integer := 0;
  use_override boolean;
  audience_now text;
  days_diff integer;
BEGIN
  FOR shop_row IN
    SELECT cs.id, cs.name, cs.owner_id, cs.plan_expires_at, cs.trial_ends_at,
           COALESCE(p.code,'free') AS plan_code, COALESCE(p.name,'Free') AS plan_name,
           COALESCE(s.override_rules, FALSE) AS override_rules
    FROM public.coffee_shops cs
    LEFT JOIN public.plans p ON p.id = cs.plan_id
    LEFT JOIN public.expiry_reminder_shop_settings s ON s.shop_id = cs.id
    WHERE cs.plan_expires_at IS NOT NULL OR cs.trial_ends_at IS NOT NULL
  LOOP
    use_override := shop_row.override_rules;

    -- Determine audience per shop
    IF shop_row.trial_ends_at IS NOT NULL AND shop_row.trial_ends_at >= now() THEN
      audience_now := 'trial';
      days_diff := DATE(shop_row.trial_ends_at) - CURRENT_DATE;
    ELSIF shop_row.plan_expires_at IS NOT NULL THEN
      audience_now := 'paid';
      days_diff := DATE(shop_row.plan_expires_at) - CURRENT_DATE;
    ELSE
      CONTINUE;
    END IF;

    IF days_diff < 0 OR days_diff > 90 THEN CONTINUE; END IF;

    FOR rule_row IN
      SELECT * FROM (
        SELECT id, audience, days_before, channels, template_subject, template_body, is_active, sort_order
        FROM public.expiry_reminder_shop_rules
        WHERE shop_id = shop_row.id AND is_active = true AND use_override = true
        UNION ALL
        SELECT id, audience, days_before, channels, template_subject, template_body, is_active, sort_order
        FROM public.expiry_reminder_rules
        WHERE is_active = true AND NOT use_override
      ) r
      WHERE r.audience = audience_now AND r.days_before = days_diff
    LOOP
      BEGIN
        INSERT INTO public.notifications (shop_id, recipient_user_id, title, body, severity, category)
        VALUES (
          shop_row.id,
          shop_row.owner_id,
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_subject,'Paket akan habis'),
            '{{shop_name}}', shop_row.name),
            '{{plan_name}}', shop_row.plan_name),
            '{{days_left}}', rule_row.days_before::text),
            '{{expires_at}}', COALESCE(shop_row.plan_expires_at::text, shop_row.trial_ends_at::text)),
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_body,'Paket {{plan_name}} berakhir {{days_left}} hari lagi'),
            '{{shop_name}}', shop_row.name),
            '{{plan_name}}', shop_row.plan_name),
            '{{days_left}}', rule_row.days_before::text),
            '{{expires_at}}', COALESCE(shop_row.plan_expires_at::text, shop_row.trial_ends_at::text)),
          'warning',
          'billing'
        );
        total_sent := total_sent + 1;
      EXCEPTION WHEN OTHERS THEN
        total_skipped := total_skipped + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('total_sent', total_sent, 'total_skipped', total_skipped, 'ran_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_expiry_reminders_v2() FROM anon, authenticated;
