ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS longitude numeric;

CREATE INDEX IF NOT EXISTS shops_geo_idx
  ON public.shops (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE OR REPLACE FUNCTION public.shops_nearby(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 10,
  _limit integer DEFAULT 50,
  _category_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  tagline text,
  logo_url text,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  business_category_id uuid,
  rating_avg numeric,
  review_count integer,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id, s.slug, s.name, s.tagline, s.logo_url,
    s.address, s.city, s.latitude, s.longitude, s.business_category_id,
    s.rating_avg, s.review_count,
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(s.latitude::float8))
          * cos(radians(s.longitude::float8) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(s.latitude::float8))
        ))
      )
    ) AS distance_km
  FROM public.shops s
  WHERE s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND COALESCE(s.is_active, true) = true
    AND COALESCE(s.marketplace_visible, true) = true
    AND (_category_id IS NULL OR s.business_category_id = _category_id)
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(s.latitude::float8))
          * cos(radians(s.longitude::float8) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(s.latitude::float8))
        ))
      )
    ) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.shops_nearby(double precision, double precision, double precision, integer, uuid) TO anon, authenticated;