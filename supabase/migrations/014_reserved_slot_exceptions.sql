-- Sabit müşteri slotları için tek tarihe özel istisnalar.
-- new_time NULL  → müşteri o gün gelmiyor, slot o tarihte müşterilere açılır
-- new_time dolu  → slot yalnızca o tarihte new_time saatinde dolu sayılır
CREATE TABLE reserved_slot_exceptions (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  reserved_slot_id uuid        NOT NULL REFERENCES reserved_slots(id) ON DELETE CASCADE,
  exception_date   date        NOT NULL,
  new_time         time,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (reserved_slot_id, exception_date)
);

ALTER TABLE reserved_slot_exceptions ENABLE ROW LEVEL SECURITY;

-- Anon okuyabilir (müşteri tarafındaki slot müsaitlik hesabı için)
CREATE POLICY "reserved_slot_exceptions_public_read"
  ON reserved_slot_exceptions FOR SELECT TO anon, authenticated USING (true);

-- Sadece admin ekleyip silebilir
CREATE POLICY "reserved_slot_exceptions_auth_write"
  ON reserved_slot_exceptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger fonksiyonunu güncelle: sabit slot çakışma kontrolü artık
-- tarihe özel istisnaları da dikkate alır.
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

  -- 2. Sabit müşteri slotlarıyla çakışma kontrolü (istisnalar dahil)
  -- DB day_of_week: 0=Pzt…6=Paz  —  PG DOW: 0=Paz,1=Pzt…6=Cmt
  -- Dönüşüm: (PG_DOW + 6) % 7  →  JS jsToDbDayOfWeek ile aynı formül
  -- İstisna new_time NULL ise slot o gün engellemez;
  -- new_time dolu ise slot o gün yalnızca new_time'da engeller.
  IF EXISTS (
    SELECT 1
    FROM reserved_slots rs
    LEFT JOIN reserved_slot_exceptions ex
      ON ex.reserved_slot_id = rs.id
     AND ex.exception_date   = NEW.appointment_date
    WHERE rs.is_active = true
      AND rs.day_of_week = (EXTRACT(DOW FROM NEW.appointment_date)::integer + 6) % 7
      AND rs.start_date <= NEW.appointment_date
      AND (rs.end_date IS NULL OR rs.end_date >= NEW.appointment_date)
      AND NOT (ex.id IS NOT NULL AND ex.new_time IS NULL)
      AND NEW.appointment_time < (COALESCE(ex.new_time, rs.slot_time) + make_interval(mins => rs.duration_minutes))::time
      AND new_end > COALESCE(ex.new_time, rs.slot_time)
  ) THEN
    RAISE EXCEPTION 'Bu saat araligi dolu.'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
