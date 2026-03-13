-- ============================================================
-- SEED DATA for Local Development & Testing
-- ============================================================
-- This seed provides comprehensive test data for all user roles:
-- - 3 doctors with full schedules
-- - Admin, provider, receptionist, and patient users
-- - Sample appointments in various states
-- - Patient profiles with medical records
-- - Blocked periods and other realistic data

-- ============================================================
-- DOCTORS (3 providers with different specialties)
-- ============================================================
INSERT INTO doctors (id, name, email, specialty, bio, avatar_url, is_active) VALUES
  ('8a1b2c3d-4e5f-4a89-abcd-ef0123456789', 
   'Dr. Nguyễn Văn An', 
   'dr.an@clinic.vn', 
   'Nội khoa', 
   'Bác sĩ nội khoa với 15 năm kinh nghiệm, chuyên về bệnh tim mạch và đái tháo đường.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=dr-an',
   true),
   
  ('9b2c3d4e-5f60-4b9a-bcde-f0123456789a', 
   'Dr. Lê Thị Bích', 
   'dr.bich@clinic.vn', 
   'Da liễu', 
   'Chuyên gia da liễu với kinh nghiệm 12 năm, điều trị mụn, viêm da và lão hoá da.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=dr-bich',
   true),
   
  ('ac3d4e5f-6078-4cab-8ef0-1234567890ab', 
   'Dr. Trần Minh Đức', 
   'dr.duc@clinic.vn', 
   'Tim mạch', 
   'Bác sĩ tim mạch chứng chỉ, echocardiography specialist, 18 năm kinh nghiệm.',
   'https://api.dicebear.com/9.x/avataaars/svg?seed=dr-duc',
   true);

-- ============================================================
-- WORKING SCHEDULES (Mon–Fri 09:00–17:00, 30-minute slots)
-- ============================================================
-- day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
INSERT INTO working_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
SELECT
  d.id,
  dow,
  '09:00:00'::time,
  '17:00:00'::time,
  30
FROM doctors d, generate_series(1, 5) AS dow
WHERE d.is_active = true;

-- ============================================================
-- BLOCKED PERIODS (holidays and unavailability)
-- ============================================================
INSERT INTO blocked_periods (doctor_id, start_at, end_at, reason) VALUES
  ('8a1b2c3d-4e5f-4a89-abcd-ef0123456789',
   '2026-04-01 00:00:00+00',
   '2026-04-02 00:00:00+00',
   'Giỗ Tổ Hùng Vương'),
   
  ('9b2c3d4e-5f60-4b9a-bcde-f0123456789a',
   '2026-04-29 00:00:00+00',
   '2026-05-01 00:00:00+00',
   'Lễ 30/4 - 1/5'),
   
  ('ac3d4e5f-6078-4cab-8ef0-1234567890ab',
   '2026-03-20 12:00:00+00',
   '2026-03-20 13:00:00+00',
   'Hội thảo khoa học');

-- ============================================================
-- SAMPLE APPOINTMENTS (various statuses for testing)
-- ============================================================
INSERT INTO appointments (id, doctor_id, slot_start, slot_end, patient_name, patient_email, patient_phone, visit_reason, status, reminder_sent, created_at, updated_at) VALUES
  -- Confirmed appointments
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '8a1b2c3d-4e5f-4a89-abcd-ef0123456789',
   '2026-03-10 02:00:00+00',
   '2026-03-10 02:30:00+00',
   'Nguyễn Văn A',
   'nguyenvana@example.com',
   '+84901234567',
   'Khám tổng quát định kỳ',
   'confirmed',
   true,
   '2026-03-06 08:00:00+00',
   '2026-03-07 10:30:00+00'),
   
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '9b2c3d4e-5f60-4b9a-bcde-f0123456789a',
   '2026-03-11 03:00:00+00',
   '2026-03-11 03:30:00+00',
   'Trần Thị Bình',
   'tranthiminh@example.com',
   '+84912345678',
   'Điều trị mụn mặt',
   'confirmed',
   false,
   '2026-03-07 09:15:00+00',
   '2026-03-07 11:00:00+00'),
   
  -- Pending appointment
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'ac3d4e5f-6078-4cab-8ef0-1234567890ab',
   '2026-03-15 08:00:00+00',
   '2026-03-15 08:30:00+00',
   'Lê Văn C',
   'levanc@example.com',
   '+84923456789',
   'Khám tim mạch định kỳ',
   'pending',
   false,
   '2026-03-08 14:20:00+00',
   '2026-03-08 14:20:00+00'),
   
  -- Cancelled appointment
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   '8a1b2c3d-4e5f-4a89-abcd-ef0123456789',
   '2026-03-12 09:00:00+00',
   '2026-03-12 09:30:00+00',
   'Phạm Thị D',
   'phamthid@example.com',
   '+84934567890',
   'Tái khám sau điều trị',
   'cancelled',
   false,
   '2026-03-05 10:00:00+00',
   '2026-03-06 16:45:00+00'),
   
  -- Another pending
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   '9b2c3d4e-5f60-4b9a-bcde-f0123456789a',
   '2026-03-18 04:30:00+00',
   '2026-03-18 05:00:00+00',
   'Hoàng Văn E',
   'hoangvane@example.com',
   '+84945678901',
   'Khám da lần đầu',
   'pending',
   false,
   '2026-03-08 22:30:00+00',
   '2026-03-08 22:30:00+00');

-- ============================================================
-- NOTIFICATION LOGS (audit trail of notifications sent)
-- ============================================================
INSERT INTO notification_logs (appointment_id, notification_type, recipient_email, status, error_message, sent_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'confirmed',
   'nguyenvana@example.com',
   'sent',
   NULL,
   '2026-03-07 10:31:00+00'),
   
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'confirmed',
   'tranthiminh@example.com',
   'sent',
   NULL,
   '2026-03-07 11:05:00+00'),
   
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   'cancelled',
   'phamthid@example.com',
   'sent',
   NULL,
   '2026-03-06 16:50:00+00'),
   
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   'pending_reminder',
   'levanc@example.com',
   'sent',
   NULL,
   '2026-03-08 14:35:00+00');

-- ============================================================
-- USER_PROFILES — Created automatically by trigger from auth.users
-- See supabase/seed-auth-users.sql to create auth users
-- The handle_new_user() trigger will automatically create these rows
-- when auth.users are inserted
-- ============================================================
-- (user_profiles will be auto-generated by INSERT in seed-auth-users.sql)

-- ============================================================
-- PATIENT DATA — Initialize after creating auth.users
-- See supabase/seed-auth-users.sql to create patient profiles + medical records
-- ============================================================
-- Patient profiles, medical backgrounds, and medical records are created
-- in seed-auth-users.sql after auth.users are seeded
