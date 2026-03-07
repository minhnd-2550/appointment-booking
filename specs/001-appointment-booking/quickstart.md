# Quickstart: Clinic Appointment Booking System

**Branch**: `001-appointment-booking`  
**Date**: 2026-03-05

Get the development environment running locally in ~10 minutes.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| pnpm | 9+ | `npm install -g pnpm` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| Docker Desktop | latest | Required by Supabase local dev |
| Git | any | Pre-installed on macOS |

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/your-org/appointment-booking.git
cd appointment-booking
git checkout 001-appointment-booking
pnpm install
```

---

## Step 2 — Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values:

```bash
# Supabase (local dev — values from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase start>

# Email — set to 'true' to skip real sending and log to console
MOCK_EMAIL=true

# Required even in mock mode (can be any non-empty string for local dev)
RESEND_API_KEY=re_placeholder

# Vercel Cron secret (protects the /api/cron/reminders endpoint)
CRON_SECRET=local-dev-secret-change-in-prod
```

> **Never** prefix secret keys with `NEXT_PUBLIC_` — they would be exposed to
> the browser bundle.

---

## Step 3 — Start Supabase Locally

```bash
supabase start
```

This starts a local Postgres instance, Auth server, Realtime, and Studio UI.
Note the printed `API URL`, `anon key`, and `service_role key` — copy these
into `.env.local`.

Apply migrations and seed data:

```bash
supabase db reset
# Runs all supabase/migrations/*.sql then supabase/seed.sql
```

**Supabase Studio** is available at http://127.0.0.1:54323 — use it to inspect
tables, test RLS policies, and run queries during development.

---

## Step 4 — Generate TypeScript Types

After running migrations, generate the `Database` type from the live schema:

```bash
supabase gen types typescript --local > src/types/database.ts
```

Re-run this any time you add or modify a migration.

---

## Step 5 — Start the Development Server

```bash
pnpm dev
```

| Route | Description |
|-------|-------------|
| http://localhost:3000 | Patient booking flow (public) |
| http://localhost:3000/dashboard | Provider dashboard (requires login) |
| http://localhost:3000/admin/schedules | Admin schedule config (requires login) |
| http://localhost:3000/auth/login | Login page |

---

## Seed Data (local dev)

`supabase/seed.sql` creates:
- **2 admin users**: `admin@clinic.local` / `password123`
- **3 providers**: `dr.lan@clinic.local`, `dr.minh@clinic.local`, `dr.hung@clinic.local` / `password123`
- **3 doctors** linked to the providers, with sample working schedules (Mon–Fri 09:00–17:00, 30-min slots)
- **10 sample appointments** in various statuses

---

## Running Tests

```bash
# Unit tests (slot generation logic)
pnpm test

# Watch mode
pnpm test:watch

# E2E tests (requires dev server running + local Supabase)
pnpm exec playwright install   # first time only
pnpm test:e2e

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## Simulate Reminder Cron Job Locally

The Vercel Cron job calls `GET /api/cron/reminders` with a secret header.
To trigger it manually in dev:

```bash
curl -H "Authorization: Bearer local-dev-secret-change-in-prod" \
  http://localhost:3000/api/cron/reminders
```

With `MOCK_EMAIL=true`, reminder emails are printed to the Next.js server
console instead of being sent.

---

## Adding a New Migration

```bash
supabase migration new <descriptive_name>
# Creates: supabase/migrations/<timestamp>_<descriptive_name>.sql
# Edit the file, then:
supabase db reset   # applies all migrations from scratch
# Or (to apply only new migrations on a running local instance):
supabase db push --local
```

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript compile check (`tsc --noEmit`) |
| `pnpm lint` | ESLint check |
| `pnpm test` | Vitest unit/integration tests |
| `pnpm test:e2e` | Playwright E2E tests |
| `supabase start` | Start local Supabase stack |
| `supabase stop` | Stop local Supabase stack |
| `supabase db reset` | Reset DB and re-apply all migrations + seed |
| `supabase gen types typescript --local > src/types/database.ts` | Regenerate DB types |
| `supabase migration new <name>` | Create a new migration file |

---

## Deployment (Vercel + Supabase Cloud)

1. Push branch to GitHub; Vercel auto-deploys on merge to `main`.
2. Set all environment variables in Vercel project settings.
3. Run `supabase db push` against the production Supabase project to apply migrations.
4. `vercel.json` defines the cron job — Vercel activates it automatically on Pro+.
