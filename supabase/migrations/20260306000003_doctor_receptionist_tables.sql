-- Migration: Doctor profiles, receptionist/staff tables
-- Creates: doctor_profiles, internal_notes, patient_check_ins, doctor_ratings

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE doctor_profiles (
  id          uuid           PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  photo_url   text,
  biography   text,
  qualifications text,
  languages   text[]         NOT NULL DEFAULT '{}',
  fee_override numeric(10,2),
  updated_at  timestamptz    NOT NULL DEFAULT now()
);

CREATE TABLE internal_notes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  content        text        NOT NULL,
  authored_by    uuid        NOT NULL REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patient_check_ins (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid        NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  checked_in_by  uuid        NOT NULL REFERENCES auth.users(id),
  checked_in_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE doctor_ratings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid        NOT NULL UNIQUE REFERENCES appointments(id),
  patient_id     uuid        NOT NULL REFERENCES auth.users(id),
  doctor_id      uuid        NOT NULL REFERENCES doctors(id),
  rating         smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text,
  is_hidden      boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX internal_notes_appointment_id_idx ON internal_notes(appointment_id);
CREATE INDEX patient_check_ins_appointment_id_idx ON patient_check_ins(appointment_id);
CREATE INDEX doctor_ratings_doctor_id_idx ON doctor_ratings(doctor_id);
CREATE INDEX doctor_ratings_patient_id_idx ON doctor_ratings(patient_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_ratings ENABLE ROW LEVEL SECURITY;

-- doctor_profiles: public read; provider updates own; admin updates all
CREATE POLICY "doctor_profiles_public_select" ON doctor_profiles
  FOR SELECT USING (true);

CREATE POLICY "doctor_profiles_provider_update" ON doctor_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = doctor_profiles.id
    )
  );

CREATE POLICY "doctor_profiles_provider_insert" ON doctor_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = doctor_profiles.id
    )
  );

CREATE POLICY "doctor_profiles_admin_all" ON doctor_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- internal_notes: provider, receptionist, admin only — NEVER patient
CREATE POLICY "internal_notes_staff_select" ON internal_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('provider', 'admin', 'receptionist')
    )
  );

CREATE POLICY "internal_notes_staff_write" ON internal_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('provider', 'admin', 'receptionist')
    )
  );

-- patient_check_ins: receptionist + admin write; provider reads
CREATE POLICY "check_ins_receptionist_write" ON patient_check_ins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('receptionist', 'admin')
    )
  );

CREATE POLICY "check_ins_provider_select" ON patient_check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('provider', 'admin', 'receptionist')
    )
  );

-- doctor_ratings: owner patient reads own; public reads non-hidden; admin reads all
CREATE POLICY "ratings_patient_all" ON doctor_ratings
  FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "ratings_public_select" ON doctor_ratings
  FOR SELECT USING (is_hidden = false);

CREATE POLICY "ratings_admin_all" ON doctor_ratings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
