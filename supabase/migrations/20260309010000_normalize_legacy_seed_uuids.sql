-- Migration: Normalize legacy seed UUIDs to RFC-compliant UUIDs
-- Purpose:
-- 1) Allow strict zod uuid() validation everywhere.
-- 2) Migrate existing local DBs that still contain legacy seed IDs
--    (without requiring a full DB reset).

-- -----------------------------------------------------------------------------
-- STEP 1: Make doctor-related FKs ON UPDATE CASCADE so PK rewrite is safe
-- -----------------------------------------------------------------------------

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_doctor_id_fkey;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ON UPDATE CASCADE;

ALTER TABLE working_schedules
  DROP CONSTRAINT IF EXISTS working_schedules_doctor_id_fkey;
ALTER TABLE working_schedules
  ADD CONSTRAINT working_schedules_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE blocked_periods
  DROP CONSTRAINT IF EXISTS blocked_periods_doctor_id_fkey;
ALTER TABLE blocked_periods
  ADD CONSTRAINT blocked_periods_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ON UPDATE CASCADE;

ALTER TABLE doctor_profiles
  DROP CONSTRAINT IF EXISTS doctor_profiles_id_fkey;
ALTER TABLE doctor_profiles
  ADD CONSTRAINT doctor_profiles_id_fkey
  FOREIGN KEY (id) REFERENCES doctors(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE doctor_ratings
  DROP CONSTRAINT IF EXISTS doctor_ratings_doctor_id_fkey;
ALTER TABLE doctor_ratings
  ADD CONSTRAINT doctor_ratings_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ON UPDATE CASCADE;

ALTER TABLE waitlist_entries
  DROP CONSTRAINT IF EXISTS waitlist_entries_doctor_id_fkey;
ALTER TABLE waitlist_entries
  ADD CONSTRAINT waitlist_entries_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- STEP 2: Make appointment-related FKs ON UPDATE CASCADE for ID rewrite safety
-- -----------------------------------------------------------------------------

ALTER TABLE notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_appointment_id_fkey;
ALTER TABLE notification_logs
  ADD CONSTRAINT notification_logs_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON UPDATE CASCADE;

ALTER TABLE internal_notes
  DROP CONSTRAINT IF EXISTS internal_notes_appointment_id_fkey;
ALTER TABLE internal_notes
  ADD CONSTRAINT internal_notes_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE patient_check_ins
  DROP CONSTRAINT IF EXISTS patient_check_ins_appointment_id_fkey;
ALTER TABLE patient_check_ins
  ADD CONSTRAINT patient_check_ins_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE doctor_ratings
  DROP CONSTRAINT IF EXISTS doctor_ratings_appointment_id_fkey;
ALTER TABLE doctor_ratings
  ADD CONSTRAINT doctor_ratings_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON UPDATE CASCADE;

ALTER TABLE lab_orders
  DROP CONSTRAINT IF EXISTS lab_orders_appointment_id_fkey;
ALTER TABLE lab_orders
  ADD CONSTRAINT lab_orders_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE medical_records
  DROP CONSTRAINT IF EXISTS medical_records_appointment_id_fkey;
ALTER TABLE medical_records
  ADD CONSTRAINT medical_records_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_appointment_id_fkey;
ALTER TABLE payments
  ADD CONSTRAINT payments_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE patient_documents
  DROP CONSTRAINT IF EXISTS patient_documents_appointment_id_fkey;
ALTER TABLE patient_documents
  ADD CONSTRAINT patient_documents_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- STEP 3: Rewrite legacy doctor IDs (if present)
-- -----------------------------------------------------------------------------

UPDATE doctors
SET id = '8a1b2c3d-4e5f-4a89-abcd-ef0123456789'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE doctors
SET id = '9b2c3d4e-5f60-4b9a-bcde-f0123456789a'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE doctors
SET id = 'ac3d4e5f-6078-4cab-8ef0-1234567890ab'
WHERE id = '33333333-3333-3333-3333-333333333333';

-- -----------------------------------------------------------------------------
-- STEP 4: Rewrite legacy appointment IDs (if present)
-- -----------------------------------------------------------------------------

UPDATE appointments
SET id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

UPDATE appointments
SET id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

UPDATE appointments
SET id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

UPDATE appointments
SET id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

UPDATE appointments
SET id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
