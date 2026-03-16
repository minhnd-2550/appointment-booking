-- ============================================================
-- POST-AUTH SEED DATA
-- ============================================================
-- Run AFTER creating auth users. This script:
-- - links provider accounts to seeded doctors
-- - creates patient-facing demo data for the seeded accounts
-- - backfills appointment.user_id so deployed demo accounts see data

BEGIN;

-- ============================================================
-- NORMALIZE user_profiles created by handle_new_user()
-- ============================================================
UPDATE user_profiles
SET role = 'admin', full_name = 'Nguyễn Quản Trị Viên', email = 'admin@clinic.vn', is_active = true
WHERE email = 'admin@clinic.vn';

UPDATE user_profiles
SET role = 'provider',
    full_name = 'Dr. Nguyễn Văn An',
    email = 'dr.an@clinic.vn',
    is_active = true,
    doctor_id = '8a1b2c3d-4e5f-4a89-abcd-ef0123456789'
WHERE email = 'dr.an@clinic.vn';

UPDATE user_profiles
SET role = 'provider',
    full_name = 'Dr. Lê Thị Bích',
    email = 'dr.bich@clinic.vn',
    is_active = true,
    doctor_id = '9b2c3d4e-5f60-4b9a-bcde-f0123456789a'
WHERE email = 'dr.bich@clinic.vn';

UPDATE user_profiles
SET role = 'provider',
    full_name = 'Dr. Trần Minh Đức',
    email = 'dr.duc@clinic.vn',
    is_active = true,
    doctor_id = 'ac3d4e5f-6078-4cab-8ef0-1234567890ab'
WHERE email = 'dr.duc@clinic.vn';

UPDATE user_profiles
SET role = 'receptionist', full_name = 'Lê Thị Thu Trang', email = 'receptionist@clinic.vn', is_active = true
WHERE email = 'receptionist@clinic.vn';

UPDATE user_profiles
SET role = 'patient', full_name = 'Bệnh nhân mặc định', email = 'patient@clinic.vn', is_active = true
WHERE email = 'patient@clinic.vn';

UPDATE user_profiles
SET role = 'patient', full_name = 'Nguyễn Văn A', email = 'nguyenvana@example.com', is_active = true
WHERE email = 'nguyenvana@example.com';

UPDATE user_profiles
SET role = 'patient', full_name = 'Trần Thị Bình', email = 'tranthiminh@example.com', is_active = true
WHERE email = 'tranthiminh@example.com';

UPDATE user_profiles
SET role = 'patient', full_name = 'Lê Văn C', email = 'levanc@example.com', is_active = true
WHERE email = 'levanc@example.com';

-- ============================================================
-- PATIENT PROFILES
-- ============================================================
INSERT INTO patient_profiles (
  id,
  full_name,
  date_of_birth,
  gender,
  address,
  emergency_contact_name,
  emergency_contact_phone,
  created_at,
  updated_at
)
SELECT
  au.id,
  CASE au.email
    WHEN 'patient@clinic.vn' THEN 'Bệnh nhân mặc định'
    WHEN 'nguyenvana@example.com' THEN 'Nguyễn Văn A'
    WHEN 'tranthiminh@example.com' THEN 'Trần Thị Bình'
    WHEN 'levanc@example.com' THEN 'Lê Văn C'
  END,
  CASE au.email
    WHEN 'patient@clinic.vn' THEN DATE '1995-06-15'
    WHEN 'nguyenvana@example.com' THEN DATE '1990-02-10'
    WHEN 'tranthiminh@example.com' THEN DATE '1992-11-20'
    WHEN 'levanc@example.com' THEN DATE '1988-04-08'
  END,
  CASE au.email
    WHEN 'patient@clinic.vn' THEN 'female'
    WHEN 'nguyenvana@example.com' THEN 'male'
    WHEN 'tranthiminh@example.com' THEN 'female'
    WHEN 'levanc@example.com' THEN 'male'
  END,
  CASE au.email
    WHEN 'patient@clinic.vn' THEN '12 Nguyễn Trãi, Quận 1, TP.HCM'
    WHEN 'nguyenvana@example.com' THEN '45 Lê Lợi, Quận 3, TP.HCM'
    WHEN 'tranthiminh@example.com' THEN '18 Võ Thị Sáu, Bình Thạnh, TP.HCM'
    WHEN 'levanc@example.com' THEN '77 Phan Xích Long, Phú Nhuận, TP.HCM'
  END,
  CASE au.email
    WHEN 'patient@clinic.vn' THEN 'Nguyễn Thị Mai'
    WHEN 'nguyenvana@example.com' THEN 'Nguyễn Thị Hồng'
    WHEN 'tranthiminh@example.com' THEN 'Trần Văn Hòa'
    WHEN 'levanc@example.com' THEN 'Lê Thị Loan'
  END,
  CASE au.email
    WHEN 'patient@clinic.vn' THEN '+84988800001'
    WHEN 'nguyenvana@example.com' THEN '+84988800002'
    WHEN 'tranthiminh@example.com' THEN '+84988800003'
    WHEN 'levanc@example.com' THEN '+84988800004'
  END,
  now(),
  now()
