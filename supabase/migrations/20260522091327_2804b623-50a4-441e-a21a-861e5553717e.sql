-- Phase 1 housekeeping: drop legacy coffee_shops view (kosong dari referensi kode)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='coffee_shops') THEN
    EXECUTE 'DROP VIEW public.coffee_shops';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coffee_shops') THEN
    -- Jika legacy table, biarkan (defensive)
    NULL;
  END IF;
END $$;