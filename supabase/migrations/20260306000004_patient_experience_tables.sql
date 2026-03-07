-- Migration: Patient experience tables
-- Creates: dependents, waitlist_entries, notification_preferences, in_app_notifications
-- Also adds FK from appointments.dependent_id → dependents(id)

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE dependents (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_holder_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          text        NOT NULL,
  date_of_birth      date,
  gender             text,
  relationship       text        NOT NULL CHECK (relationship IN ('child', 'parent', 'spouse', 'other')),
  is_active          boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Now that dependents exists, add the FK constraint to appointments
ALTER TABLE appointments
  ADD CONSTRAINT appointments_dependent_id_fk
  FOREIGN KEY (dependent_id) REFERENCES dependents(id);

CREATE TABLE waitlist_entries (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id               uuid        NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  preferred_date_from     date,
  preferred_date_to       date,
  status                  text        NOT NULL
                            CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled'))
                            DEFAULT 'active',
  claim_token             text        UNIQUE,
  claim_token_expires_at  timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_preferences (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    text        NOT NULL,
  email_enabled boolean     NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_patient_event_unique UNIQUE (patient_id, event_type)
);

CREATE TABLE in_app_notifications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type          text        NOT NULL,
  message             text        NOT NULL,
  related_entity_type text,
  related_entity_id   uuid,
  is_read             boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX dependents_account_holder_id_idx ON dependents(account_holder_id);
CREATE INDEX waitlist_entries_patient_id_idx ON waitlist_entries(patient_id);
CREATE INDEX waitlist_entries_doctor_id_status_idx ON waitlist_entries(doctor_id, status);
CREATE INDEX notification_preferences_patient_id_idx ON notification_preferences(patient_id);
CREATE INDEX in_app_notifications_patient_id_read_idx ON in_app_notifications(patient_id, is_read);
CREATE INDEX in_app_notifications_created_at_idx ON in_app_notifications(created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- dependents: owner patient manages own
CREATE POLICY "dependents_owner_all" ON dependents
  FOR ALL USING (auth.uid() = account_holder_id);

CREATE POLICY "dependents_admin_select" ON dependents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- waitlist_entries: patient manages own; admin reads all
CREATE POLICY "waitlist_patient_all" ON waitlist_entries
  FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "waitlist_admin_select" ON waitlist_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- notification_preferences: patient manages own
CREATE POLICY "notif_prefs_patient_all" ON notification_preferences
  FOR ALL USING (auth.uid() = patient_id);

-- in_app_notifications: patient reads/updates own; service role inserts
CREATE POLICY "in_app_notifs_patient_select" ON in_app_notifications
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "in_app_notifs_patient_update" ON in_app_notifications
  FOR UPDATE USING (auth.uid() = patient_id);
