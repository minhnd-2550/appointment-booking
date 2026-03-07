-- Migration: Patient clinical tables
-- Creates: patient_profiles, patient_medical_backgrounds, medical_records, prescription_items

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE patient_profiles (
  id                        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                 text        NOT NULL,
  date_of_birth             date,
  gender                    text,
  address                   text,
  emergency_contact_name    text,
  emergency_contact_phone   text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patient_medical_backgrounds (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type   text        NOT NULL CHECK (entry_type IN ('allergy', 'chronic_condition')),
  description  text        NOT NULL,
  added_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE medical_records (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    uuid        NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  diagnosis         text,
  examination_notes text,
  recorded_by       uuid        NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE prescription_items (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid  NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  medication_name   text  NOT NULL,
  dosage            text  NOT NULL,
  frequency         text  NOT NULL,
  duration          text  NOT NULL,
  notes             text
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX patient_medical_backgrounds_user_id_idx ON patient_medical_backgrounds(user_id);
CREATE INDEX medical_records_appointment_id_idx ON medical_records(appointment_id);
CREATE INDEX prescription_items_medical_record_id_idx ON prescription_items(medical_record_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

-- patient_profiles: patient reads/writes own; provider reads their patients'; admin reads all
CREATE POLICY "patient_profiles_select_own" ON patient_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "patient_profiles_insert_own" ON patient_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "patient_profiles_update_own" ON patient_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "patient_profiles_provider_select" ON patient_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('provider', 'admin', 'receptionist')
    )
  );

-- patient_medical_backgrounds
CREATE POLICY "pmb_select_own" ON patient_medical_backgrounds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pmb_insert_own" ON patient_medical_backgrounds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pmb_delete_own" ON patient_medical_backgrounds
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "pmb_provider_select" ON patient_medical_backgrounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('provider', 'admin', 'receptionist')
    )
  );

-- medical_records: patient reads own; provider reads/writes their appointments'; admin reads all
CREATE POLICY "medical_records_patient_select" ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = medical_records.appointment_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "medical_records_provider_select" ON medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE a.id = medical_records.appointment_id
    )
  );

CREATE POLICY "medical_records_provider_insert" ON medical_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE a.id = medical_records.appointment_id
    )
  );

CREATE POLICY "medical_records_provider_update" ON medical_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE a.id = medical_records.appointment_id
    )
  );

CREATE POLICY "medical_records_admin_select" ON medical_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- prescription_items: inherit access through medical_records
CREATE POLICY "prescription_items_patient_select" ON prescription_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN appointments a ON a.id = mr.appointment_id
      WHERE mr.id = prescription_items.medical_record_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "prescription_items_provider_select" ON prescription_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN appointments a ON a.id = mr.appointment_id
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE mr.id = prescription_items.medical_record_id
    )
  );

CREATE POLICY "prescription_items_provider_write" ON prescription_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN appointments a ON a.id = mr.appointment_id
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE mr.id = prescription_items.medical_record_id
    )
  );

CREATE POLICY "prescription_items_admin_select" ON prescription_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
