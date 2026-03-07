-- Migration: Initial Schema
-- Creates enums, tables, indexes, and RLS policies for the clinic booking system
--
-- NOTE: All tables are created first (in FK-dependency order), then RLS is
-- enabled on all of them, then policies are added. This avoids forward-reference
-- errors where a policy on an early table references a table not yet created.

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE user_role AS ENUM ('provider', 'admin');

-- ============================================================
-- TABLES (dependency order — no policies yet)
-- ============================================================

-- 1. doctors (no FK to other app tables)
CREATE TABLE doctors (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  email        text        NOT NULL UNIQUE,
  specialty    text        NOT NULL,
  bio          text,
  avatar_url   text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. user_profiles (FK → doctors, FK → auth.users)
--    Must be created before policies on other tables that reference it.
CREATE TABLE user_profiles (
  id          uuid      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  doctor_id   uuid      REFERENCES doctors(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. working_schedules
CREATE TABLE working_schedules (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             uuid        NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week           smallint    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            time        NOT NULL,
  end_time              time        NOT NULL,
  slot_duration_minutes smallint    NOT NULL CHECK (slot_duration_minutes BETWEEN 15 AND 120),
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT working_schedules_start_before_end CHECK (start_time < end_time),
  CONSTRAINT working_schedules_doctor_day_unique UNIQUE (doctor_id, day_of_week)
);

-- 4. blocked_periods
CREATE TABLE blocked_periods (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   uuid        NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_periods_start_before_end CHECK (start_at < end_at)
);

-- 5. appointments
CREATE TABLE appointments (
  id              uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       uuid               NOT NULL REFERENCES doctors(id),
  slot_start      timestamptz        NOT NULL,
  slot_end        timestamptz        NOT NULL,
  patient_name    text               NOT NULL,
  patient_email   text               NOT NULL,
  patient_phone   text,
  visit_reason    text,
  status          appointment_status NOT NULL DEFAULT 'pending',
  reminder_sent   boolean            NOT NULL DEFAULT false,
  created_at      timestamptz        NOT NULL DEFAULT now()
);

-- Partial unique index: only one active booking per (doctor, slot)
CREATE UNIQUE INDEX appointments_doctor_slot_unique
  ON appointments (doctor_id, slot_start)
  WHERE status IN ('pending', 'confirmed');

-- Performance: provider dashboard queries
CREATE INDEX appointments_doctor_id_slot_start_idx
  ON appointments (doctor_id, slot_start);

-- Performance: cron reminder job
CREATE INDEX appointments_reminder_idx
  ON appointments (slot_start, status, reminder_sent)
  WHERE status = 'confirmed' AND reminder_sent = false;

-- 6. notification_logs
CREATE TABLE notification_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    uuid        NOT NULL REFERENCES appointments(id),
  notification_type text        NOT NULL,
  recipient_email   text        NOT NULL,
  status            text        NOT NULL CHECK (status IN ('sent', 'failed', 'retried')),
  error_message     text,
  sent_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE doctors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_periods    ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: doctors
-- ============================================================
CREATE POLICY "doctors_select_public"
  ON doctors FOR SELECT
  USING (true);

CREATE POLICY "doctors_insert_admin"
  ON doctors FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "doctors_update_admin"
  ON doctors FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "doctors_delete_admin"
  ON doctors FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- POLICIES: user_profiles
-- ============================================================
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_profiles_insert_admin"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_profiles_update_admin"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- POLICIES: working_schedules
-- ============================================================
CREATE POLICY "working_schedules_select_public"
  ON working_schedules FOR SELECT
  USING (true);

CREATE POLICY "working_schedules_insert_admin"
  ON working_schedules FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "working_schedules_update_admin"
  ON working_schedules FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "working_schedules_delete_admin"
  ON working_schedules FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- POLICIES: blocked_periods
-- ============================================================
CREATE POLICY "blocked_periods_select_public"
  ON blocked_periods FOR SELECT
  USING (true);

CREATE POLICY "blocked_periods_insert_admin"
  ON blocked_periods FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "blocked_periods_update_admin"
  ON blocked_periods FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "blocked_periods_delete_admin"
  ON blocked_periods FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- POLICIES: appointments
-- ============================================================

-- Public: can check availability
CREATE POLICY "appointments_select_availability"
  ON appointments FOR SELECT
  USING (true);

-- INSERT: only via book_appointment() RPC (service role bypasses RLS)

-- UPDATE status: provider can update their doctor's appointments; admin can update all
CREATE POLICY "appointments_update_status_provider"
  ON appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR (role = 'provider' AND doctor_id = appointments.doctor_id)
        )
    )
  );

-- DELETE: admin only
CREATE POLICY "appointments_delete_admin"
  ON appointments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- POLICIES: notification_logs
-- ============================================================

-- SELECT: admin only
CREATE POLICY "notification_logs_select_admin"
  ON notification_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT: service role only (bypasses RLS; no explicit policy needed)
