# Tasks: Clinic Appointment Booking System

**Input**: Design documents from `/specs/001-appointment-booking/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅
**Branch**: `001-appointment-booking`
**Generated**: 2026-03-05

**Tech Stack**: Next.js 16 (App Router), TypeScript 5.9+, Node.js 22 LTS, Supabase (PostgreSQL 15 + Auth + Realtime), Tailwind CSS 4, shadcn/ui, zod@4, react-hook-form@7, resend@6, react-day-picker@9, date-fns@4 + date-fns-tz@3, @tanstack/react-query@5, @react-email/components@1, Vercel Cron

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story ([US1]–[US4]) this task belongs to
- Paths relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Bootstrap Next.js monorepo, tooling, CI config, and environment scaffolding.

- [x] T001 Initialize Next.js 16 project with App Router (`npx create-next-app@latest --typescript --tailwind --app --src-dir`) at repository root
- [x] T002 Install all primary dependencies: `@supabase/supabase-js@2 @supabase/ssr@0.9 zod@4 react-hook-form@7 @hookform/resolvers@5 resend@6 react-day-picker@9 date-fns@4 date-fns-tz@3 @tanstack/react-query@5 @react-email/components@1`
- [x] T003 [P] Configure TypeScript strict mode in `tsconfig.json` (`"strict": true`, `"noUncheckedIndexedAccess": true`, path aliases `@/*` → `src/*`)
- [x] T004 [P] Configure Tailwind CSS v4 with CSS-first config in `src/app/globals.css` (remove `tailwind.config.js`, use `@import "tailwindcss"` + `@theme` directive)
- [x] T005 [P] Initialize shadcn/ui: run `npx shadcn@latest init`, add base components: `button`, `dialog`, `form`, `input`, `label`, `select`, `badge`, `card`, `toast`
- [x] T006 [P] Create `.env.example` documenting all required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `MOCK_EMAIL`
- [x] T007 [P] Initialize Supabase local dev: `supabase init`; configure `supabase/config.toml` for local dev port 54321
- [x] T008 [P] Create `vercel.json` with cron job definition: `GET /api/cron/reminders` every 5 minutes, protected by `CRON_SECRET` header

**Checkpoint**: `pnpm dev` starts without errors; `.env.local` template is complete.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth infrastructure, Supabase clients, TypeScript types, and slot-generation core logic. ALL user story phases depend on this being complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is 100% complete.

### Database & Schema

- [x] T009 Create migration `supabase/migrations/20260305000000_initial_schema.sql`:
  - Enums: `appointment_status ('pending','confirmed','cancelled')`, `user_role ('provider','admin')`
  - Tables: `doctors`, `working_schedules`, `blocked_periods`, `appointments`, `notification_logs`, `user_profiles` with all columns, constraints, and FKs per data-model.md
  - Indexes: partial unique index `appointments_doctor_slot_unique ON appointments(doctor_id, slot_start) WHERE status IN ('pending','confirmed')`, performance indexes `appointments_doctor_id_slot_start_idx`, `appointments_reminder_idx`
  - RLS: enable on all 6 tables; add all SELECT/INSERT/UPDATE/DELETE policies per data-model.md
- [x] T010 Create migration `supabase/migrations/20260305000001_book_appointment_function.sql`:
  - PL/pgSQL function `book_appointment(p_doctor_id uuid, p_slot_start timestamptz, p_slot_end timestamptz, p_patient_name text, p_patient_email text, p_patient_phone text, p_visit_reason text)` — inserts into `appointments` atomically, raises exception on conflict with the partial unique index, returns new appointment row
- [x] T011 Create `supabase/seed.sql` with: 3 sample doctors, working schedules (Mon–Fri 09:00–17:00, 30-min slots), 1 blocked period, 1 admin user, 2 provider users linked to doctors

### Auth & Supabase Clients

- [x] T012 [P] Create `src/lib/supabase/client.ts` — `createBrowserClient` using `@supabase/ssr` for use in Client Components; typed with generated `Database` type
- [x] T013 [P] Create `src/lib/supabase/server.ts` — `createServerClient` using `@supabase/ssr` cookies for Server Components and Route Handlers; typed with generated `Database` type
- [x] T014 Create `src/middleware.ts` — Supabase session refresh on every request; protect `/(provider)/**` routes for `provider` and `admin` roles; protect `/(admin)/**` routes for `admin` role only; redirect unauthenticated to `/auth/login`

### TypeScript Types

- [x] T015 [P] Create `src/types/domain.ts` with: `AppointmentStatus` enum, `UserRole` enum, `Doctor` interface, `Appointment` interface, `WorkingSchedule` interface, `BlockedPeriod` interface, `SlotDTO { start: string; end: string; available: boolean }`, booking form payload types, API response/error types
- [x] T016 Run `supabase gen types typescript --local > src/types/database.ts` and commit generated output (re-run whenever schema migrations change)

### Core Scheduling Logic (Pure Function)

- [x] T017 Create `src/lib/scheduling/slots.ts` — pure function `generateSlots(schedule: WorkingSchedule, date: Date, blockedPeriods: BlockedPeriod[], takenSlots: Date[], timezone: string): SlotDTO[]`:
  - Step 1: Generate candidate slots from `start_time` to `end_time` in `slot_duration_minutes` increments using `date-fns@4`
  - Step 2: Filter out slots overlapping any `blocked_periods` interval
  - Step 3: Filter out slots matching any `takenSlots` entry
  - Step 4: Convert UTC times to `timezone` for display using `date-fns-tz@3`
  - Returns array of `SlotDTO` — this function has zero side effects and is unit-testable in isolation

### Notification Infrastructure

- [x] T018 [P] Create `src/lib/notifications/send.ts` — `sendNotification(type: NotificationType, to: string, data: NotificationPayload): Promise<void>`:
  - If `process.env.MOCK_EMAIL === 'true'`: log to `console.log` (no external call)
  - Otherwise: use `resend@6` `emails.send()` with rendered React Email template
  - On failure: log structured error + retry once; log final status to `notification_logs`
- [x] T019 [P] Create `src/lib/notifications/templates/booking-received.tsx` — `@react-email/components` template for "Booking Received" email (patient name, doctor name, slot date/time, clinic address placeholder)
- [x] T020 [P] Create `src/lib/notifications/templates/confirmed.tsx` — React Email template for "Appointment Confirmed"
- [x] T021 [P] Create `src/lib/notifications/templates/cancelled.tsx` — React Email template for "Appointment Cancelled"
- [x] T022 [P] Create `src/lib/notifications/templates/reminder.tsx` — React Email template for "Reminder: Your appointment is tomorrow"

**Checkpoint**: `supabase start` applies migrations; `supabase db seed` loads seed data; `supabase gen types typescript --local` completes without errors; `generateSlots()` is importable.

---

## Phase 3: User Story 1 — Patient Books an Appointment (Priority: P1) 🎯 MVP

**Goal**: A patient visits the booking page, selects doctor + date + slot, fills contact form, and submits. System creates `pending` appointment atomically, slot disappears from availability, patient receives "Booking Received" email.

**Independent Test**: Open `/` → click a doctor → pick today (if working hours configured via seed) → select a slot → submit form with valid email → verify `appointments` in Supabase has new row with `status = 'pending'` → verify mock email log shows "booking-received" notification → verify the booked slot no longer appears for another browser session.

### API: Slot Availability

- [x] T023 [US1] Create `src/app/api/slots/route.ts` — `GET /api/slots?doctorId&date&timezone`:
  - Parse + validate query params with zod@4 (`z.object({ doctorId: z.string().uuid(), date: z.string().date(), timezone: z.string() })`)
  - Use `server.ts` Supabase client (anon key — public read)
  - Fetch `working_schedules` for doctor on `date`'s day-of-week
  - Fetch `blocked_periods` overlapping `date`
  - Fetch `appointments` where `doctor_id = ? AND slot_start::date = ? AND status IN ('pending','confirmed')`
  - Call `generateSlots()` from `src/lib/scheduling/slots.ts`
  - Return `{ slots: SlotDTO[] }` with 200; return `{ slots: [] }` when no schedule configured — never throw 500 for empty availability
  - Contract ref: `contracts/slots.md`

### API: Create Appointment

- [x] T024 [US1] Create `src/app/api/appointments/route.ts` — `POST /api/appointments`:
  - Validate body with zod@4: `{ doctorId: uuid, slotStart: iso-datetime, slotEnd: iso-datetime, patientName: string (min 2), patientEmail: email, patientPhone?: string, visitReason?: string }`
  - Call `book_appointment()` Supabase RPC via service-role client
  - On conflict (Postgres unique violation code `23505`): return 409 `{ error: 'SLOT_TAKEN', message: 'This slot was just taken — please choose another' }`
  - On success: fire `sendNotification('booking-received', patientEmail, { ... })` asynchronously (do not await in response path)
  - Return 201 `{ appointment: AppointmentDTO }`
  - Contract ref: `contracts/appointments.md`

### UI: Doctor Listing Page

- [x] T025 [US1] Create `src/app/(public)/page.tsx` — Server Component listing all `is_active = true` doctors from Supabase; renders `<DoctorCard>` grid with name, specialty, bio, avatar; each card links to `/book/[doctorId]`
- [x] T026 [P] [US1] Create `src/components/booking/DoctorCard.tsx` — Client Component: doctor avatar, name, specialty badge, "Book Appointment" button; accepts `Doctor` prop; uses shadcn/ui `Card`

### UI: Slot Picker & Booking Form

- [x] T027 [US1] Create `src/app/(public)/book/[doctorId]/page.tsx` — Server Component: fetch doctor by `doctorId` (return 404 if not found or inactive); render `<SlotCalendar>` + `<BookingForm>` below; pass doctor data as props
- [x] T028 [US1] Create `src/components/booking/SlotCalendar.tsx` — Client Component using `react-day-picker@9`:
  - On date select: `GET /api/slots?doctorId&date&timezone` via `fetch` (TanStack Query)
  - Renders `<SlotGrid>` with returned slots
  - Subscribe to Supabase Realtime `postgres_changes` on `appointments` table filtered by `doctor_id` → invalidate TanStack Query cache on change to reflect live availability
- [x] T029 [US1] Create `src/components/booking/SlotGrid.tsx` — Client Component: renders time-slot buttons; disabled state for `available: false` slots; selected state styling; emits `onSlotSelect(slot: SlotDTO)` callback; shows "No available slots" message when array is empty
- [x] T030 [US1] Create `src/components/booking/BookingForm.tsx` — Client Component with `react-hook-form@7` + `@hookform/resolvers@5` + zod@4 schema:
  - Fields: Patient Name (required, min 2 chars), Email (required, valid email), Phone (optional), Visit Reason (optional textarea)
  - On submit: `POST /api/appointments`; on 409 response: show inline error "This slot was just taken — please choose another" and reset slot selection (preserve other field values)
  - On 201: show success toast and redirect to confirmation page or show inline confirmation message
  - Disable submit button during pending request

**Checkpoint**: Full booking flow end-to-end: patient can book a slot; slot disappears in real-time for other users; mock email log shows notification; concurrent booking returns 409.

---

## Phase 4: User Story 2 — Provider Confirms or Cancels (Priority: P2)

**Goal**: A provider logs in, views their pending appointments on a real-time dashboard, and confirms or cancels each one. Patient receives email on either action.

**Independent Test**: Log in as a provider (seed data); verify the dashboard shows the `pending` appointment created in US1; click "Confirm" → status changes to `confirmed` in Supabase + mock email log shows "confirmed" notification; open a second browser tab — new pending appointment appears without page reload; click "Cancel" → status changes to `cancelled` + mock email shows "cancelled" notification.

### Auth Pages

- [x] T031 [US2] Create `src/app/auth/login/page.tsx` — Client Component with `react-hook-form` + zod: email + password fields; calls `supabase.auth.signInWithPassword()`; on success: redirect based on `user_profiles.role` (`provider` → `/dashboard`, `admin` → `/admin/schedules`); show inline error on auth failure
- [x] T032 [US2] Create `src/app/auth/callback/route.ts` — `GET` Route Handler: exchanges Supabase auth code for session via `@supabase/ssr`; redirects to `/dashboard` or `/` based on role

### API: Appointment Status Update

- [x] T033 [US2] Create `src/app/api/appointments/[id]/status/route.ts` — `PATCH /api/appointments/[id]/status`:
  - Require authenticated session (server client); reject 401 if unauthenticated
  - Validate `await params` (Next.js 16 async params): `id` must be valid UUID
  - Validate body with zod@4: `{ status: z.enum(['confirmed', 'cancelled']) }`
  - Load current appointment; enforce allowed transitions: `pending → confirmed`, `pending → cancelled`, `confirmed → cancelled`; reject invalid transitions with 422 `{ error: 'INVALID_TRANSITION' }`
  - Verify provider can only update appointments belonging to their linked `doctor_id`
  - Update `status` in Supabase; fire `sendNotification('confirmed' | 'cancelled', patientEmail, { ... })` asynchronously
  - On `cancelled`: the partial unique index drop happens automatically (slot becomes available again)
  - Return 200 `{ appointment: AppointmentDTO }`
  - Contract ref: `contracts/appointments.md`

### UI: Provider Dashboard

- [x] T034 [US2] Create `src/app/(provider)/dashboard/page.tsx` — Server Component: protected by middleware; fetch initial appointment list for authenticated provider's `doctor_id`; pass to `<AppointmentList>`; wrap page in `QueryClientProvider` for client-side cache
- [x] T035 [US2] Create `src/components/dashboard/AppointmentList.tsx` — Client Component:
  - Subscribe to Supabase Realtime `postgres_changes` on `appointments` filtered by `doctor_id`; on INSERT → prepend new row; on UPDATE → update in-place without full refetch
  - Renders list of `<AppointmentRow>` sorted by `slot_start ASC`
  - Filter tabs: All / Pending / Confirmed / Cancelled (client-side filter, no additional API call)
- [x] T036 [US2] Create `src/components/dashboard/AppointmentRow.tsx` — Client Component: show patient name, slot date/time (local timezone), status badge; render "Confirm" (`pending` only) and "Cancel" (`pending` or `confirmed`) action buttons; optimistic UI update on action; revert on error; `PATCH /api/appointments/[id]/status` on click; disable buttons during in-flight request

**Checkpoint**: Provider dashboard shows real-time updates; confirm/cancel flow works; emails logged; invalid transitions rejected.

---

## Phase 5: User Story 3 — 24-Hour Reminder (Priority: P3)

**Goal**: Every `confirmed` appointment automatically receives a reminder email ~24 hours before `slot_start`. Delivered via Vercel Cron, idempotent, failures logged and retried.

**Independent Test**: Insert a `confirmed` appointment with `slot_start = NOW() + interval '24h 10m'` and `reminder_sent = false` into the DB; call `GET /api/cron/reminders` with `Authorization: Bearer {CRON_SECRET}` header; verify `reminder_sent` flips to `true` in DB; verify mock email log shows "reminder" notification; call the endpoint again → verify no duplicate email sent (idempotent).

### API: Cron Reminder Endpoint

- [x] T037 [US3] Create `src/app/api/cron/reminders/route.ts` — `GET` handler:
  - Validate `Authorization: Bearer {CRON_SECRET}` header; return 401 if missing or incorrect
  - Use service-role Supabase client
  - Query `appointments` using `appointments_reminder_idx`: `status = 'confirmed' AND reminder_sent = false AND slot_start BETWEEN NOW() + interval '23h 55m' AND NOW() + interval '24h 5m'`
  - For each result: call `sendNotification('reminder', patient_email, { ... })`; on success: `UPDATE appointments SET reminder_sent = true WHERE id = ?`; on failure: log to `notification_logs` with `status = 'failed'`; retry once
  - Return 200 `{ processed: number, succeeded: number, failed: number }`
  - Contract ref: `contracts/appointments.md` (cron section)

**Checkpoint**: Cron endpoint is callable manually; processes correct appointments; `reminder_sent` flag set atomically; duplicate-safe.

---

## Phase 6: User Story 4 — Admin Configures Working Hours & Blocked Periods (Priority: P4)

**Goal**: Admin logs in to `/admin/schedules`, selects a doctor, configures their recurring weekly schedule and one-off blocked periods. Changes are immediately reflected in the booking calendar.

**Independent Test**: Log in as admin; set Monday 09:00–17:00 (30-min slots) for a doctor → open the booking calendar for that doctor on next Monday → verify exactly 16 slots (8h / 30min = 16) appear; add a blocked period for the same Monday → verify all slots disappear; attempt to add a block over an existing `confirmed` appointment → verify warning modal appears before proceeding.

### API: Schedules

- [x] T038 [US4] Create `src/app/api/schedules/route.ts` — `GET /api/schedules?doctorId` (returns working schedules) and `POST /api/schedules` (create/update a day's schedule):
  - `GET`: public read; validate `doctorId` query param
  - `POST`: require `admin` role; validate body with zod@4: `{ doctorId: uuid, dayOfWeek: 0–6, startTime: HH:mm, endTime: HH:mm, slotDurationMinutes: 15–120 }`, enforce `startTime < endTime`; upsert on `UNIQUE(doctor_id, day_of_week)`
  - Return 201 with created/updated schedule
  - Contract ref: `contracts/schedules.md`
- [x] T039 [US4] Create `src/app/api/schedules/[id]/route.ts` — `PATCH` (update schedule) and `DELETE` (remove day's schedule):
  - Both require `admin` role; validate `await params.id` as UUID
  - `PATCH`: partial update with zod@4 partial schema
  - Contract ref: `contracts/schedules.md`

### API: Blocked Periods

- [x] T040 [US4] Create `src/app/api/blocked-periods/route.ts` — `GET /api/blocked-periods?doctorId` and `POST /api/blocked-periods`:
  - `POST`: require `admin` role; validate body: `{ doctorId: uuid, startAt: iso-datetime, endAt: iso-datetime, reason?: string }`, enforce `startAt < endAt`
  - **Conflict check**: before inserting, query `appointments` for `status IN ('pending','confirmed')` overlapping the blocked interval for this doctor; if found, return 409 `{ error: 'APPOINTMENT_CONFLICT', conflicts: AppointmentDTO[] }` so the UI can show a warning
  - Contract ref: `contracts/schedules.md`
- [x] T041 [US4] Create `src/app/api/blocked-periods/[id]/route.ts` — `DELETE`:
  - Require `admin` role; validate `await params.id` as UUID
  - Same conflict check before deletion that frees slots: warn if `confirmed` appointments exist
  - Contract ref: `contracts/schedules.md`

### UI: Admin Schedule Editor

- [x] T042 [US4] Create `src/app/(admin)/admin/schedules/page.tsx` — Server Component (admin-only, protected by middleware): fetch doctor list; render `<ScheduleEditor>` with doctor selector
- [x] T043 [US4] Create `src/components/admin/ScheduleEditor.tsx` — Client Component:
  - Doctor selector (shadcn/ui `Select`)
  - Weekly schedule grid: 7 rows (Sun–Sat); each row has enable toggle, start-time input, end-time input, slot-duration input
  - On save per row: `POST /api/schedules`; show success toast; on error: show inline error
  - Uses `react-hook-form@7` + zod@4 for each row form
- [x] T044 [US4] Create `src/components/admin/BlockedPeriodForm.tsx` — Client Component:
  - Form for adding blocked period: doctor selector (inherited from parent), date-range picker (`react-day-picker@9`), optional time range, optional reason field
  - On `POST /api/blocked-periods` returning 409 conflict: render shadcn/ui `Dialog` warning listing conflicting appointments; "Proceed anyway" calls `DELETE + re-POST` or backend force-flag; "Cancel" dismisses
  - On success: invalidate TanStack Query slot cache for affected doctor+dates

**Checkpoint**: Admin can configure schedules and blocked periods; booking calendar reflects changes immediately; conflict warning appears before overwriting existing appointments.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error boundaries, loading states, accessibility, metadata, and `.env.example` completeness.

- [x] T045 [P] Add React error boundaries and global `error.tsx` + `not-found.tsx` in `src/app/` for graceful error UI
- [x] T046 [P] Add `loading.tsx` skeleton screens for `/(public)/book/[doctorId]/page.tsx` and `/(provider)/dashboard/page.tsx` using shadcn/ui `Skeleton`
- [x] T047 [P] Add `<head>` metadata in `src/app/layout.tsx`: page title, description, `viewport` meta tag; add `<html lang="vi">` for Vietnamese locale
- [x] T048 [P] Audit all forms for accessibility: every `<input>` has an associated `<label>` (via shadcn/ui `FormLabel`); error messages use `aria-describedby`; focus management after form submission
- [x] T049 [P] Verify `src/middleware.ts` covers all protected routes; add `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY` response headers
- [x] T050 Run `pnpm typecheck` (`tsc --noEmit`) with zero errors; fix any type issues introduced during implementation

---

## Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundation) — must complete before any user story
        ├─→ Phase 3 (US1 — Patient Books) [P1 — MVP]
        │     └─→ Phase 4 (US2 — Provider Dashboard) [depends on appointments existing]
        │           └─→ Phase 5 (US3 — Reminder Cron) [depends on confirmed appointments]
        └─→ Phase 6 (US4 — Admin Schedules) [independent after Foundation]
              (logically prerequisite to US1 UX, but independently deliverable)
```

**Story independence**: US4 (Admin) and US1 (Booking) can be implemented in parallel after Phase 2, since the seed data provides working schedules for US1 development. US2 and US3 require US1 appointment data to test against.

---

## Parallel Execution Examples

### During Phase 2 (Foundation)

Teams can split across these groups simultaneously:

```
Group A: T009 → T010 → T011 (DB migrations & seed)
Group B: T012 + T013 → T014 → T015 → T016 (auth clients + types)
Group C: T017 (slots.ts pure fn — no DB dependency)
Group D: T018 + T019 + T020 + T021 + T022 (notifications all independent)
```

### During Phase 3 (US1)

```
Group A: T023 (slots API) → T028 (SlotCalendar uses API)
Group B: T024 (appointments API)
Group C: T025 (doctor listing page) + T026 (DoctorCard)
Group D: T027 → T029 + T030 (booking page + sub-components)
```

### During Phase 6 (US4)

```
Group A: T038 + T039 (schedules API)
Group B: T040 + T041 (blocked-periods API)
Group C: T042 + T043 + T044 (admin UI — can start after API contracts are stable)
```

---

## Implementation Strategy

**Recommended MVP scope**: Phase 1 + Phase 2 + Phase 3 = US1 fully functional (patient can book, slot becomes unavailable, email fires). This is independently demonstrable and covers the highest-priority value.

**Incremental delivery order**:

1. **Sprint 1**: Phases 1–3 → Patient booking end-to-end (MVP)
2. **Sprint 2**: Phase 4 → Provider dashboard + confirm/cancel
3. **Sprint 3**: Phase 5 → Automated reminders
4. **Sprint 4**: Phase 6 → Admin schedule configuration
5. **Sprint 5**: Phase 7 → Polish, accessibility, hardening
6. **Sprint 6**: Phase 2B + Phases 8–11 → Patient auth, doctor clinical notes, profile, self-service
7. **Sprint 7**: Phases 12–14 → Lab orders, payments, admin management
8. **Sprint 8**: Phases 15–19 → Doctor public profile, waitlist, notifications, dependents, document upload
9. **Sprint 9**: Phases 20–22 → Doctor self-mgmt, receptionist, admin settings/audit

**Before writing any Route Handler**: ensure `supabase start` is running and `database.ts` types are generated (T016).

**Before writing any Client Component**: ensure `src/lib/supabase/client.ts` (T012) and `src/types/domain.ts` (T015) are complete.

---

## Phase 2B: Foundational Extension (New DB Schema for US5–US19)

**Purpose**: All new user stories (US5–US19) require additional tables, enum values, storage buckets, and updated PL/pgSQL functions. This phase MUST complete before any Phase 8–22 work begins.

**⚠️ CRITICAL**: No Phase 8–22 work can begin until this phase is 100% complete.

### DB Migrations — New Enums & Tables

- [x] T051 Create migration `supabase/migrations/20260306000000_extend_enums_and_roles.sql`:
  - Alter `appointment_status` enum: add `'completed'`, `'no-show'`
  - Alter `user_role` enum: add `'patient'`, `'receptionist'`
  - Alter `appointments` table: add columns `user_id uuid nullable FK→auth.users(id)`, `dependent_id uuid nullable`, `checked_in_at timestamptz nullable`, `internal_note text nullable DEPRECATED`
  - Update `appointments_doctor_slot_unique` partial index `WHERE status IN ('pending','confirmed')` (no change needed — new statuses are terminal)
  - Update `update_appointment_status()` function: allow `confirmed→completed` and `confirmed→no-show`; both are terminal (no further transitions); add check: `no-show` and `completed` MUST NOT re-enter any other state

- [x] T052 Create migration `supabase/migrations/20260306000001_patient_clinical_tables.sql`:
  - Table `patient_profiles`: `id uuid PK FK→auth.users(id) ON DELETE CASCADE`, `full_name text NOT NULL`, `date_of_birth date nullable`, `gender text nullable`, `address text nullable`, `emergency_contact_name text nullable`, `emergency_contact_phone text nullable`, `created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NOT NULL default now()`
  - Table `patient_medical_backgrounds`: `id uuid PK`, `user_id uuid NOT NULL FK→auth.users(id) ON DELETE CASCADE`, `entry_type text NOT NULL CHECK IN ('allergy','chronic_condition')`, `description text NOT NULL`, `added_at timestamptz NOT NULL default now()`
  - Table `medical_records`: `id uuid PK`, `appointment_id uuid NOT NULL UNIQUE FK→appointments(id) ON DELETE CASCADE`, `diagnosis text nullable`, `examination_notes text nullable`, `recorded_by uuid NOT NULL FK→auth.users(id)`, `created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NOT NULL default now()`
  - Table `prescription_items`: `id uuid PK`, `medical_record_id uuid NOT NULL FK→medical_records(id) ON DELETE CASCADE`, `medication_name text NOT NULL`, `dosage text NOT NULL`, `frequency text NOT NULL`, `duration text NOT NULL`, `notes text nullable`
  - RLS on all 4 tables per spec FRs 033/039/040: patients read own; providers read their patients'; admin reads all; write via service role or provider (medical_records/prescriptions)

- [x] T053 Create migration `supabase/migrations/20260306000002_lab_orders_payments.sql`:
  - Table `lab_orders`: `id uuid PK`, `appointment_id uuid NOT NULL FK→appointments(id) ON DELETE CASCADE`, `test_name text NOT NULL`, `type text NOT NULL CHECK IN ('lab','imaging','other')`, `instructions text nullable`, `ordered_by uuid NOT NULL FK→auth.users(id)`, `status text NOT NULL CHECK IN ('ordered','result_available') default 'ordered'`, `created_at timestamptz NOT NULL default now()`
  - Table `examination_results`: `id uuid PK`, `lab_order_id uuid NOT NULL UNIQUE FK→lab_orders(id) ON DELETE CASCADE`, `result_text text nullable`, `file_path text nullable` (storage object path — not full URL), `uploaded_by uuid NOT NULL FK→auth.users(id)`, `uploaded_at timestamptz NOT NULL default now()`
  - Table `services`: `id uuid PK`, `name text NOT NULL`, `default_duration_minutes smallint NOT NULL`, `default_fee numeric(10,2) NOT NULL`, `currency text NOT NULL default 'VND'`, `is_active boolean NOT NULL default true`, `created_at timestamptz NOT NULL default now()`; seed with 3 sample services
  - Table `payments`: `id uuid PK`, `appointment_id uuid NOT NULL UNIQUE FK→appointments(id) ON DELETE CASCADE`, `amount numeric(10,2) NOT NULL`, `currency text NOT NULL`, `status text NOT NULL CHECK IN ('awaiting_payment','paid','refund_pending','refunded','voided') default 'awaiting_payment'`, `invoice_number text nullable UNIQUE` (sequential — set on paid), `invoice_path text nullable` (PDF storage path), `paid_at timestamptz nullable`, `created_at timestamptz NOT NULL default now()`
  - RLS: lab_orders/results — providers (their patients) + patient owner reads; payments — patient owner reads, service role writes
  - Create Supabase Storage bucket `result-files` (private, max 10 MB) and `invoice-files` (private)

- [x] T054 Create migration `supabase/migrations/20260306000003_doctor_receptionist_tables.sql`:
  - Table `doctor_profiles`: `id uuid PK FK→doctors(id) ON DELETE CASCADE`, `photo_url text nullable`, `biography text nullable`, `qualifications text nullable`, `languages text[] NOT NULL default '{}'`, `fee_override numeric(10,2) nullable`, `updated_at timestamptz NOT NULL default now()`
  - Table `internal_notes`: `id uuid PK`, `appointment_id uuid NOT NULL FK→appointments(id) ON DELETE CASCADE`, `content text NOT NULL`, `authored_by uuid NOT NULL FK→auth.users(id)`, `created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NOT NULL default now()`
  - Table `patient_check_ins`: `id uuid PK`, `appointment_id uuid NOT NULL UNIQUE FK→appointments(id) ON DELETE CASCADE`, `checked_in_by uuid NOT NULL FK→auth.users(id)`, `checked_in_at timestamptz NOT NULL default now()`
  - Table `doctor_ratings`: `id uuid PK`, `appointment_id uuid NOT NULL UNIQUE FK→appointments(id)`, `patient_id uuid NOT NULL FK→auth.users(id)`, `doctor_id uuid NOT NULL FK→doctors(id)`, `rating smallint NOT NULL CHECK (1 <= rating AND rating <= 5)`, `comment text nullable`, `is_hidden boolean NOT NULL default false`, `created_at timestamptz NOT NULL default now()`
  - RLS: internal_notes — providers + receptionists + admin only (NEVER patient); check_ins — receptionists + admin; ratings — owner patient reads own, public reads non-hidden, admin reads all

- [x] T055 Create migration `supabase/migrations/20260306000004_patient_experience_tables.sql`:
  - Table `dependents`: `id uuid PK`, `account_holder_id uuid NOT NULL FK→auth.users(id) ON DELETE CASCADE`, `full_name text NOT NULL`, `date_of_birth date nullable`, `gender text nullable`, `relationship text NOT NULL CHECK IN ('child','parent','spouse','other')`, `is_active boolean NOT NULL default true`, `created_at timestamptz NOT NULL default now()`
  - Alter `appointments`: add FK `CONSTRAINT appointments_dependent_id_fk FOREIGN KEY (dependent_id) REFERENCES dependents(id)`
  - Table `waitlist_entries`: `id uuid PK`, `patient_id uuid NOT NULL FK→auth.users(id) ON DELETE CASCADE`, `doctor_id uuid NOT NULL FK→doctors(id) ON DELETE CASCADE`, `preferred_date_from date nullable`, `preferred_date_to date nullable`, `status text NOT NULL CHECK IN ('active','fulfilled','expired','cancelled') default 'active'`, `claim_token text nullable UNIQUE`, `claim_token_expires_at timestamptz nullable`, `created_at timestamptz NOT NULL default now()`, `updated_at timestamptz NOT NULL default now()`
  - Table `notification_preferences`: `id uuid PK`, `patient_id uuid NOT NULL FK→auth.users(id) ON DELETE CASCADE`, `event_type text NOT NULL`, `email_enabled boolean NOT NULL default true`, `updated_at timestamptz NOT NULL default now()`; `UNIQUE(patient_id, event_type)`
  - Table `in_app_notifications`: `id uuid PK`, `patient_id uuid NOT NULL FK→auth.users(id) ON DELETE CASCADE`, `event_type text NOT NULL`, `message text NOT NULL`, `related_entity_type text nullable`, `related_entity_id uuid nullable`, `is_read boolean NOT NULL default false`, `created_at timestamptz NOT NULL default now()`
  - RLS: all tables patient-owner-scoped; waitlist_entries also writable by service role (for claim logic)

- [x] T056 Create migration `supabase/migrations/20260306000005_documents_and_system_tables.sql`:
  - Table `patient_documents`: `id uuid PK`, `appointment_id uuid NOT NULL FK→appointments(id) ON DELETE CASCADE`, `uploaded_by uuid NOT NULL FK→auth.users(id)`, `document_type text NOT NULL CHECK IN ('referral','previous_result','insurance','other')`, `description text nullable`, `file_path text NOT NULL` (storage object path), `uploaded_at timestamptz NOT NULL default now()`
  - Table `system_settings`: `key text PK`, `value text NOT NULL`, `default_value text NOT NULL`, `description text NOT NULL`, `last_updated_by uuid nullable FK→auth.users(id)`, `updated_at timestamptz NOT NULL default now()`; seed with defaults: `cancellation_cutoff_hours=2`, `reminder_lead_hours=24`, `max_upload_mb=10`, `waitlist_claim_expiry_minutes=30`
  - Table `audit_log_entries`: `id uuid PK default gen_random_uuid()`, `actor_id uuid nullable FK→auth.users(id)`, `event_type text NOT NULL`, `entity_type text nullable`, `entity_id uuid nullable`, `old_value jsonb nullable`, `new_value jsonb nullable`, `ip_address text nullable`, `created_at timestamptz NOT NULL default now()`; `NO UPDATE, NO DELETE` (immutable — revoke via RLS)
  - Create Supabase Storage bucket `patient-documents` (private, max 10 MB per file)
  - RLS: patient_documents — uploader + appointment's doctor + admin; system_settings — admin write, all authenticated read; audit_log_entries — admin SELECT only, INSERT via service role only, no UPDATE/DELETE for any role

- [x] T057 [P] Update `src/types/domain.ts` — add all new enums and interfaces to cover new entities: `AppointmentStatus` extended for `completed`/`no-show`; `UserRole` extended for `patient`/`receptionist`; interfaces for `PatientProfile`, `MedicalRecord`, `PrescriptionItem`, `LabOrder`, `ExaminationResult`, `Service`, `Payment`, `DoctorRating`, `WaitlistEntry`, `Dependent`, `NotificationPreference`, `InAppNotification`, `PatientDocument`, `DoctorProfile`, `InternalNote`, `SystemSetting`, `AuditLogEntry`; updated notification types for new email templates

- [x] T058 Update `supabase/migrations` — new PL/pgSQL function migration `supabase/migrations/20260306000006_new_functions.sql`:
  - Function `create_waitlist_claim(p_entry_id uuid, p_doctor_id uuid, p_slot_start timestamptz, p_slot_end timestamptz, p_patient_id uuid)` — atomically calls `book_appointment()` and marks waitlist entry `fulfilled`; raises exception if slot already taken
  - Function `complete_appointment(p_appointment_id uuid, p_actor_id uuid)` — validates `confirmed→completed` transition; inserts `payments` record with `awaiting_payment` status and fee from `doctor_profiles.fee_override` or `services.default_fee`; raises if already completed (idempotent guard)
  - Trigger function `log_appointment_status_change()` — fires `AFTER UPDATE OF status ON appointments`, inserts row into `audit_log_entries`
  - After migration: regenerate `src/types/database.ts` via `supabase gen types typescript --local`

**Checkpoint**: `supabase db reset` applies all 7 new migrations cleanly; `database.ts` types reflect all new tables; `domain.ts` compiles with zero TypeScript errors.

---

## Phase 8: User Story 5 — Patient Registers, Logs In, and Tracks Appointments (Priority: P2)

**Goal**: Patients create an account, verify their email, log in, and see their appointment history with clinical records for completed visits.

**Independent Test**: Register a new patient via `/auth/register`; receive verification email; confirm email; log in; view My Appointments (empty state); complete a booking as this patient; return to My Appointments and see the new booking with correct status.

### Auth Pages & API

- [x] T059 [US5] Create `src/app/(patient)/auth/register/page.tsx` — Client Component: react-hook-form + zod validation (email, password min 8 chars, confirm password); calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo: /auth/callback } })` via browser client; on success: show "Check your email to verify your account" notice; creates `user_profiles` row with `role = 'patient'` via `AFTER INSERT` trigger on `auth.users`
- [x] T060 [US5] Create `src/app/(patient)/auth/verify-pending/page.tsx` — static page shown to unverified patients on login attempt; shows email address in notice; "Resend verification email" button calls `supabase.auth.resend({ type: 'signup', email })`
- [x] T061 [US5] Update `src/middleware.ts` — extend route protection: add `/(patient)/**` routes; authenticated patients with unverified email (`email_confirmed_at IS NULL`) MUST be redirected to `/auth/verify-pending`; add `/(receptionist)/**` routes for receptionist role

### Patient Portal: Appointment History

- [x] T062 [US5] Create `src/app/(patient)/my-appointments/page.tsx` — Server Component (authenticated patient only): query `appointments WHERE user_id = auth.uid() ORDER BY slot_start DESC`; include dependent bookings; pass to `<PatientAppointmentList>`
- [x] T063 [US5] Create `src/components/patient/PatientAppointmentList.tsx` — Client Component: renders list of patient appointment cards showing doctor name, specialty, slot date/time, status badge; "View Details" link per row; empty-state with "Book your first appointment" CTA; filter tabs: Upcoming / Past / All
- [x] T064 [US5] Create `src/app/(patient)/my-appointments/[id]/page.tsx` — Server Component: load appointment, medical_record, prescription_items, lab_orders, examination_results for the authenticated patient's appointment (RLS enforces ownership); 404 if not found or not owned; pass to `<PatientAppointmentDetail>`
- [x] T065 [US5] Create `src/components/patient/PatientAppointmentDetail.tsx` — Client Component: renders appointment info; if `medical_record` exists: shows Diagnosis, Examination Notes, Prescription table (columns: medication, dosage, frequency, duration, notes); if `examination_results` exist: shows Results section with "Results Available" badge and download signed URL links
- [x] T066 [P] [US5] Add `src/lib/notifications/templates/email-verification.tsx` — React Email template for Supabase email verification override (if custom template configured in Supabase Dashboard); and `src/lib/notifications/templates/post-visit-summary.tsx` for optional post-visit summary sent on appointment completion

**Checkpoint**: Patient can register, verify, log in, and view appointment history + clinical notes from completed visits.

---

## Phase 9: User Story 6 — Doctor Views Patient List and Records Clinical Notes (Priority: P2)

**Goal**: Doctors browse their patient list, open a patient's history, and create/edit diagnosis, notes, and prescriptions per appointment.

**Independent Test**: Log in as a provider; navigate to Patients; find a patient from seed data; open their history; add a diagnosis and 2-item prescription to a `confirmed` appointment; save; log in as patient and verify the data appears in their portal.

### API: Clinical Notes

- [x] T067 [US6] Create `src/app/api/doctor/patients/route.ts` — `GET /api/doctor/patients?search=&page=&pageSize=`:
  - Auth: `provider` role only; extract `doctor_id` from `user_profiles`
  - Query: distinct patients who have appointments with this doctor; join `patient_profiles` for name; support partial name/email search; return paginated list
- [x] T068 [US6] Create `src/app/api/doctor/patients/[patientId]/route.ts` — `GET`: return full appointment history for this patient with this doctor, ordered by `slot_start DESC`; provider auth scoped to own `doctor_id`
- [x] T069 [US6] Create `src/app/api/doctor/appointments/[id]/clinical/route.ts` — `GET` returns current `medical_record` + `prescription_items` for the appointment; `PUT` upserts `medical_record` and replaces `prescription_items`:
  - Auth: `provider` role; verify appointment's `doctor_id` matches caller's doctor
  - Validate body with zod@4: `{ diagnosis?: string, examinationNotes?: string, prescriptionItems: Array<{ medicationName, dosage, frequency, duration, notes? }> }`
  - Block save if appointment `status IN ('cancelled')` → 422 `{ error: 'INVALID_STATUS' }`
  - Upsert `medical_records` (ON CONFLICT appointment_id DO UPDATE); delete existing `prescription_items` for this record and re-insert
  - Return 200 with full updated record

### UI: Doctor Patient Portal

- [x] T070 [US6] Create `src/app/(provider)/dashboard/patients/page.tsx` — Server Component (provider role): render `<DoctorPatientList>`
- [x] T071 [US6] Create `src/components/dashboard/DoctorPatientList.tsx` — Client Component: search input (debounced, 300ms) calls `GET /api/doctor/patients?search=`; paginated results list showing patient name, email, last appointment date; "View History" link
- [x] T072 [US6] Create `src/app/(provider)/dashboard/patients/[patientId]/page.tsx` — Server Component: load patient's appointment history with this doctor; render `<PatientHistoryView>`
- [x] T073 [US6] Create `src/components/dashboard/ClinicalNotesForm.tsx` — Client Component (used in appointment detail view): react-hook-form with diagnosis textarea, examination notes textarea, and dynamic prescription items array (add/remove rows); `PUT /api/doctor/appointments/[id]/clinical` on submit; disabled when appointment `status = 'cancelled'`; show success toast and timestamp of last save

**Checkpoint**: Doctor can search patients, open history, and save clinical notes; patient sees updates immediately in their portal.

---

## Phase 10: User Story 7 — Patient Manages Profile and Password Reset (Priority: P2)

**Goal**: Registered patients maintain personal profile + medical background and can reset their password via email link.

**Independent Test**: Log in as patient, update date of birth + add allergy, log out, use Forgot Password, reset password via email link, log back in, verify profile data retained.

### API: Patient Profile

- [x] T074 [US7] Create `src/app/api/patient/profile/route.ts` — `GET` returns `patient_profiles` row for authenticated patient; `PATCH` upserts `patient_profiles` with zod validation: `{ fullName?, dateOfBirth?, gender?, address?, emergencyContactName?, emergencyContactPhone? }`; return 200 with updated profile
- [x] T075 [P] [US7] Create `src/app/api/patient/medical-background/route.ts` — `GET` returns all `patient_medical_backgrounds` for authenticated patient ordered by `added_at DESC`; `POST` inserts new entry: zod `{ entryType: z.enum(['allergy','chronic_condition']), description: z.string().min(2) }`
- [x] T076 [P] [US7] Create `src/app/api/patient/medical-background/[id]/route.ts` — `DELETE`: verify ownership via RLS; delete entry; return 204

### Auth: Forgot / Reset Password

- [x] T077 [P] [US7] Create `src/app/auth/forgot-password/page.tsx` — Client Component: email field; on submit calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: /auth/reset-password })`; show confirmation notice regardless of whether email exists (prevents enumeration)
- [x] T078 [P] [US7] Create `src/app/auth/reset-password/page.tsx` — Client Component: shown after clicking reset link (Supabase sets session via URL hash); new password + confirm password fields (min 8 chars); on submit calls `supabase.auth.updateUser({ password })`; on success: invalidate session and redirect to `/auth/login` with "Password updated" toast; show error if link expired

### UI: Patient Profile Page

- [x] T079 [US7] Create `src/app/(patient)/my-profile/page.tsx` — Server Component: load `patient_profiles` + `patient_medical_backgrounds`; render `<PatientProfileForm>` and `<MedicalBackgroundList>`
- [x] T080 [US7] Create `src/components/patient/PatientProfileForm.tsx` + `src/components/patient/MedicalBackgroundList.tsx` — Client Components: profile form with PATCH on save; medical background shows allergy/condition badges with add form and delete button per entry; inline validation

**Checkpoint**: Patient can edit profile and medical background; doctor sees patient background on appointment clinical view; password reset flow completes without error.

---

## Phase 11: User Story 8 — Patient Reschedules or Cancels Appointments (Priority: P2)

**Goal**: Authenticated patients can reschedule or cancel their own `pending`/`confirmed` appointments outside the configured cutoff window; doctor receives notification.

**Independent Test**: Create a `confirmed` appointment ≥ 3 hours in the future; log in as patient; reschedule to a different slot → verify original slot freed and new `pending` created; then cancel the new booking → verify slot freed and doctor notification logged.

### API: Self-Service

- [x] T081 [US8] Create `src/app/api/patient/appointments/[id]/reschedule/route.ts` — `PATCH`:
  - Auth: `patient` role; verify `appointments.user_id = auth.uid()`
  - Validate body: `{ newSlotStart: iso-datetime, newSlotEnd: iso-datetime }`
  - Read `system_settings.cancellation_cutoff_hours`; block if `slot_start - now() < cutoff`; return 422 `{ error: 'CUTOFF_WINDOW', cutoffHours: number }`
  - Block if appointment status not in `('pending','confirmed')`
  - Atomically: cancel current appointment + call `book_appointment()` for new slot (same doctor)
  - Fire `sendNotification('rescheduled', doctor_email, { ... })` async
  - Return 200 with new appointment
- [x] T082 [US8] Create `src/app/api/patient/appointments/[id]/cancel/route.ts` — `PATCH`:
  - Auth: `patient` role; verify ownership
  - Read cutoff from `system_settings`; enforce cutoff window (422 if inside window)
  - Block terminal statuses; update `status = 'cancelled'`
  - Fire `sendNotification('cancelled-by-patient', doctor_email, {...})` async
  - Return 200

### Email Template & UI

- [x] T083 [P] [US8] Create `src/lib/notifications/templates/rescheduled.tsx` — React Email template: "Your appointment has been rescheduled" for doctor notification (patient name, old slot, new slot)
- [x] T084 [US8] Add reschedule and cancel actions to `src/components/patient/PatientAppointmentDetail.tsx` — "Reschedule" opens shadcn/ui `Dialog` with a `<SlotCalendar>` pre-filtered to same doctor; "Cancel" opens confirmation `Dialog`; both call new patient APIs; disabled for terminal statuses or within cutoff; show dynamic cutoff value in error message
- [x] T085 [P] [US8] Add `cutoff_hours` display in error message: query `GET /api/patient/settings/cutoff` — public endpoint that returns `system_settings` WHERE `key = 'cancellation_cutoff_hours'`; used by UI to show "Cancellations are blocked within X hours of your appointment"

**Checkpoint**: Patient reschedule + cancel work; doctor receives notification; cutoff is enforced using DB-stored value.

---

## Phase 12: User Story 9 — Doctor Orders Tests and Records Examination Results (Priority: P3)

**Goal**: Doctors attach lab/imaging test orders to appointments and record results (text or file). Patients see results in their portal.

**Independent Test**: Log in as doctor; open a `confirmed` appointment; add a blood-test order; upload a text result; log in as patient; verify "Results Available" indicator and readable result text on appointment detail.

### API: Lab Orders & Results

- [x] T086 [US9] Create `src/app/api/doctor/appointments/[id]/lab-orders/route.ts` — `GET` lists orders for appointment; `POST` creates new order:
  - Auth: provider scoped to own doctor
  - Validate: `{ testName: string, type: z.enum(['lab','imaging','other']), instructions?: string }`
  - Block if appointment `status IN ('cancelled','no-show')`; return 422
  - Return 201 with created order
- [x] T087 [US9] Create `src/app/api/doctor/lab-orders/[orderId]/result/route.ts` — `PUT` upserts result (one per order):
  - Auth: provider scoped to appointment's doctor
  - Body: `{ resultText?: string }` (at least one of text or file required)
  - For file: parse `multipart/form-data`; validate type (PDF/JPEG/PNG) and size (≤ `system_settings.max_upload_mb` × 1 MB); upload to Supabase Storage `result-files` bucket via service-role client; store `file_path` (not public URL)
  - Update `lab_orders.status = 'result_available'`
  - Return 200 with result + signed URL (1 hour expiry) for immediate display
- [x] T088 [P] [US9] Create `src/app/api/patient/appointments/[id]/results/route.ts` — `GET`:
  - Auth: patient; verify appointment ownership via RLS
  - Return all `lab_orders` with their `examination_results`; for each result with `file_path`: generate fresh signed URL (1 hour expiry) via service-role Supabase Storage client
  - Never return raw `file_path` to client — always signed URL only

### UI: Lab Orders

- [x] T089 [US9] Create `src/components/dashboard/LabOrdersSection.tsx` — Client Component (in doctor appointment detail view): list of existing orders with "Add Order" button; each order shows name, type, status badge, "Record Result" button; `LabOrderForm` (react-hook-form) inline for new order creation
- [x] T090 [US9] Create `src/components/dashboard/ResultUploadForm.tsx` — Client Component: text result textarea + file drop-zone (`<input type="file" accept=".pdf,.jpg,.jpeg,.png">`); client-side file size check before upload; `PUT /api/doctor/lab-orders/[id]/result`; progress indicator; on success: invalidate order list
- [x] T091 [US9] Update `src/components/patient/PatientAppointmentDetail.tsx` — add "Test Results" section: fetch from `GET /api/patient/appointments/[id]/results`; render each result with text and signed URL download link; show "Results Available" badge when at least 1 result exists
- [x] T092 [P] [US9] Add file size rejection handling: in `src/app/api/doctor/lab-orders/[orderId]/result/route.ts` and `src/app/api/patient/appointments/[id]/documents/route.ts`, read `system_settings.max_upload_mb` at request time (cache with 60 s TTL via `unstable_cache`) to enforce the current system limit without code deployment

**Checkpoint**: Doctor creates order and uploads file result; patient sees result with download link; direct URL access returns 403.

---

## Phase 13: User Story 10 — Patient Pays for Consultation and Views Invoice (Priority: P2)

**Goal**: Appointment completion triggers a `Payment` record; patient pays via portal; system generates sequentially-numbered PDF invoice and emails it.

**Independent Test**: Mark appointment `completed` as doctor; log in as patient; see "Awaiting Payment" in portal; complete mock payment; verify invoice PDF is generated, patient receives invoice email, invoice visible in Invoices tab.

### API: Payments

- [x] T093 [US10] Create `src/app/api/doctor/appointments/[id]/complete/route.ts` — `PATCH`:
  - Auth: provider scoped to own doctor
  - Call `complete_appointment(appointment_id, actor_id)` Supabase RPC (handles idempotency)
  - Fire `sendNotification('post-visit-summary', patient_email, {...})` async
  - Return 200 with updated appointment
- [x] T094 [US10] Create `src/app/api/patient/appointments/[id]/payment/route.ts` — `GET` returns current `payments` record for the appointment; `POST` initiates payment:
  - Auth: patient; verify appointment ownership
  - Body: `{ gatewayToken: string }` (mock gateway: any non-empty string = success; real gateway integration is future scope)
  - Mock success path: update `payments.status = 'paid'`; set `paid_at`; generate invoice number (`INV-YYYYMM-{sequence}`); generate PDF (`src/lib/invoicing/generate.ts`); upload to `invoice-files` bucket; update `payments.invoice_path`; fire invoice email async
  - Mock failure path (hardcode token `'fail'` in mock mode): return 402 `{ error: 'PAYMENT_FAILED' }`
  - Return 200 with payment + signed invoice URL (if paid)
- [x] T095 [P] [US10] Create `src/app/api/patient/invoices/route.ts` — `GET`: returns all `payments` for authenticated patient's appointments where `status != 'voided'`; join appointment + doctor data; for each with `invoice_path`: generate signed URL; return array
- [x] T096 [P] [US10] Create `src/lib/invoicing/generate.ts` — server-only function `generateInvoicePdf(data: InvoiceData): Buffer` using a lightweight PDF library (`@react-pdf/renderer` or `pdfkit`); installs the library; invoice layout: clinic header, invoice number, date, doctor name + specialty, patient name, service description, amount, currency; returns PDF buffer for upload to storage

### Email Template & UI

- [x] T097 [P] [US10] Create `src/lib/notifications/templates/invoice.tsx` — React Email template: "Your invoice is ready" email with appointment summary, amount, and PDF download link (signed URL)
- [x] T098 [US10] Create `src/components/patient/PaymentSection.tsx` — Client Component (in `PatientAppointmentDetail`): shown when appointment `status = 'completed'` and payment `status = 'awaiting_payment'`; displays amount + currency; mock "Pay Now" button (submits placeholder token); loading state; on success: show "Payment complete" notice and invoice download link; on failure: show error + retry button
- [x] T099 [US10] Create `src/app/(patient)/my-invoices/page.tsx` + `src/components/patient/InvoiceList.tsx` — Server Component + Client Component: list of all invoices with amount, date, status badge, PDF download link per row; empty state for patients with no invoices

### Doctor Dashboard: Mark Completed

- [x] T100 [US10] Add "Mark as Completed" button to `src/components/dashboard/AppointmentRow.tsx` — visible only for `confirmed` status; calls `PATCH /api/doctor/appointments/[id]/complete`; optimistic status update; on success: re-fetch appointment row to reflect `completed` + payment badge

**Checkpoint**: Full payment lifecycle works; invoice PDF generated; patient receives email; invoice downloadable from portal.

---

## Phase 14: User Story 11 — Admin Manages Users, Service Catalogue, and Reports (Priority: P3)

**Goal**: Admin creates/deactivates providers, manages services/fees, and generates exportable reports.

**Independent Test**: Admin creates a new provider account; provider receives invite email; admin deactivates another provider with active appointments (warning shown); admin updates service fee; admin generates monthly revenue CSV.

### API: Admin User Management

- [x] T101 [US11] Create `src/app/api/admin/providers/route.ts` — `GET` lists all providers; `POST` creates provider:
  - Auth: `admin` role only
  - POST body zod: `{ email, fullName, specialty, doctorId?: uuid }`
  - Creates `auth.users` row via Supabase Admin API (service-role); creates `user_profiles` with `role = 'provider'`; links `doctor_id` if provided
  - Fires `sendNotification('provider-invite', email, { setPasswordUrl })` async
  - Return 201
- [x] T102 [US11] Create `src/app/api/admin/providers/[id]/route.ts` — `PATCH` deactivate/reactivate:
  - Auth: admin
  - Before deactivation: query `appointments WHERE doctor_id = ? AND status IN ('pending','confirmed')`; if found: return 409 `{ error: 'ACTIVE_APPOINTMENTS', count: number, conflicts: [...] }`; require `{ force: true }` to proceed
  - On force deactivate: set `user_profiles.is_active = false` (soft deactivate), `doctors.is_active = false`
- [x] T103 [P] [US11] Create `src/app/api/admin/patients/route.ts` — `GET` lists + searches patients (`?search=&page=`); `PATCH /api/admin/patients/[id]` deactivates patient (sets `user_profiles.is_active = false`; blocks login); does NOT delete appointments or clinical records

### API: Admin Services

- [x] T104 [P] [US11] Create `src/app/api/admin/services/route.ts` — `GET` lists all services; `POST` creates service: zod `{ name, defaultDurationMinutes, defaultFee, currency }`
- [x] T105 [P] [US11] Create `src/app/api/admin/services/[id]/route.ts` — `PATCH` updates service (partial): `{ name?, defaultDurationMinutes?, defaultFee?, isActive? }`; deactivation blocks future bookings for that service; existing appointments unaffected

### API: Admin Reports

- [x] T106 [US11] Create `src/app/api/admin/reports/appointments/route.ts` — `GET ?from=&to=&format=json|csv`:
  - Auth: admin only
  - Query appointments in date range; aggregate by status, by doctor, by specialty
  - CSV format: use `papaparse` or manual CSV serialisation; set `Content-Disposition: attachment; filename=appointments-YYYY-MM-DD.csv` header
- [x] T107 [P] [US11] Create `src/app/api/admin/reports/revenue/route.ts` — `GET ?from=&to=&format=json|csv`: aggregate `payments WHERE status = 'paid'` in date range; by doctor, by specialty; total collected; same CSV export pattern

### UI: Admin Pages

- [x] T108 [US11] Create `src/app/(admin)/admin/users/page.tsx` + `src/components/admin/ProviderTable.tsx` + `src/components/admin/ServiceCatalogue.tsx` + `src/app/(admin)/admin/reports/page.tsx` — Server/Client Components: providers list with invite + deactivate actions (with confirmation dialog for deactivation with active appointments); services table with add/edit/deactivate; reports page with date-range picker, stats widgets, and Export CSV buttons for both report types; add `src/lib/notifications/templates/provider-invite.tsx`

**Checkpoint**: Admin can invite + deactivate providers; manage services; generate + export both CSV reports.

---

## Phase 15: User Story 12 — Patient Views Detailed Doctor Profile (Priority: P2)

**Goal**: Public doctor profile page shows full bio, qualifications, fee, next available slot, and rating breakdown.

**Independent Test**: Open `/doctors/[id]` without logging in; verify bio, fee, rating count, and star breakdown display; click "Book Now" and land on slot picker pre-filled with that doctor.

### API & UI

- [x] T109 [US12] Create `src/app/api/doctors/[id]/profile/route.ts` — `GET` (public):
  - Join `doctors` + `doctor_profiles` + aggregate `doctor_ratings` (avg, count, distribution); join `working_schedules` to compute next available slot date (first date in next 30 days with ≥ 1 open slot); return full profile DTO
- [x] T110 [US12] Create `src/app/(public)/doctors/[id]/page.tsx` — Server Component (public, no auth required): load profile from `GET /api/doctors/[id]/profile`; 404 if doctor inactive; build OG metadata (name, specialty, photo)
- [x] T111 [US12] Create `src/components/booking/DoctorProfilePage.tsx` — Client Component: photo, name, specialty badge, bio, qualifications, languages, consultation fee; star rating widget (aggregate score + bar distribution); list of top-5 visible reviews (reviewer first name + rating + comment + date); "Book Now" button → `/book/[doctorId]`; "Join Waitlist" button visible when next-available-slot is null
- [x] T112 [US12] Update `src/components/booking/DoctorCard.tsx` — add next available slot date label (e.g., "Next: Mon 9 Mar") using data from listing API; add link to `/doctors/[id]` profile page

**Checkpoint**: Public profile page loads without auth; all data fields present; Book Now pre-fills booking form.

---

## Phase 16: User Story 13 — Patient Joins a Waitlist for Fully-Booked Slots (Priority: P3)

**Goal**: Patient joins waitlist; system notifies when slot freed; claim link creates appointment atomically.

**Independent Test**: Book all slots for a doctor; register+login as second patient; click "Join Waitlist" on doctor profile; cancel first booking; verify claim email arrives within 60 s; click claim link; verify appointment created and waitlist entry fulfilled.

### API: Waitlist

- [x] T113 [US13] Create `src/app/api/waitlist/route.ts` — `POST` (authenticated patient):
  - Zod: `{ doctorId: uuid, preferredDateFrom?: date, preferredDateTo?: date }`
  - Block if patient already has an `active` waitlist entry for same doctor
  - Insert `waitlist_entries`; fire confirmation email `sendNotification('waitlist-joined', patient_email, {...})` async
  - Return 201
- [x] T114 [US13] Create `src/app/api/patient/waitlist/route.ts` — `GET` lists active waitlist entries for authenticated patient (join doctor name/specialty); `DELETE /api/patient/waitlist/[id]` cancels entry
- [x] T115 [US13] Create `src/app/api/waitlist/claim/route.ts` — `POST`:
  - Body: `{ token: string, slotStart: iso-datetime, slotEnd: iso-datetime }`
  - Look up `waitlist_entries WHERE claim_token = ? AND status = 'active' AND claim_token_expires_at > NOW()`; if not found: 410 `{ error: 'CLAIM_EXPIRED' }`
  - Call `create_waitlist_claim()` RPC — atomically books slot + marks entry fulfilled
  - On 409 conflict from RPC (slot taken by another claim): re-activate entry; return 409 `{ error: 'SLOT_ALREADY_TAKEN' }`
  - Return 201 with new appointment
- [x] T116 [US13] Create server-side job logic in `src/lib/waitlist/notify.ts` — `notifyWaitlist(doctorId: uuid, freedSlotStart: timestamptz, freedSlotEnd: timestamptz)`:
  - Query all `active` waitlist entries for doctor; for each: generate `claim_token = crypto.randomUUID()`; set `claim_token_expires_at = now() + interval`; send `sendNotification('waitlist-opportunity', patient_email, { claimUrl })` async
  - Call from appointment cancellation/reschedule handlers after status update

### Email Template & UI

- [x] T117 [P] [US13] Create `src/lib/notifications/templates/waitlist-joined.tsx` + `src/lib/notifications/templates/waitlist-opportunity.tsx` — React Email templates: confirmation of waitlist registration; opportunity notice with claim button (time-limited, shows expiry)
- [x] T118 [US13] Create `src/components/booking/WaitlistButton.tsx` — Client Component: shown on doctor profile (US12) when no slots available; authenticated patient → calls `POST /api/waitlist`; unauthenticated → redirect to login with return URL; success: "You're on the waitlist" confirmation; add waitlist entries display to `PatientAppointmentList` (separate "Waitlist" tab)

**Checkpoint**: Waitlist join/notify/claim cycle works end-to-end; claim link expires; race condition returns 409 to loser.

---

## Phase 17: User Story 14 — In-App Notifications and Preferences (Priority: P3)

**Goal**: Patient portal notification feed with unread badge; per-event-type email opt-out.

**Independent Test**: Patient turns off reminder email in preferences; appointment is confirmed; verify no reminder email but portal feed has "Appointment Confirmed" entry with unread badge.

### API: Notifications

- [x] T119 [US14] Create `src/app/api/patient/notifications/route.ts` — `GET ?page=&pageSize=`: returns `in_app_notifications` for authenticated patient ordered by `created_at DESC`; includes unread count in response headers or body `{ notifications: [...], unreadCount: number }`; `PATCH` body `{ ids?: uuid[], markAll?: boolean }` — marks specified notifications (or all) as `is_read = true`
- [x] T120 [US14] Create `src/app/api/patient/notification-preferences/route.ts` — `GET` returns user's preferences (or defaults if not yet set); `PUT` upserts per-event-type preference: zod `{ preferences: Array<{ eventType: string, emailEnabled: boolean }> }` — bulk upsert all preferences atomically
- [x] T121 [US14] Create `src/lib/notifications/in-app.ts` — server utility `createInAppNotification(patientId: uuid, eventType: string, message: string, relatedEntityType?: string, relatedEntityId?: uuid): Promise<void>` — inserts into `in_app_notifications`; call this alongside every existing `sendNotification()` call where patient is the recipient; check `notification_preferences` before sending email (respect email_enabled flag)

### UI: Notification Center

- [x] T122 [US14] Create `src/components/patient/NotificationBell.tsx` — Client Component: subscribes to Supabase Realtime on `in_app_notifications WHERE patient_id = auth.uid()`; shows unread badge count (red dot if > 0); click opens `NotificationDrawer` (shadcn/ui `Sheet`)
- [x] T123 [US14] Create `src/components/patient/NotificationDrawer.tsx` — Client Component: scrollable feed of notification items; each shows event type icon, message, relative time, read/unread state; "Mark all as read" button; calls `PATCH /api/patient/notifications`; paginated with load-more button
- [x] T124 [US14] Create `src/app/(patient)/my-profile/notification-preferences/page.tsx` + `src/components/patient/NotificationPreferencesForm.tsx` — Server Component + Client Component: toggle list of all event types with label and email-enabled switch; `PUT /api/patient/notification-preferences` on save; shows current state loaded from API

**Checkpoint**: Notification badge updates in real-time; patient disabling email for an event type suppresses email but preserves in-portal entry.

---

## Phase 18: User Story 15 — Dependent / Family Member Booking (Priority: P2)

**Goal**: Patients manage dependent profiles; booking form allows selecting a dependent; records attributed to dependent.

**Independent Test**: Create dependent "Child A"; book appointment selecting Child A; complete visit; verify appointment shows child's name; clinical record and invoice not linked to parent's own history.

### API: Dependents

- [x] T125 [US15] Create `src/app/api/patient/dependents/route.ts` — `GET` lists active dependents for authenticated patient; `POST` creates dependent: zod `{ fullName, dateOfBirth?, gender?, relationship: z.enum(['child','parent','spouse','other']) }` — return 201
- [x] T126 [US15] Create `src/app/api/patient/dependents/[id]/route.ts` — `PATCH` updates dependent (active ones only — name, DOB, gender, relationship); `DELETE` blocks with 409 if dependent has any appointments (`SELECT COUNT(*) FROM appointments WHERE dependent_id = ?`); offer deactivation instead via `PATCH { isActive: false }`

### UI: Dependents & Booking Integration

- [x] T127 [US15] Create `src/app/(patient)/my-dependents/page.tsx` + `src/components/patient/DependentList.tsx` — Server + Client Components: list of dependents with edit and deactivate actions; "Add Dependent" form (shadcn/ui `Dialog`)
- [x] T128 [US15] Update `src/components/booking/BookingForm.tsx` — when patient is authenticated: add "Booking for:" radio group `[Myself | <dependent names>]`; load dependents from `GET /api/patient/dependents`; when dependent selected: prefill patient name from dependent; `POST /api/appointments` body now includes `{ ..., dependentId?: uuid, userId: auth.uid() }`
- [x] T129 [US15] Update `src/components/patient/PatientAppointmentList.tsx` — add filter: `All | My appointments | <dependent names>` (client-side filter on appointments where `dependent_id = selected_dependent`); appointment items show "(for Child A)" label when `dependent_id` is set

**Checkpoint**: Booking for dependent creates appointment attributed to dependent; parent's own tab remains uncluttered.

---

## Phase 19: User Story 16 — Patient Uploads Pre-Visit Documents (Priority: P3)

**Goal**: Patient uploads documents to pending/confirmed appointments; doctor sees them in clinical view.

**Independent Test**: Upload PDF referral to `confirmed` appointment; log in as doctor; open appointment; see Supporting Documents section with download link; attempt upload to `cancelled` appointment → rejected.

### API & UI

- [x] T130 [US16] Create `src/app/api/patient/appointments/[id]/documents/route.ts` — `GET` lists `patient_documents` for appointment (patient owner only via RLS); `POST` uploads document:
  - Auth: patient; verify ownership
  - Block if appointment `status IN ('cancelled','completed','no-show')` → 422
  - Parse `multipart/form-data`: `{ documentType, description?, file }`; validate type (PDF/JPEG/PNG) and size (≤ `max_upload_mb` from settings)
  - Upload to `patient-documents` Storage bucket; insert `patient_documents` row; return 201
- [ ] T131 [P] [US16] Create `src/app/api/doctor/appointments/[id]/patient-documents/route.ts` — `GET` (provider scoped to own doctor): returns all `patient_documents` for the appointment with fresh signed URLs (1 h expiry); never returns raw `file_path`
- [x] T132 [US16] Create `src/components/patient/DocumentUploadSection.tsx` — Client Component (in `PatientAppointmentDetail`): shown for `pending`/`confirmed` only; document type selector + description text input + file drop-zone; client-side pre-validation (type + size); `POST /api/patient/appointments/[id]/documents`; progress bar; uploaded file list with type/description/date; disabled for terminal appointment statuses
- [x] T133 [US16] Create `src/components/dashboard/PatientDocumentsSection.tsx` — Client Component (in doctor appointment detail view): fetches from `GET /api/doctor/appointments/[id]/patient-documents`; renders each document with type badge, description, upload date, and download link; "No patient-uploaded documents" empty state
- [x] T134 [P] [US16] Security: add `src/lib/storage/signed-urls.ts` — `getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string>` — centralised signed-URL generation using service-role client; used by results, invoices, and patient-document endpoints; ensures no raw path is ever returned to clients

**Checkpoint**: Documents visible only to patient owner + doctor; direct URL returns 403; upload to terminal appointment rejected.

---

## Phase 20: User Story 17 — Doctor Self-Service Profile & Appointment Completion (Priority: P2)

**Goal**: Doctor edits own profile (photo, bio, fee override), sees today's schedule, marks appointments complete, adds internal notes, generates prescription PDF.

**Independent Test**: Log in as doctor; update bio and set fee override; view Today's Schedule; mark a `confirmed` appointment complete; generate prescription PDF; verify fee override used in payment record.

### API: Doctor Self-Management

- [x] T135 [US17] Create `src/app/api/doctor/profile/route.ts` — `GET` returns `doctor_profiles` for authenticated provider's doctor (create row if doesn't exist); `PATCH` upserts: zod `{ photoUrl?, biography?, qualifications?, languages?: string[], feeOverride?: number | null }` — return 200
- [x] T136 [US17] Create `src/app/api/doctor/schedule/today/route.ts` — `GET`:
  - Auth: provider
  - Query `appointments WHERE doctor_id = ? AND slot_start::date = NOW()::date ORDER BY slot_start ASC`
  - Join `patient_profiles` (or `dependents` if `dependent_id` set) for display name
  - Join `patient_check_ins` for checked-in indicator
  - Return ordered list with full context
- [ ] T137 [P] [US17] Create `src/app/api/doctor/appointments/[id]/internal-note/route.ts` — `GET`/`PUT`:
  - Auth: provider + receptionist + admin; **NEVER** exposed to patient routes
  - PUT upserts `internal_notes` content for appointment; return 200
- [x] T138 [US17] Create `src/app/api/doctor/appointments/[id]/prescription-pdf/route.ts` — `GET`:
  - Auth: provider scoped to own doctor (or patient who owns appointment — read only)
  - Load appointment + medical_record + prescription_items + doctor_profiles for clinic/doctor rendering
  - Call `generatePrescriptionPdf(data)` from `src/lib/invoicing/prescription.ts`
  - Return PDF with `Content-Type: application/pdf; Content-Disposition: attachment; filename=prescription-[id].pdf`
- [x] T139 [P] [US17] Create `src/lib/invoicing/prescription.ts` — server-only `generatePrescriptionPdf(data: PrescriptionPdfData): Buffer` using same PDF library as invoicing; layout: clinic name header, doctor name + qualifications, patient name, appointment date, prescription table (medication / dosage / frequency / duration / notes); "For pharmacy use only" footer

### UI: Doctor Dashboard Updates

- [x] T140 [US17] Create `src/app/(provider)/dashboard/today/page.tsx` + `src/components/dashboard/TodaySchedule.tsx` — Server Component + Client Component: chronological appointment queue for today; each row shows patient/dependent name, time, status, checked-in badge; action buttons: "Complete" (`confirmed`), "No-Show" (`confirmed`), "Add Internal Note"; Realtime subscription on `appointments` for live status updates
- [x] T141 [US17] Create `src/app/(provider)/dashboard/profile/page.tsx` + `src/components/dashboard/DoctorProfileEditor.tsx` — Server + Client Components: edit bio/qualifications/languages/photo URL/fee override; `PATCH /api/doctor/profile`; preview shows how profile will look on public page
- [x] T142 [P] [US17] Add "No-Show" button to `TodaySchedule` and `AppointmentRow` — `PATCH /api/appointments/[id]/status` body `{ status: 'no-show' }` — allowed only for `confirmed` and only by the appointment's doctor; add `no-show` to state machine enforcement in `update_appointment_status()` RPC (already done in T051)

**Checkpoint**: Doctor updates own profile; fee override applied to next payment; "Mark Complete" triggers payment/rating; prescription PDF downloads correctly.

---

## Phase 21: User Story 18 — Receptionist Walk-In Booking & Check-In (Priority: P3)

**Goal**: Receptionist creates walk-in bookings, updates contact info, checks in patients, views full clinic day view.

**Independent Test**: Log in as receptionist; create walk-in booking for a patient; verify booking-received email; check in patient on arrival; view Clinic Day View and confirm checked-in badge shows for all doctors.

### API: Receptionist

- [x] T143 [US18] Create `src/app/api/receptionist/appointments/route.ts` — `POST`:
  - Auth: `receptionist` role only
  - Body: same as `POST /api/appointments` (FR-101); call same `book_appointment()` RPC
  - Audit: insert into `audit_log_entries` (actor = receptionist, event = `appointment_created_by_staff`)
  - Return 201
- [x] T144 [US18] Create `src/app/api/receptionist/appointments/[id]/contact/route.ts` — `PATCH`:
  - Auth: receptionist
  - Body zod: `{ patientName?: string, patientEmail?: string, patientPhone?: string }`
  - Block if appointment `status IN ('completed','cancelled','no-show')` → 422
  - Update `appointments` contact columns; insert audit log entry
  - Return 200
- [x] T145 [US18] Create `src/app/api/receptionist/appointments/[id]/check-in/route.ts` — `POST`:
  - Auth: receptionist
  - Verify appointment `status = 'confirmed'`; if already checked in return 200 (idempotent)
  - Insert `patient_check_ins { appointment_id, checked_in_by, checked_in_at }`
  - Return 201 with check-in timestamp
- [x] T146 [US18] Create `src/app/api/receptionist/day-view/route.ts` — `GET ?date=&doctorId=`:
  - Auth: receptionist
  - Query all appointments for the given date (all doctors if no `doctorId` filter); join check-in status; group by doctor
  - Return `{ doctors: [{ doctor, appointments: [...with checkIn] }] }`

### UI: Receptionist Dashboard

- [x] T147 [US18] Create `src/app/(receptionist)/receptionist/layout.tsx` — layout guarded by `receptionist` role in middleware; shared sidebar nav: "Book Walk-In", "Day View", "Appointments"
- [x] T148 [US18] Create `src/app/(receptionist)/receptionist/book/page.tsx` + `src/components/receptionist/WalkInBookingForm.tsx` — same `<SlotCalendar>` + `<BookingForm>` flow as patient UI but submits to `POST /api/receptionist/appointments`; no auth requirement for the patient being booked
- [x] T149 [US18] Create `src/app/(receptionist)/receptionist/day-view/page.tsx` + `src/components/receptionist/ClinicDayView.tsx` — Client Component: date picker (defaults to today); column-per-doctor layout; each column shows appointment queue with status colour-coding (pending=yellow, confirmed=blue, checked-in=green, completed=grey); per-column header shows `X / Y checked in`; Realtime subscription on `appointments` + `patient_check_ins`; "Check In" button per confirmed appointment row that calls `POST /api/receptionist/appointments/[id]/check-in`

**Checkpoint**: Receptionist books walk-ins and emails fire; check-in indicator visible to doctor in Today's Schedule; Clinic Day View shows all doctors' queues live.

---

## Phase 22: User Story 19 — Admin System Settings and Audit Log (Priority: P4)

**Goal**: Admin configures global thresholds via UI panel; views, filters, and exports immutable audit log; can view + emergency-cancel any appointment.

**Independent Test**: Change cancellation cutoff to 4h in System Settings; attempt patient cancel 3h before appointment → correctly blocked with "within 4h" message; search audit log for the setting change event.

### API: Admin Settings & Audit

- [x] T150 [US19] Create `src/app/api/admin/settings/route.ts` — `GET` (admin only): returns all `system_settings` rows; `PATCH` updates a single setting: body zod `{ key: z.string(), value: z.string() }`; validate key exists; update; insert `audit_log_entries` row (event = `setting_changed`, old/new values); return 200
- [x] T151 [US19] Create `src/app/api/admin/audit-log/route.ts` — `GET ?from=&to=&actorId=&eventType=&entityId=&format=json|csv`:
  - Auth: admin only
  - Query `audit_log_entries` with filters; paginate; for CSV: set attachment header
  - Return `{ entries: [...], total: number }`
- [x] T152 [US19] Create `src/app/api/admin/appointments/route.ts` — `GET ?from=&to=&doctorId=&patientEmail=&status=&page=`:
  - Auth: admin only
  - Full cross-doctor appointment search with all filters; join doctor + patient profile data; paginated; return array
- [x] T153 [US19] Create `src/app/api/admin/appointments/[id]/cancel/route.ts` — `PATCH`:
  - Auth: admin
  - Body zod: `{ reason: z.string().min(10) }` (mandatory reason)
  - Block terminal statuses → 422
  - Update `status = 'cancelled'`; release slot; fire patient + doctor cancellation emails async
  - Insert `audit_log_entries` (event = `appointment_cancelled_by_admin`, actor = admin, old_value = `{status: 'confirmed'}`)
  - Return 200

### UI: Admin Settings & Audit Pages

- [x] T154 [US19] Create `src/app/(admin)/admin/settings/page.tsx` + `src/components/admin/SystemSettingsPanel.tsx` — Server + Client Components: table of settings with key, description, current value, default, data type, "Edit" button per row; editing opens inline field with validation (numeric range); `PATCH /api/admin/settings` on save; show "Takes effect immediately" notice; display last-updated-by and timestamp
- [x] T155 [US19] Create `src/app/(admin)/admin/audit-log/page.tsx` + `src/components/admin/AuditLogTable.tsx` — Server + Client Components: date-range picker + actor filter + event type dropdown + entity reference search; paginated results table (timestamp, actor, event type, affected entity, old → new value diff); "Export CSV" button; real-time append via Supabase Realtime on `audit_log_entries`
- [x] T156 [US19] Create `src/app/(admin)/admin/appointments/page.tsx` + `src/components/admin/AdminAppointmentSearch.tsx` — Server + Client Components: multi-filter search (date range, doctor, patient email, status); results table with appointment ID, patient, doctor, slot, status; "View" link to appointment detail; "Cancel" button (with mandatory reason dialog) for non-terminal appointments; calls `PATCH /api/admin/appointments/[id]/cancel`

**Checkpoint**: Admin changes cutoff → patient cancel path reads new value; audit log shows the change with actor + old/new values; admin can cancel any non-terminal appointment with reason.

---

## Updated Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundation — original tables)
        ├─→ Phase 2B (Foundation Extension — new tables, T051–T058)  ←── MUST complete before Phases 8–22
        │     ├─→ Phase 8  (US5 — Patient Auth & Portal)     [P2]
        │     │     └─→ Phase 9  (US6 — Doctor Clinical Notes) [P2] ← needs patient in DB
        │     │     └─→ Phase 10 (US7 — Profile & Password)   [P2] ← needs patient_profiles
        │     │     └─→ Phase 11 (US8 — Self-Service)         [P2] ← needs patient auth + system_settings
        │     ├─→ Phase 12 (US9 — Lab Orders & Results)       [P3] ← needs Phase 9 (clinical context)
        │     ├─→ Phase 13 (US10 — Payments)                  [P2] ← needs T051 (completed status)
        │     ├─→ Phase 14 (US11 — Admin Mgmt)                [P3] ← needs services table
        │     ├─→ Phase 15 (US12 — Doctor Profile)            [P2] ← needs doctor_profiles + ratings
        │     │     └─→ Phase 16 (US13 — Waitlist)            [P3] ← needs US12 profile page for UI
        │     ├─→ Phase 17 (US14 — Notifications)             [P3] ← needs all event sources
        │     ├─→ Phase 18 (US15 — Dependents)                [P2] ← needs dependents table
        │     ├─→ Phase 19 (US16 — Doc Upload)                [P3] ← needs patient-documents bucket
        │     ├─→ Phase 20 (US17 — Doctor Self-Mgmt)          [P2] ← needs doctor_profiles + T051 completed
        │     ├─→ Phase 21 (US18 — Receptionist)              [P3] ← needs check-in table
        │     └─→ Phase 22 (US19 — Admin Settings/Audit)      [P4] ← needs system_settings + audit_log
        │
        ├─→ Phase 3   (US1 — Patient Books)
        ├─→ Phase 4   (US2 — Provider Dashboard)
        ├─→ Phase 5   (US3 — Reminder Cron)
        └─→ Phase 6   (US4 — Admin Schedule Config)
```

**Phase parallelism after Phase 2B**: Phases 8, 10, 13, 14, 15, 18, 19, 20, 21, 22 are mutually independent and can all proceed in parallel once Phase 2B is done. Phases 9, 11, 12, 16, 17 each depend on an earlier new phase completing first.

---

## Parallel Execution Examples (New Phases)

### During Phase 2B (Foundation Extension)

```
Group A: T051 → T052 → T053 (enums + patient/clinical + lab/payments — sequential due to FK deps)
Group B: T054 (doctor/receptionist tables — independent of lab/payments)
Group C: T055 (patient experience tables — independent)
Group D: T056 (documents + system tables — independent)
Group E: T057 (TypeScript types — can start after all table migrations are drafted)
Group F: T058 (PL/pgSQL functions — after T051 enum changes)
```

### During Sprint 6 (Phases 8–11 after Phase 2B)

```
Group A: T059–T066 (US5 Patient Auth)
Group B: T074–T080 (US7 Profile — only needs patient_profiles)
Group C: T081–T085 (US8 Self-Service — needs auth + settings)
```

Phase 9 (T067–T073) starts after Phase 8 completes.

### During Sprint 8 (Phases 15–19 after 2B)

```
Group A: T109–T112 (US12 Doctor Profile)  → start Phase 16 (US13 Waitlist) after T110–T111
Group B: T119–T124 (US14 Notifications — independent)
Group C: T125–T129 (US15 Dependents — independent)
Group D: T130–T134 (US16 Documents — independent)
```

---

## Updated Format Validation

- **Original tasks**: 50 (T001–T050), covering US1–US4 + setup + foundation + polish
- **New tasks this round**: 106 (T051–T156), covering Phase 2B + US5–US19
- **Total tasks**: **156**
- Tasks per new user story: US5→8, US6→7, US7→7, US8→5, US9→7, US10→8, US11→8, US12→4, US13→6, US14→6, US15→5, US16→5, US17→8, US18→7, US19→7
- Foundation extension: 8 tasks (T051–T058)
- All new tasks: ✅ checkbox, ✅ Task ID, ✅ [P] markers, ✅ [USn] labels on story tasks, ✅ file paths
- Parallel opportunities: 30+ tasks marked `[P]` in new phases
- New MVP additions: Phase 2B + Phases 8, 9, 13, 15, 20 cover the highest P2 stories

---

## Format Validation

- Total tasks: **50**
- Tasks per user story: US1 → 10 (T023–T030 + T025 clarification), US2 → 6 (T031–T036), US3 → 1 (T037), US4 → 7 (T038–T044)
- Setup phase: 8 tasks (T001–T008)
- Foundation phase: 14 tasks (T009–T022)
- Polish phase: 6 tasks (T045–T050)
- All tasks: ✅ checkbox `- [ ]`, ✅ Task ID (T001–T050), ✅ [P] markers where applicable, ✅ [USn] labels on story-phase tasks, ✅ file paths in every task description
- Parallel opportunities: 20+ tasks marked `[P]`
- MVP scope: Phases 1–3 (T001–T030) = independently deployable booking system
