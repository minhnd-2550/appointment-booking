-- Migration: Extend enums and appointments table for US5–US19
-- Adds: completed/no-show statuses, patient/receptionist roles,
--       new columns on appointments table

-- ============================================================
-- EXTEND ENUMS
-- ============================================================

-- appointment_status: add terminal statuses
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'no-show';

-- user_role: add patient and receptionist
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'patient';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'receptionist';

-- ============================================================
-- EXTEND appointments TABLE
-- ============================================================

-- Link appointment to an authenticated patient (optional — guest bookings remain)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dependent_id  uuid,       -- FK added after dependents table is created (T055)
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- ============================================================
-- EXTEND update_appointment_status() to allow new transitions
-- ============================================================
-- The function is recreated in T058 (20260306000006_new_functions.sql)
-- once all terminal statuses are defined. The partial unique index
-- already uses WHERE status IN ('pending','confirmed') so adding
-- 'completed' and 'no-show' as terminal statuses requires no index change.

-- ============================================================
-- user_profiles: add is_active column for deactivation support
-- ============================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS full_name  text,
  ADD COLUMN IF NOT EXISTS email      text;
