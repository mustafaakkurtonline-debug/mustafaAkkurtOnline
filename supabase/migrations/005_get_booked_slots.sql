-- Returns only booked time slots for a given date (no customer PII exposed)
-- SECURITY DEFINER bypasses RLS so anon users can call it safely
CREATE OR REPLACE FUNCTION get_booked_slots(p_date date)
RETURNS TABLE(slot_time time)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT appointment_time
  FROM appointments
  WHERE appointment_date = p_date
    AND status IN ('pending', 'confirmed');
$$;

GRANT EXECUTE ON FUNCTION get_booked_slots(date) TO anon, authenticated;
