-- Migration: New PL/pgSQL functions for US5–US19
-- Creates/replaces: book_appointment (extended), complete_appointment,
--                   create_waitlist_claim, update_appointment_status,
--                   and audit log trigger

-- ============================================================
-- 1. Replace book_appointment to accept user_id + dependent_id
-- ============================================================
CREATE OR REPLACE FUNCTION book_appointment(
  p_doctor_id     uuid,
  p_slot_start    timestamptz,
  p_slot_end      timestamptz,
  p_patient_name  text,
  p_patient_email text,
  p_patient_phone text      DEFAULT NULL,
  p_visit_reason  text      DEFAULT NULL,
  p_user_id       uuid      DEFAULT NULL,
  p_dependent_id  uuid      DEFAULT NULL
)
RETURNS appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment appointments;
BEGIN
  INSERT INTO appointments (
    doctor_id,
    slot_start,
    slot_end,
    patient_name,
    patient_email,
    patient_phone,
    visit_reason,
    status,
    user_id,
    dependent_id
  ) VALUES (
    p_doctor_id,
    p_slot_start,
    p_slot_end,
    p_patient_name,
    p_patient_email,
    p_patient_phone,
    p_visit_reason,
    'pending',
    p_user_id,
    p_dependent_id
  )
  RETURNING * INTO v_appointment;

  RETURN v_appointment;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLOT_TAKEN: The slot (%, %) is already booked.',
      p_doctor_id, p_slot_start
      USING ERRCODE = '23505';
END;
$$;

GRANT EXECUTE ON FUNCTION book_appointment(uuid, timestamptz, timestamptz, text, text, text, text, uuid, uuid)
  TO authenticated, anon;

-- ============================================================
-- 2. complete_appointment — confirms→completed + creates payment
-- ============================================================
CREATE OR REPLACE FUNCTION complete_appointment(
  p_appointment_id uuid,
  p_actor_id       uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt        appointments;
  v_fee         numeric(10,2);
  v_currency    text := 'VND';
BEGIN
  -- Lock the row to prevent concurrent completion
  SELECT * INTO v_appt
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND: %', p_appointment_id;
  END IF;

  IF v_appt.status <> 'confirmed' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot complete appointment with status %', v_appt.status;
  END IF;

  -- Update status to completed
  UPDATE appointments
  SET status = 'completed'
  WHERE id = p_appointment_id;

  -- Determine fee: doctor fee_override → default service fee → fallback 0
  SELECT COALESCE(dp.fee_override, 0)
  INTO v_fee
  FROM doctor_profiles dp
  WHERE dp.id = v_appt.doctor_id;

  IF v_fee IS NULL THEN v_fee := 0; END IF;

  -- Insert payment record (idempotent — ignore if already exists)
  INSERT INTO payments (appointment_id, amount, currency, status)
  VALUES (p_appointment_id, v_fee, v_currency, 'awaiting_payment')
  ON CONFLICT (appointment_id) DO NOTHING;

  -- Audit log
  INSERT INTO audit_log_entries (actor_id, event_type, entity_type, entity_id, old_value, new_value)
  VALUES (
    p_actor_id,
    'appointment_completed',
    'appointment',
    p_appointment_id,
    jsonb_build_object('status', 'confirmed'),
    jsonb_build_object('status', 'completed')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_appointment(uuid, uuid) TO authenticated;

-- ============================================================
-- 3. create_waitlist_claim — atomically books slot + fulfils waitlist entry
-- ============================================================
CREATE OR REPLACE FUNCTION create_waitlist_claim(
  p_entry_id     uuid,
  p_doctor_id    uuid,
  p_slot_start   timestamptz,
  p_slot_end     timestamptz,
  p_patient_id   uuid,
  p_patient_name text,
  p_patient_email text
)
RETURNS appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry       waitlist_entries;
  v_appointment appointments;
BEGIN
  -- Lock and validate the waitlist entry
  SELECT * INTO v_entry
  FROM waitlist_entries
  WHERE id = p_entry_id AND status = 'active'
    AND claim_token_expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLAIM_EXPIRED_OR_INVALID: Waitlist entry % is not claimable', p_entry_id;
  END IF;

  -- Book the appointment (will raise on slot conflict)
  v_appointment := book_appointment(
    p_doctor_id,
    p_slot_start,
    p_slot_end,
    p_patient_name,
    p_patient_email,
    NULL,
    NULL,
    p_patient_id,
    NULL
  );

  -- Mark waitlist entry as fulfilled
  UPDATE waitlist_entries
  SET status = 'fulfilled', updated_at = now()
  WHERE id = p_entry_id;

  RETURN v_appointment;
END;
$$;

GRANT EXECUTE ON FUNCTION create_waitlist_claim(uuid, uuid, timestamptz, timestamptz, uuid, text, text)
  TO authenticated;

-- ============================================================
-- 4. Trigger: log appointment status changes to audit_log_entries
-- ============================================================
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log_entries (
      actor_id,
      event_type,
      entity_type,
      entity_id,
      old_value,
      new_value
    ) VALUES (
      auth.uid(),
      'appointment_status_changed',
      'appointment',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_status_audit
AFTER UPDATE OF status ON appointments
FOR EACH ROW
EXECUTE FUNCTION log_appointment_status_change();

-- ============================================================
-- 5. update_appointment_status — validates state machine transitions
-- ============================================================
CREATE OR REPLACE FUNCTION update_appointment_status(
  p_appointment_id uuid,
  p_new_status     appointment_status,
  p_actor_id       uuid DEFAULT NULL
)
RETURNS appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt appointments;
  v_allowed_transitions jsonb := '{
    "pending":   ["confirmed", "cancelled"],
    "confirmed": ["cancelled", "completed", "no-show"],
    "cancelled": [],
    "completed": [],
    "no-show":   []
  }'::jsonb;
BEGIN
  SELECT * INTO v_appt FROM appointments WHERE id = p_appointment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND: %', p_appointment_id;
  END IF;

  IF NOT (v_allowed_transitions->>(v_appt.status::text)) @> to_jsonb(p_new_status::text) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % → %', v_appt.status, p_new_status;
  END IF;

  UPDATE appointments SET status = p_new_status WHERE id = p_appointment_id
  RETURNING * INTO v_appt;

  RETURN v_appt;
END;
$$;

GRANT EXECUTE ON FUNCTION update_appointment_status(uuid, appointment_status, uuid) TO authenticated;
