CREATE OR REPLACE FUNCTION public.set_order_no()
RETURNS TRIGGER AS $$
DECLARE
  v_date text;
  v_seq int;
BEGIN
  IF NEW.order_no IS NOT NULL AND NEW.order_no <> '' THEN
    RETURN NEW;
  END IF;

  v_date := to_char(COALESCE(NEW.business_date, (now() AT TIME ZONE 'Asia/Jakarta')::date), 'YYYYMMDD');

  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no, '^.*-', ''), '')::int), 0) + 1
    INTO v_seq
  FROM public.orders
  WHERE outlet_id = NEW.outlet_id
    AND business_date = COALESCE(NEW.business_date, (now() AT TIME ZONE 'Asia/Jakarta')::date)
    AND order_no ~ ('^' || v_date || '-[0-9]+$');

  NEW.order_no := v_date || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_order_no ON public.orders;
CREATE TRIGGER trg_set_order_no
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_no();