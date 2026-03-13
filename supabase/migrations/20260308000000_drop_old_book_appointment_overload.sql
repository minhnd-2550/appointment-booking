-- Drop the old 7-param overload of book_appointment that conflicts with the
-- 9-param version added in 20260306000006_new_functions.sql.
-- PostgREST (PGRST203) cannot choose between overloads when optional params are omitted.

DROP FUNCTION IF EXISTS public.book_appointment(
  uuid,         -- p_doctor_id
  timestamptz,  -- p_slot_start
  timestamptz,  -- p_slot_end
  text,         -- p_patient_name
  text,         -- p_patient_email
  text,         -- p_patient_phone
  text          -- p_visit_reason
);
