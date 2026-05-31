-- Randevu sürelerini de döndür; böylece slot çakışması doğru hesaplanır
-- Örnek: 14:00'da 60 dk randevu → end_time 15:00 → 14:30 slotu da kapalı
CREATE OR REPLACE FUNCTION get_booked_slots(p_date date)
RETURNS TABLE(slot_time time, end_time time)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.appointment_time AS slot_time,
    (a.appointment_time + make_interval(mins => s.duration_minutes))::time AS end_time
  FROM appointments a
  JOIN services s ON a.service_id = s.id
  WHERE a.appointment_date = p_date
    AND a.status IN ('pending', 'confirmed');
$$;

GRANT EXECUTE ON FUNCTION get_booked_slots(date) TO anon, authenticated;
