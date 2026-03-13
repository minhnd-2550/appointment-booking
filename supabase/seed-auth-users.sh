#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local"
  exit 1
fi

SUPABASE_URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
SERVICE_ROLE_KEY="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2-)"

if [[ -z "$SUPABASE_URL" || -z "$SERVICE_ROLE_KEY" ]]; then
  echo "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  exit 1
fi

create_user() {
  local email="$1"
  local password="$2"
  local role="$3"
  local full_name="$4"

  curl -sS -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true,\"user_metadata\":{\"role\":\"$role\",\"full_name\":\"$full_name\"}}" \
    >/dev/null

  echo "Seeded auth user: $email"
}

create_user "admin@clinic.vn" "Admin@123456" "admin" "Nguyễn Quản Trị Viên"
create_user "dr.an@clinic.vn" "Doctor@123456" "provider" "Dr. Nguyễn Văn An"
create_user "dr.bich@clinic.vn" "Doctor@123456" "provider" "Dr. Lê Thị Bích"
create_user "dr.duc@clinic.vn" "Doctor@123456" "provider" "Dr. Trần Minh Đức"
create_user "receptionist@clinic.vn" "Receptionist@123456" "receptionist" "Lê Thị Thu Trang"
create_user "patient@clinic.vn" "Patient@123456" "patient" "Bệnh nhân mặc định"
create_user "nguyenvana@example.com" "Patient@123456" "patient" "Nguyễn Văn A"
create_user "tranthiminh@example.com" "Patient@123456" "patient" "Trần Thị Bình"
create_user "levanc@example.com" "Patient@123456" "patient" "Lê Văn C"

# Link provider profiles to doctors after trigger created user_profiles rows
docker exec supabase_db_appointment-booking psql -U postgres -d postgres -c "\
  update user_profiles set doctor_id='8a1b2c3d-4e5f-4a89-abcd-ef0123456789' where email='dr.an@clinic.vn';\
  update user_profiles set doctor_id='9b2c3d4e-5f60-4b9a-bcde-f0123456789a' where email='dr.bich@clinic.vn';\
  update user_profiles set doctor_id='ac3d4e5f-6078-4cab-8ef0-1234567890ab' where email='dr.duc@clinic.vn';\
" >/dev/null

echo "Done. You can now sign in with seeded accounts."
