-- Migration: Patient documents, system settings, audit log
-- Creates: patient_documents, system_settings (with defaults), audit_log_entries

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE patient_documents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  uploaded_by    uuid        NOT NULL REFERENCES auth.users(id),
  document_type  text        NOT NULL CHECK (document_type IN ('referral', 'previous_result', 'insurance', 'other')),
  description    text,
  file_path      text        NOT NULL,  -- Supabase Storage object path (NOT a public URL)
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system_settings (
  key               text        PRIMARY KEY,
  value             text        NOT NULL,
  default_value     text        NOT NULL,
  description       text        NOT NULL,
  last_updated_by   uuid        REFERENCES auth.users(id),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log_entries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid        REFERENCES auth.users(id),
  event_type   text        NOT NULL,
  entity_type  text,
  entity_id    uuid,
  old_value    jsonb,
  new_value    jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
  -- NO updated_at — this table is immutable (INSERT only)
);

-- ============================================================
-- SEED: default system settings
-- ============================================================

INSERT INTO system_settings (key, value, default_value, description) VALUES
  ('cancellation_cutoff_hours', '2',  '2',  'Hours before appointment within which patient cancellation/reschedule is blocked'),
  ('reminder_lead_hours',       '24', '24', 'Hours before appointment to send the reminder email'),
  ('max_upload_mb',             '10', '10', 'Maximum file size in megabytes for patient/result uploads'),
  ('waitlist_claim_expiry_minutes', '30', '30', 'Minutes before a waitlist claim token expires');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX patient_documents_appointment_id_idx ON patient_documents(appointment_id);
CREATE INDEX patient_documents_uploaded_by_idx ON patient_documents(uploaded_by);
CREATE INDEX audit_log_entries_actor_id_idx ON audit_log_entries(actor_id);
CREATE INDEX audit_log_entries_entity_idx ON audit_log_entries(entity_type, entity_id);
CREATE INDEX audit_log_entries_created_at_idx ON audit_log_entries(created_at DESC);
CREATE INDEX audit_log_entries_event_type_idx ON audit_log_entries(event_type);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

-- patient_documents: uploader reads/writes own; appointment's doctor reads; admin reads all
CREATE POLICY "patient_docs_uploader_all" ON patient_documents
  FOR ALL USING (auth.uid() = uploaded_by);

CREATE POLICY "patient_docs_provider_select" ON patient_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE a.id = patient_documents.appointment_id
    )
  );

CREATE POLICY "patient_docs_admin_select" ON patient_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- system_settings: authenticated users can read; only admin can write
CREATE POLICY "settings_read_authenticated" ON system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settings_admin_write" ON system_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- audit_log_entries: admin SELECT only; INSERT via service role only; no UPDATE/DELETE for any role
CREATE POLICY "audit_log_admin_select" ON audit_log_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- No INSERT policy for non-service-role users — all inserts go through service role client