FROM auth.users au
WHERE au.email IN (
  'patient@clinic.vn',
  'nguyenvana@example.com',
  'tranthiminh@example.com',
  'levanc@example.com'
)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    address = EXCLUDED.address,
    emergency_contact_name = EXCLUDED.emergency_contact_name,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone,
    updated_at = now();

-- ============================================================
-- MEDICAL BACKGROUNDS
-- ============================================================
INSERT INTO patient_medical_backgrounds (id, user_id, entry_type, description, added_at)
SELECT '10000000-0000-4000-8000-000000000001'::uuid, au.id, 'allergy', 'Dị ứng penicillin', now() - interval '180 days'
FROM auth.users au WHERE au.email = 'patient@clinic.vn'
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, added_at = EXCLUDED.added_at;

INSERT INTO patient_medical_backgrounds (id, user_id, entry_type, description, added_at)
SELECT '10000000-0000-4000-8000-000000000002'::uuid, au.id, 'chronic_condition', 'Hen suyễn nhẹ theo mùa', now() - interval '120 days'
FROM auth.users au WHERE au.email = 'patient@clinic.vn'
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, added_at = EXCLUDED.added_at;

INSERT INTO patient_medical_backgrounds (id, user_id, entry_type, description, added_at)
SELECT '10000000-0000-4000-8000-000000000003'::uuid, au.id, 'allergy', 'Dị ứng phấn hoa', now() - interval '60 days'
FROM auth.users au WHERE au.email = 'nguyenvana@example.com'
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, added_at = EXCLUDED.added_at;

-- ============================================================
-- DEPENDENTS + NOTIFICATION PREFERENCES
-- ============================================================
INSERT INTO dependents (id, account_holder_id, full_name, date_of_birth, gender, relationship, is_active, created_at)
SELECT '20000000-0000-4000-8000-000000000001'::uuid, au.id, 'Nguyễn Bé Na', DATE '2018-03-20', 'female', 'child', true, now() - interval '30 days'
FROM auth.users au WHERE au.email = 'patient@clinic.vn'
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    relationship = EXCLUDED.relationship,
    is_active = EXCLUDED.is_active;

WITH default_patient AS (
  SELECT id FROM auth.users WHERE email = 'patient@clinic.vn'
)
INSERT INTO notification_preferences (patient_id, event_type, email_enabled, updated_at)
SELECT dp.id, pref.event_type, pref.email_enabled, now()
FROM default_patient dp
CROSS JOIN (
  VALUES
    ('appointment_confirmed', true),
    ('appointment_cancelled', true),
    ('appointment_rescheduled', true),
    ('appointment_reminder', true),
    ('waitlist_joined', false),
    ('waitlist_opportunity', true),
    ('document_uploaded', true)
) AS pref(event_type, email_enabled)
ON CONFLICT (patient_id, event_type) DO UPDATE
SET email_enabled = EXCLUDED.email_enabled,
    updated_at = EXCLUDED.updated_at;

-- ============================================================
-- LINK EXISTING SEEDED APPOINTMENTS TO AUTH USERS (for patient-facing pages)
-- ============================================================
UPDATE appointments AS a
SET user_id = au.id
FROM auth.users AS au
WHERE a.patient_email = au.email
  AND au.email IN (
    'nguyenvana@example.com',
    'tranthiminh@example.com',
    'levanc@example.com'
  );

