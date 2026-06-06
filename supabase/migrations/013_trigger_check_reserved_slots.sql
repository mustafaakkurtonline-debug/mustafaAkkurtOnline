-- Trigger fonksiyonunu güncelle: appointments çakışmasına ek olarak
-- reserved_slots (sabit müşteri) çakışmasını da DB seviyesinde engelle.
-- Eski cache'li müşteriler de bu katmandan korunur.
CREATE OR REPLACE FUNCTION check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
  new_end   time;
  svc_mins  integer;
BEGIN
  SELECT duration_minutes INTO svc_mins FROM services WHERE id = NEW.service_id;
  IF svc_mins IS NULL THEN RETURN NEW; END IF;

  new_end := (NEW.appointment_time + make_interval(mins => svc_mins))::time;

  -- 1. Diğer randevularla çakışma kontrolü
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

  -- 2. Sabit müşteri slotlarıyla çakışma kontrolü
  -- DB day_of_week: 0=Pzt…6=Paz  —  PG DOW: 0=Paz,1=Pzt…6=Cmt
  -- Dönüşüm: (PG_DOW + 6) % 7  →  JS jsToDbDayOfWeek ile aynı formül
  IF EXISTS (
    SELECT 1
    FROM reserved_slots rs
    WHERE rs.is_active = true
      AND rs.day_of_week = (EXTRACT(DOW FROM NEW.appointment_date)::integer + 6) % 7
      AND rs.start_date <= NEW.appointment_date
      AND (rs.end_date IS NULL OR rs.end_date >= NEW.appointment_date)
      AND NEW.appointment_time < (rs.slot_time + make_interval(mins => rs.duration_minutes))::time
      AND new_end > rs.slot_time
  ) THEN
    RAISE EXCEPTION 'Bu saat araligi dolu.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
