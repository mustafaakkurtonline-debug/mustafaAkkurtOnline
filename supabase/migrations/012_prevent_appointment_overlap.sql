-- Randevu aralığı çakışmasını DB seviyesinde engelle.
-- Frontend ne olursa olsun (eski cache, race condition) çakışan randevu kaydedilmez.
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end   time;
  svc_mins  integer;
BEGIN
  SELECT duration_minutes INTO svc_mins FROM services WHERE id = NEW.service_id;
  IF svc_mins IS NULL THEN RETURN NEW; END IF;

  new_end := (NEW.appointment_time + make_interval(mins => svc_mins))::time;

  IF EXISTS (
    SELECT 1
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.appointment_date = NEW.appointment_date
      AND a.status IN ('pending', 'confirmed')
      AND a.id <> NEW.id
      AND NEW.appointment_time < (a.appointment_time + make_interval(mins => s.duration_minutes))::time
      AND new_end > a.appointment_time
  ) THEN
    RAISE EXCEPTION 'Bu saat araligi dolu.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER prevent_appointment_overlap
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'confirmed'))
  EXECUTE FUNCTION check_appointment_overlap();
