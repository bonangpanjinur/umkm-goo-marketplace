ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.expiry_reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience TEXT NOT NULL CHECK (audience IN ('trial','paid')),
  days_before INT NOT NULL CHECK (days_before >= 0 AND days_before <= 90),
  channels TEXT[] NOT NULL DEFAULT ARRAY['inapp']::TEXT[],
  template_subject TEXT NOT NULL,
  template_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audience, days_before)
);

ALTER TABLE public.expiry_reminder_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_expiry_rules" ON public.expiry_reminder_rules;
CREATE POLICY "super_admin_all_expiry_rules"
ON public.expiry_reminder_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS update_expiry_reminder_rules_updated_at ON public.expiry_reminder_rules;
CREATE TRIGGER update_expiry_reminder_rules_updated_at
BEFORE UPDATE ON public.expiry_reminder_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.expiry_reminder_rules (audience, days_before, channels, template_subject, template_body, sort_order) VALUES
('trial', 3, ARRAY['inapp','email'], 'Masa trial {{shop_name}} habis dalam 3 hari', 'Halo {{owner_name}}, masa trial paket {{plan_name}} untuk toko {{shop_name}} akan berakhir dalam {{days_left}} hari ({{expires_at}}). Upgrade sekarang agar tidak kehilangan akses fitur Pro: {{renewal_url}}', 1),
('trial', 1, ARRAY['inapp','email','whatsapp'], 'BESOK: Trial {{shop_name}} berakhir', 'Halo {{owner_name}}, ini hari terakhir masa trial paket {{plan_name}} untuk {{shop_name}}. Setelah {{expires_at}} fitur Pro akan dinonaktifkan. Upgrade: {{renewal_url}}', 2),
('paid', 7, ARRAY['inapp'], 'Paket {{plan_name}} {{shop_name}} habis dalam 7 hari', 'Halo {{owner_name}}, paket {{plan_name}} untuk {{shop_name}} akan berakhir pada {{expires_at}} ({{days_left}} hari lagi). Perpanjang sekarang: {{renewal_url}}', 1),
('paid', 3, ARRAY['inapp','email'], 'Paket {{shop_name}} habis dalam 3 hari', 'Paket {{plan_name}} untuk {{shop_name}} berakhir dalam {{days_left}} hari ({{expires_at}}). Perpanjang: {{renewal_url}}', 2),
('paid', 1, ARRAY['inapp','email','whatsapp'], 'BESOK: Paket {{shop_name}} habis', 'Paket {{plan_name}} untuk {{shop_name}} berakhir besok ({{expires_at}}). Setelahnya akan masuk masa grace period. Perpanjang: {{renewal_url}}', 3)
ON CONFLICT (audience, days_before) DO NOTHING;