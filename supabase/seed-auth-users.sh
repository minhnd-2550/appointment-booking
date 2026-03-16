#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
POST_AUTH_SQL="$ROOT_DIR/supabase/seed-post-auth.sql"
LOCAL_DB_CONTAINER="${SUPABASE_LOCAL_DB_CONTAINER:-supabase_db_appointment-booking}"

load_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

run_sql_file() {
  local sql_file="$1"

  if [[ ! -f "$sql_file" ]]; then
    echo "Missing SQL file: $sql_file"
    exit 1
  fi

  if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
    require_command psql
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
    return
  fi

  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "$LOCAL_DB_CONTAINER"; then
    docker exec -i "$LOCAL_DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < "$sql_file"
    return
  fi

  echo "Missing SUPABASE_DB_URL and local Supabase container '$LOCAL_DB_CONTAINER' was not found."
  echo "Set SUPABASE_DB_URL to run against a remote Supabase database."
  exit 1
}

load_env_file

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SERVICE_ROLE_KEY" ]]; then
  echo "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  echo "Set them in the environment or in $ENV_FILE"
  exit 1
fi

require_command curl

create_user() {
  local email="$1"
  local password="$2"
  local role="$3"
  local full_name="$4"
  local response body http_status

  response=$(curl -sS -w $'\n%{http_code}' -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true,\"user_metadata\":{\"role\":\"$role\",\"full_name\":\"$full_name\"}}")

  body="${response%$'\n'*}"
  http_status="${response##*$'\n'}"

  if [[ "$http_status" =~ ^2 ]]; then
    echo "Seeded auth user: $email"
    return
  fi

  if echo "$body" | grep -Eiq 'already|registered|exists'; then
    echo "Auth user already exists: $email"
    return
  fi

  echo "Failed to seed auth user: $email"
  echo "$body"
  exit 1
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

echo "Applying post-auth seed data..."
run_sql_file "$POST_AUTH_SQL"

echo "Done. You can now sign in with seeded accounts."
