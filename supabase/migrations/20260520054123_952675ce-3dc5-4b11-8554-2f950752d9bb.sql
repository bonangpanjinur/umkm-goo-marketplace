-- Alias views untuk kompatibilitas dengan function/script lama yang masih
-- mereferensi nama tabel sebelumnya. Updatable views (single-table simple SELECT)
-- otomatis mendukung INSERT/UPDATE/DELETE di PostgreSQL.

DROP VIEW IF EXISTS public.coffee_shops CASCADE;
CREATE VIEW public.coffee_shops AS SELECT * FROM public.shops;
ALTER VIEW public.coffee_shops OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_shops TO authenticated, service_role;
GRANT SELECT ON public.coffee_shops TO anon;

DROP VIEW IF EXISTS public.shops__bootstrap_placeholder CASCADE;
CREATE VIEW public.shops__bootstrap_placeholder AS SELECT * FROM public.shops;
ALTER VIEW public.shops__bootstrap_placeholder OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops__bootstrap_placeholder TO authenticated, service_role;
GRANT SELECT ON public.shops__bootstrap_placeholder TO anon;