-- Migration: Lab orders, examination results, services, and payments tables

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE lab_orders (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  test_name      text        NOT NULL,
  type           text        NOT NULL CHECK (type IN ('lab', 'imaging', 'other')),
  instructions   text,
  ordered_by     uuid        NOT NULL REFERENCES auth.users(id),
  status         text        NOT NULL CHECK (status IN ('ordered', 'result_available')) DEFAULT 'ordered',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE examination_results (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid        NOT NULL UNIQUE REFERENCES lab_orders(id) ON DELETE CASCADE,
  result_text  text,
  file_path    text,  -- Supabase Storage object path (NOT a public URL)
  uploaded_by  uuid        NOT NULL REFERENCES auth.users(id),
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE services (
  id                       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text           NOT NULL,
  default_duration_minutes smallint       NOT NULL,
  default_fee              numeric(10, 2) NOT NULL,
  currency                 text           NOT NULL DEFAULT 'VND',
  is_active                boolean        NOT NULL DEFAULT true,
  created_at               timestamptz    NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid           NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  amount         numeric(10, 2) NOT NULL,
  currency       text           NOT NULL,
  status         text           NOT NULL
                   CHECK (status IN ('awaiting_payment', 'paid', 'refund_pending', 'refunded', 'voided'))
                   DEFAULT 'awaiting_payment',
  invoice_number text           UNIQUE,  -- set on paid (sequential: INV-YYYYMM-{seq})
  invoice_path   text,                   -- Supabase Storage object path for PDF
  paid_at        timestamptz,
  created_at     timestamptz    NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED: sample services
-- ============================================================

INSERT INTO services (name, default_duration_minutes, default_fee, currency) VALUES
  ('Khám tổng quát', 30, 200000, 'VND'),
  ('Tư vấn chuyên khoa', 45, 350000, 'VND'),
  ('Khám và tư vấn dinh dưỡng', 30, 250000, 'VND');

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX lab_orders_appointment_id_idx ON lab_orders(appointment_id);
CREATE INDEX payments_appointment_id_idx ON payments(appointment_id);
CREATE INDEX payments_status_idx ON payments(status);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE examination_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- lab_orders: provider (their appointments) writes; patient reads own; admin reads all
CREATE POLICY "lab_orders_provider_all" ON lab_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE a.id = lab_orders.appointment_id
    )
  );

CREATE POLICY "lab_orders_patient_select" ON lab_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = lab_orders.appointment_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "lab_orders_admin_select" ON lab_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- examination_results: same access pattern as lab_orders
CREATE POLICY "exam_results_provider_all" ON examination_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lab_orders lo
      JOIN appointments a ON a.id = lo.appointment_id
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE lo.id = examination_results.lab_order_id
    )
  );

CREATE POLICY "exam_results_patient_select" ON examination_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lab_orders lo
      JOIN appointments a ON a.id = lo.appointment_id
      WHERE lo.id = examination_results.lab_order_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "exam_results_admin_select" ON examination_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- services: all authenticated users can read; only admin can write
CREATE POLICY "services_read_all" ON services
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "services_admin_write" ON services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- payments: patient reads own; admin reads all; writes via service role only
CREATE POLICY "payments_patient_select" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_admin_select" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "payments_provider_select" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN user_profiles up ON up.id = auth.uid() AND up.role = 'provider' AND up.doctor_id = a.doctor_id
      WHERE a.id = payments.appointment_id
    )
  );
