#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
BASE_SEED_SQL="$ROOT_DIR/supabase/seed.sql"
AUTH_SEED_SCRIPT="$ROOT_DIR/supabase/seed-auth-users.sh"

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

load_env_file

require_command bash
require_command psql

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Missing SUPABASE_DB_URL."
  echo "Add it to $ENV_FILE or export it before running this script."
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  echo "These are required because the auth seeding step uses the Supabase Admin API."
  exit 1
fi

if [[ "${SEED_ALLOW_NONEMPTY:-false}" != "true" ]]; then
  existing_counts=$(psql "$SUPABASE_DB_URL" -Atqc "select coalesce((select count(*) from public.doctors),0)::text || ':' || coalesce((select count(*) from public.appointments),0)::text")
  doctors_count="${existing_counts%%:*}"
  appointments_count="${existing_counts##*:}"

  if [[ "$doctors_count" != "0" || "$appointments_count" != "0" ]]; then
    echo "Refusing to seed a non-empty database (doctors=$doctors_count, appointments=$appointments_count)."
    echo "Run this against a fresh/staging database, or set SEED_ALLOW_NONEMPTY=true if you really want to proceed."
    exit 1
  fi
fi

echo "Applying base demo seed SQL to remote database..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$BASE_SEED_SQL"

echo "Creating auth users and post-auth demo data..."
bash "$AUTH_SEED_SCRIPT"

cat <<'EOF'

Remote demo seed completed.

Demo accounts:
- admin@clinic.vn / Admin@123456
- dr.an@clinic.vn / Doctor@123456
- dr.bich@clinic.vn / Doctor@123456
- dr.duc@clinic.vn / Doctor@123456
- receptionist@clinic.vn / Receptionist@123456
- patient@clinic.vn / Patient@123456

The deployed site should now have demo doctors, schedules, appointments,
patient profile data, dependents, invoices, and clinical details.
EOF