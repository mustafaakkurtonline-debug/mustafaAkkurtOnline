-- Migration 004: Phone-based appointment lookup and cancellation for anonymous users
-- Run in: Supabase Dashboard → SQL Editor

-- ─────────────────────────────────────────────────────────────
-- 1. Lookup: returns all appointments for a given phone number
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_appointments(p_phone text)
RETURNS TABLE (
  id               uuid,
  appointment_date date,
  appointment_time time,
  status           text,
  service_name     text,
  duration_minutes integer,
  price            numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status::text,
    s.name             AS service_name,
    s.duration_minutes,
    s.price
  FROM  appointments a
  LEFT  JOIN services s ON s.id = a.service_id
  WHERE a.customer_phone = regexp_replace(p_phone, '[^0-9]', '', 'g')
  ORDER BY a.appointment_date DESC, a.appointment_time DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_appointments(text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Cancel: deletes a pending/confirmed appointment
--    Only succeeds when the phone matches the appointment owner
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_my_appointment(
  p_appointment_id uuid,
  p_phone          text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone   text    := regexp_replace(p_phone, '[^0-9]', '', 'g');
  v_deleted integer;
BEGIN
  DELETE FROM appointments
  WHERE  id             = p_appointment_id
    AND  customer_phone = v_phone
    AND  status         IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_my_appointment(uuid, text) TO anon, authenticated;
