-- 1) Validate shift no overlap (BEFORE INSERT/UPDATE on shifts)
CREATE OR REPLACE FUNCTION public.validate_shift_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict RECORD;
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'shift_invalid_range: jam selesai harus setelah jam mulai';
  END IF;

  SELECT s.id, s.start_time, s.end_time
    INTO v_conflict
    FROM public.shifts s
   WHERE s.shop_id = NEW.shop_id
     AND s.user_id = NEW.user_id
     AND s.day_of_week = NEW.day_of_week
     AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND s.start_time < NEW.end_time
     AND s.end_time   > NEW.start_time
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'shift_overlap: bentrok dengan shift % – %',
      to_char(v_conflict.start_time, 'HH24:MI'),
      to_char(v_conflict.end_time, 'HH24:MI');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_shift_no_overlap ON public.shifts;
CREATE TRIGGER trg_validate_shift_no_overlap
BEFORE INSERT OR UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.validate_shift_no_overlap();

-- 2) Audit log shift changes
CREATE OR REPLACE FUNCTION public.log_shift_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_shop uuid;
  v_target uuid;
  v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'shift_create';
    v_shop := NEW.shop_id;
    v_target := NEW.user_id;
    v_meta := jsonb_build_object(
      'shift_id', NEW.id,
      'day_of_week', NEW.day_of_week,
      'outlet_id', NEW.outlet_id,
      'after', jsonb_build_object('start_time', NEW.start_time, 'end_time', NEW.end_time, 'note', NEW.note)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'shift_update';
    v_shop := NEW.shop_id;
    v_target := NEW.user_id;
    v_meta := jsonb_build_object(
      'shift_id', NEW.id,
      'day_of_week', NEW.day_of_week,
      'outlet_id', NEW.outlet_id,
      'before', jsonb_build_object('start_time', OLD.start_time, 'end_time', OLD.end_time, 'outlet_id', OLD.outlet_id, 'note', OLD.note),
      'after',  jsonb_build_object('start_time', NEW.start_time, 'end_time', NEW.end_time, 'outlet_id', NEW.outlet_id, 'note', NEW.note)
    );
  ELSE
    v_action := 'shift_delete';
    v_shop := OLD.shop_id;
    v_target := OLD.user_id;
    v_meta := jsonb_build_object(
      'shift_id', OLD.id,
      'day_of_week', OLD.day_of_week,
      'outlet_id', OLD.outlet_id,
      'before', jsonb_build_object('start_time', OLD.start_time, 'end_time', OLD.end_time, 'note', OLD.note)
    );
  END IF;

  INSERT INTO public.staff_audit_logs (shop_id, actor_id, target_user_id, action, meta)
  VALUES (v_shop, auth.uid(), v_target, v_action, v_meta);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_shift_change ON public.shifts;
CREATE TRIGGER trg_log_shift_change
AFTER INSERT OR UPDATE OR DELETE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.log_shift_change();