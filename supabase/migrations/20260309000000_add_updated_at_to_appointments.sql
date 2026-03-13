-- Migration: Add updated_at column to appointments table
-- Reason: API endpoint PATCH /appointments/[id]/status tries to update this column
--         but it was missing from the initial schema

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Optional: Create trigger to auto-update updated_at on any update
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appointments_updated_at_trigger ON appointments;
CREATE TRIGGER appointments_updated_at_trigger
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();
