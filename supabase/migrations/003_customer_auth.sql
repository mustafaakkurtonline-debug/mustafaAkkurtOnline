-- Migration 003: Customer authentication & profiles
--
-- BEFORE RUNNING:
--   Supabase Dashboard → Authentication → Email → "Confirm email" → OFF
--   (so customers can log in immediately without email confirmation step)
--
-- Run in Supabase Dashboard → SQL Editor

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Customer profiles
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE customer_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name    text NOT NULL,
  phone        text NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Customers manage their own profile only
CREATE POLICY "customer_profiles_self"
  ON customer_profiles FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Fix appointments RLS: distinguish admin vs customer
--    Admin  = authenticated user with NO customer_profiles row
--    Customer = authenticated user WITH a customer_profiles row
-- ──────────────────────────────────────────────────────────────────────────────

-- Drop the old blanket "all authenticated" policy
DROP POLICY IF EXISTS "appointments_auth_all" ON appointments;

-- Admin (no customer profile) keeps full access
CREATE POLICY "appointments_admin_all"
  ON appointments FOR ALL TO authenticated
  USING (
    NOT EXISTS (SELECT 1 FROM customer_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM customer_profiles WHERE user_id = auth.uid())
  );

-- Customer can only SELECT their own appointments (matched by phone)
CREATE POLICY "appointments_customer_read"
  ON appointments FOR SELECT TO authenticated
  USING (
    customer_phone = (
      SELECT phone FROM customer_profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Index for performance
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles (phone);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_phone ON appointments (customer_phone);
