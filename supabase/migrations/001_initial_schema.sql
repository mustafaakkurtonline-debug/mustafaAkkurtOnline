-- ============================================================
-- Mustafa Akkurt Berberi — Initial Schema Migration
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price            numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: appointments
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name    text NOT NULL,
  customer_phone   text NOT NULL,
  service_id       uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'completed', 'no_show')),
  no_show_notified boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON appointments(appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_phone
  ON appointments(customer_phone);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot
  ON appointments(appointment_date, appointment_time)
  WHERE status IN ('pending', 'confirmed');

-- ============================================================
-- TABLE: reserved_slots
-- ============================================================
CREATE TABLE IF NOT EXISTS reserved_slots (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  day_of_week   integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  slot_time     time NOT NULL,
  start_date    date NOT NULL,
  end_date      date,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_reserved_slots_day
  ON reserved_slots(day_of_week)
  WHERE is_active = true;

-- ============================================================
-- TABLE: banned_customers
-- ============================================================
CREATE TABLE IF NOT EXISTS banned_customers (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone text NOT NULL,
  banned_until   date NOT NULL,
  reason         text NOT NULL DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banned_customers_phone
  ON banned_customers(customer_phone);

-- ============================================================
-- TABLE: working_hours
-- ============================================================
CREATE TABLE IF NOT EXISTS working_hours (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week integer NOT NULL UNIQUE CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time   time NOT NULL,
  close_time  time NOT NULL,
  is_open     boolean NOT NULL DEFAULT true,
  CONSTRAINT close_after_open CHECK (close_time > open_time)
);

-- Varsayılan çalışma saatleri: Pzt-Cum 09:00-19:00, Cmt 09:00-18:00, Paz kapalı
INSERT INTO working_hours (day_of_week, open_time, close_time, is_open) VALUES
  (0, '09:00', '19:00', true),
  (1, '09:00', '19:00', true),
  (2, '09:00', '19:00', true),
  (3, '09:00', '19:00', true),
  (4, '09:00', '19:00', true),
  (5, '09:00', '18:00', true),
  (6, '09:00', '13:00', false)
ON CONFLICT (day_of_week) DO NOTHING;

-- ============================================================
-- TABLE: blocked_days
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_days (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocked_date date NOT NULL UNIQUE,
  reason       text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_blocked_days_date
  ON blocked_days(blocked_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserved_slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days     ENABLE ROW LEVEL SECURITY;

-- services: public okuma, authenticated yazma
CREATE POLICY "services_public_read"    ON services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "services_auth_insert"    ON services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "services_auth_update"    ON services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "services_auth_delete"    ON services FOR DELETE TO authenticated USING (true);

-- appointments: public ekleme, authenticated tam erişim
CREATE POLICY "appointments_public_insert" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "appointments_auth_read"     ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "appointments_auth_update"   ON appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "appointments_auth_delete"   ON appointments FOR DELETE TO authenticated USING (true);

-- reserved_slots: public okuma, authenticated yazma
CREATE POLICY "reserved_slots_public_read"  ON reserved_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reserved_slots_auth_insert"  ON reserved_slots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reserved_slots_auth_update"  ON reserved_slots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "reserved_slots_auth_delete"  ON reserved_slots FOR DELETE TO authenticated USING (true);

-- banned_customers: yalnızca authenticated
CREATE POLICY "banned_customers_auth_all"
  ON banned_customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- working_hours: public okuma, authenticated yazma
CREATE POLICY "working_hours_public_read"  ON working_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "working_hours_auth_insert"  ON working_hours FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "working_hours_auth_update"  ON working_hours FOR UPDATE TO authenticated USING (true);
CREATE POLICY "working_hours_auth_delete"  ON working_hours FOR DELETE TO authenticated USING (true);

-- blocked_days: public okuma, authenticated yazma
CREATE POLICY "blocked_days_public_read"  ON blocked_days FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blocked_days_auth_insert"  ON blocked_days FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blocked_days_auth_update"  ON blocked_days FOR UPDATE TO authenticated USING (true);
CREATE POLICY "blocked_days_auth_delete"  ON blocked_days FOR DELETE TO authenticated USING (true);
