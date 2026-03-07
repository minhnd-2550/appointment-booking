-- Migration: book_appointment PL/pgSQL function
-- Atomically inserts an appointment; raises exception on double-booking conflict

CREATE OR REPLACE FUNCTION book_appointment(
  p_doctor_id     uuid,
  p_slot_start    timestamptz,
  p_slot_end      timestamptz,
  p_patient_name  text,
  p_patient_email text,
  p_patient_phone text DEFAULT NULL,
  p_visit_reason  text DEFAULT NULL
)
RETURNS appointments
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with the function owner's privileges (service role bypass for INSERT)
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
    status
  ) VALUES (
    p_doctor_id,
    p_slot_start,
    p_slot_end,
    p_patient_name,
    p_patient_email,
    p_patient_phone,
    p_visit_reason,
    'pending'
  )
  RETURNING * INTO v_appointment;

  RETURN v_appointment;

EXCEPTION
  WHEN unique_violation THEN
    -- The partial unique index appointments_doctor_slot_unique fired
    RAISE EXCEPTION 'SLOT_TAKEN: The slot (%, %) is already booked.',
      p_doctor_id, p_slot_start
      USING ERRCODE = '23505';
END;
$$;

-- Grant execute to authenticated and anon roles (actual auth check is in the Route Handler)
GRANT EXECUTE ON FUNCTION book_appointment(uuid, timestamptz, timestamptz, text, text, text, text)
  TO authenticated, anon;