-- ============================================================
-- DEMO APPOINTMENTS FOR patient@clinic.vn
-- ============================================================
INSERT INTO appointments (
  id,
  doctor_id,
  slot_start,
  slot_end,
  patient_name,
  patient_email,
  patient_phone,
  visit_reason,
  status,
  reminder_sent,
  created_at,
  updated_at,
  user_id,
  dependent_id,
  checked_in_at
)
SELECT
  'f1111111-1111-4111-8111-111111111111'::uuid,
  '8a1b2c3d-4e5f-4a89-abcd-ef0123456789'::uuid,
  now() + interval '1 day',
  now() + interval '1 day 30 minutes',
  'Bệnh nhân mặc định',
  'patient@clinic.vn',
  '+84900000001',
  'Tái khám định kỳ và kiểm tra chỉ số huyết áp',
  'confirmed',
  false,
  now() - interval '2 days',
  now() - interval '2 days',
  au.id,
  NULL,
  NULL
FROM auth.users au
WHERE au.email = 'patient@clinic.vn'
ON CONFLICT (id) DO UPDATE
SET slot_start = EXCLUDED.slot_start,
    slot_end = EXCLUDED.slot_end,
    visit_reason = EXCLUDED.visit_reason,
    status = EXCLUDED.status,
    reminder_sent = EXCLUDED.reminder_sent,
    updated_at = now(),
    user_id = EXCLUDED.user_id,
    dependent_id = EXCLUDED.dependent_id,
    checked_in_at = EXCLUDED.checked_in_at;

INSERT INTO appointments (
  id,
  doctor_id,
  slot_start,
  slot_end,
  patient_name,
  patient_email,
  patient_phone,
  visit_reason,
  status,
  reminder_sent,
  created_at,
  updated_at,
  user_id,
  dependent_id,
  checked_in_at
)
SELECT
  'f2222222-2222-4222-8222-222222222222'::uuid,
  'ac3d4e5f-6078-4cab-8ef0-1234567890ab'::uuid,
  now() - interval '2 days',
  now() - interval '2 days' + interval '30 minutes',
  'Bệnh nhân mặc định',
  'patient@clinic.vn',
  '+84900000001',
  'Đau ngực nhẹ khi vận động',
  'completed',
  true,
  now() - interval '5 days',
  now() - interval '1 day',
  au.id,
  NULL,
  now() - interval '2 days 15 minutes'
FROM auth.users au
WHERE au.email = 'patient@clinic.vn'
ON CONFLICT (id) DO UPDATE
SET slot_start = EXCLUDED.slot_start,
    slot_end = EXCLUDED.slot_end,
    visit_reason = EXCLUDED.visit_reason,
    status = EXCLUDED.status,
    reminder_sent = EXCLUDED.reminder_sent,
    updated_at = now(),
    user_id = EXCLUDED.user_id,
    dependent_id = EXCLUDED.dependent_id,
    checked_in_at = EXCLUDED.checked_in_at;

INSERT INTO appointments (
  id,
  doctor_id,
  slot_start,
  slot_end,
  patient_name,
  patient_email,
  patient_phone,
  visit_reason,
  status,
  reminder_sent,
  created_at,
  updated_at,
  user_id,
  dependent_id,
  checked_in_at
)
SELECT
  'f3333333-3333-4333-8333-333333333333'::uuid,
  '9b2c3d4e-5f60-4b9a-bcde-f0123456789a'::uuid,
  now() + interval '3 days',
  now() + interval '3 days 30 minutes',
  'Nguyễn Bé Na',
  'patient@clinic.vn',
  '+84900000001',
  'Khám da liễu cho trẻ em',
  'pending',
  false,
  now() - interval '1 day',
  now() - interval '1 day',
  au.id,
  dep.id,
  NULL
FROM auth.users au
JOIN dependents dep ON dep.account_holder_id = au.id
WHERE au.email = 'patient@clinic.vn'
  AND dep.id = '20000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (id) DO UPDATE
SET slot_start = EXCLUDED.slot_start,
    slot_end = EXCLUDED.slot_end,
    visit_reason = EXCLUDED.visit_reason,
    status = EXCLUDED.status,
    reminder_sent = EXCLUDED.reminder_sent,
    updated_at = now(),
    user_id = EXCLUDED.user_id,
    dependent_id = EXCLUDED.dependent_id,
    checked_in_at = EXCLUDED.checked_in_at;

