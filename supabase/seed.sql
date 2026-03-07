-- Seed data for local development
-- Run with: supabase db seed  (or: supabase db reset --no-confirm)

-- ============================================================
-- NOTE: Auth users must be created via Supabase Auth API.
-- This seed inserts the doctor and schedule data only.
-- Create auth users manually via supabase dashboard or use:
--   supabase auth admin create-user ...
-- Then insert matching user_profiles rows below.
-- ============================================================

-- Doctors
INSERT INTO doctors (id, name, email, specialty, bio, is_active) VALUES
  ('8a1b2c3d-4e5f-6789-abcd-ef0123456789', 'Dr. Nguyen Van An', 'dr.an@clinic.vn',     'Nội khoa',      'Bác sĩ nội khoa với 15 năm kinh nghiệm.', true),
  ('9b2c3d4e-5f60-789a-bcde-f0123456789a', 'Dr. Le Thi Bich',   'dr.bich@clinic.vn',   'Da liễu',       'Chuyên gia da liễu, điều trị mụn và lão hoá. ', true),
  ('ac3d4e5f-6078-9abc-def0-1234567890ab', 'Dr. Tran Minh Duc', 'dr.duc@clinic.vn',    'Tim mạch',      'Bác sĩ tim mạch, echocardiography specialist.', true);

-- Working schedules — Mon–Fri 09:00–17:00, 30-minute slots (day_of_week: 1=Mon … 5=Fri)
INSERT INTO working_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT
  d.id,
  dow,
  '09:00:00'::time,
  '17:00:00'::time,
  30
FROM doctors d, generate_series(1, 5) AS dow
WHERE d.is_active = true;

-- One blocked period — Dr. An is away on 2026-04-01 (Hùng Kings' Holiday)
INSERT INTO blocked_periods (doctor_id, start_at, end_at, reason) VALUES
  (
    '8a1b2c3d-4e5f-6789-abcd-ef0123456789',
    '2026-04-01 00:00:00+00',
    '2026-04-02 00:00:00+00',
    'Giỗ Tổ Hùng Vương'
  );

-- ============================================================
-- user_profiles — fill in auth user UUIDs after creating them
-- ============================================================
-- Example (replace UUIDs after creating auth users):
--
-- INSERT INTO user_profiles (id, role, doctor_id) VALUES
--   ('<admin-auth-uuid>',     'admin',    NULL),
--   ('<provider1-auth-uuid>', 'provider', '11111111-1111-1111-1111-111111111101'),
--   ('<provider2-auth-uuid>', 'provider', '11111111-1111-1111-1111-111111111102');