-- ============================================================
-- PAYMENTS / INVOICES
-- ============================================================
INSERT INTO payments (
  id,
  appointment_id,
  amount,
  currency,
  status,
  invoice_number,
  invoice_path,
  paid_at,
  created_at
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001'::uuid,
    'f2222222-2222-4222-8222-222222222222'::uuid,
    350000,
    'VND',
    'paid',
    'INV-DEMO-0001',
    NULL,
    now() - interval '1 day',
    now() - interval '2 days'
  ),
  (
    '30000000-0000-4000-8000-000000000002'::uuid,
    'f1111111-1111-4111-8111-111111111111'::uuid,
    200000,
    'VND',
    'awaiting_payment',
    NULL,
    NULL,
    NULL,
    now() - interval '1 day'
  )
ON CONFLICT (id) DO UPDATE
SET amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    invoice_number = EXCLUDED.invoice_number,
    invoice_path = EXCLUDED.invoice_path,
    paid_at = EXCLUDED.paid_at,
    created_at = EXCLUDED.created_at;

-- ============================================================
-- MEDICAL RECORDS / PRESCRIPTIONS / LAB RESULTS
-- ============================================================
INSERT INTO medical_records (
  id,
  appointment_id,
  diagnosis,
  examination_notes,
  recorded_by,
  created_at,
  updated_at
)
SELECT
  '40000000-0000-4000-8000-000000000001'::uuid,
  'f2222222-2222-4222-8222-222222222222'::uuid,
  'Đau thành ngực, chưa ghi nhận dấu hiệu cấp cứu tim mạch',
  'Mạch và huyết áp ổn định. Khuyến nghị theo dõi thêm và tái khám sau 2 tuần.',
  au.id,
  now() - interval '2 days',
  now() - interval '1 day'
FROM auth.users au
WHERE au.email = 'dr.duc@clinic.vn'
ON CONFLICT (appointment_id) DO UPDATE
SET diagnosis = EXCLUDED.diagnosis,
    examination_notes = EXCLUDED.examination_notes,
    recorded_by = EXCLUDED.recorded_by,
    updated_at = EXCLUDED.updated_at;

INSERT INTO prescription_items (
  id,
  medical_record_id,
  medication_name,
  dosage,
  frequency,
  duration,
  notes
)
VALUES
  (
    '50000000-0000-4000-8000-000000000001'::uuid,
    '40000000-0000-4000-8000-000000000001'::uuid,
    'Paracetamol',
    '500mg',
    'Ngày 2 lần',
    '3 ngày',
    'Uống sau ăn'
  ),
  (
    '50000000-0000-4000-8000-000000000002'::uuid,
    '40000000-0000-4000-8000-000000000001'::uuid,
    'Vitamin B complex',
    '1 viên',
    'Ngày 1 lần',
    '14 ngày',
    'Dùng buổi sáng'
  )
ON CONFLICT (id) DO UPDATE
SET medication_name = EXCLUDED.medication_name,
    dosage = EXCLUDED.dosage,
    frequency = EXCLUDED.frequency,
    duration = EXCLUDED.duration,
    notes = EXCLUDED.notes;

INSERT INTO lab_orders (
  id,
  appointment_id,
  test_name,
  type,
  instructions,
  ordered_by,
  status,
  created_at
)
SELECT
  '60000000-0000-4000-8000-000000000001'::uuid,
  'f2222222-2222-4222-8222-222222222222'::uuid,
  'Điện tâm đồ',
  'imaging',
  'Thực hiện trong vòng 24 giờ và mang kết quả tái khám.',
  au.id,
  'result_available',
  now() - interval '2 days'
FROM auth.users au
WHERE au.email = 'dr.duc@clinic.vn'
ON CONFLICT (id) DO UPDATE
SET test_name = EXCLUDED.test_name,
    type = EXCLUDED.type,
    instructions = EXCLUDED.instructions,
    ordered_by = EXCLUDED.ordered_by,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

INSERT INTO examination_results (
  id,
  lab_order_id,
  result_text,
  file_path,
  uploaded_by,
  uploaded_at
)
SELECT
  '70000000-0000-4000-8000-000000000001'::uuid,
  '60000000-0000-4000-8000-000000000001'::uuid,
  'Nhịp xoang, chưa ghi nhận bất thường đáng kể.',
  NULL,
  au.id,
  now() - interval '1 day'
FROM auth.users au
WHERE au.email = 'dr.duc@clinic.vn'
ON CONFLICT (lab_order_id) DO UPDATE
SET result_text = EXCLUDED.result_text,
    file_path = EXCLUDED.file_path,
    uploaded_by = EXCLUDED.uploaded_by,
    uploaded_at = EXCLUDED.uploaded_at;

COMMIT;