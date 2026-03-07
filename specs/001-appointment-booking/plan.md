# Implementation Plan: Clinic Appointment Booking System

**Branch**: `001-appointment-booking` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-appointment-booking/spec.md`

## Summary

Build a full-stack, time-slot-based clinic appointment booking system where
patients browse doctor availability and self-book, providers confirm/cancel
via a real-time dashboard, and the system sends lifecycle emails plus
automated 24-hour reminders. Admins configure each doctor's recurring weekly
schedule and blocked periods through a dedicated panel.

**Technical approach**: Single Next.js 16 App Router project (frontend + API),
Supabase for auth/DB/realtime, atomic booking via PostgreSQL function,
Vercel Cron for reminders, Resend for email delivery.

## Technical Context

**Language/Version**: TypeScript 5.9+, Node.js 22 LTS
**Primary Dependencies**:
- `next@16` — full-stack framework (App Router)
- `@supabase/supabase-js@2`, `@supabase/ssr@0.9` — DB + auth client
- `tailwindcss@4`, `shadcn/ui` (Radix UI primitives) — UI components (CSS-first config, no tailwind.config.js)
- `zod@4` — runtime schema validation at all API boundaries
- `react-hook-form@7` + `@hookform/resolvers@5` — form state + zod integration
- `resend@6` — transactional email (mock-able via `MOCK_EMAIL=true` env flag)
- `react-day-picker@9` — accessible date/slot calendar picker
- `date-fns@4`, `date-fns-tz@3` — date arithmetic + timezone-aware formatting
- `@tanstack/react-query@5` — client-side data fetching and cache invalidation
- `@react-email/components@1` — React-based email template rendering

**Storage**: Supabase PostgreSQL 15 (RLS enabled on all tables); no ORM
**Testing**: Vitest + React Testing Library (unit/component); Playwright (E2E)
**Target Platform**: Web — Vercel (serverless functions + cron); Supabase Cloud
**Project Type**: Full-stack web application (single Next.js monorepo)
**Performance Goals**: LCP < 1.5 s on simulated 3G; slot update reflected < 5 s
**Constraints**:
- No ORM — Supabase JS client with generated `Database` types only
- All datetimes stored/transmitted as UTC ISO 8601
- RLS mandatory on every table; service-role key server-side only
- No secrets prefixed `NEXT_PUBLIC_`
- Booking reservation via PL/pgSQL function (atomic, no app-level check-then-insert)

**Scale/Scope**: Single clinic, ~5–20 doctors, ~500 appointments/day (MVP)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Type-Safety First | ✅ PASS | `strict: true`; zod at every Route Handler boundary; `Database` type via `supabase gen types` |
| II | Full-Stack Next.js | ✅ PASS | App Router UI + `app/api/` Route Handlers; no separate HTTP server |
| III | Supabase as Single Source of Truth | ✅ PASS | All state in Supabase; RLS on all tables; schema changes via `supabase/migrations/` |
| IV | Time-Slot Integrity | ✅ PASS | Atomic booking via PL/pgSQL `book_appointment()` function + partial unique index |
| V | Notification-Driven UX | ✅ PASS | Resend (or mock) on all lifecycle events; async fire-and-forget; templates in repo |

**Post-design re-check**: ✅ All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```
specs/001-appointment-booking/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — entity schemas + state machines
├── quickstart.md        # Phase 1 — local dev setup guide
├── contracts/
│   ├── slots.md         # GET /api/slots availability contract
│   ├── appointments.md  # POST/PATCH appointment contracts
│   └── schedules.md     # Working hours & blocked periods contracts
└── tasks.md             # Phase 2 — /speckit.tasks output (not yet created)
```

### Source Code (repository root)

```
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                     # Doctor listing / landing
│   │   └── book/
│   │       └── [doctorId]/
│   │           └── page.tsx             # Slot picker + booking form
│   ├── (provider)/
│   │   └── dashboard/
│   │       └── page.tsx                 # Appointment list + confirm/cancel actions
│   ├── (admin)/
│   │   └── admin/
│   │       └── schedules/
│   │           └── page.tsx             # Working hours + blocked periods config
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts            # Supabase auth OAuth callback
│   └── api/
│       ├── slots/route.ts               # GET — available slots for doctor+date
│       ├── appointments/
│       │   ├── route.ts                 # POST — create appointment (atomic RPC)
│       │   └── [id]/
│       │       └── status/route.ts      # PATCH — confirm or cancel
│       ├── schedules/
│       │   ├── route.ts                 # GET list, POST new schedule
│       │   └── [id]/route.ts            # PATCH, DELETE schedule entry
│       ├── blocked-periods/
│       │   ├── route.ts                 # GET list, POST new block
│       │   └── [id]/route.ts            # DELETE blocked period
│       └── cron/
│           └── reminders/route.ts       # GET — Vercel Cron endpoint (secret-protected)
│
├── components/
│   ├── booking/
│   │   ├── DoctorCard.tsx
│   │   ├── SlotCalendar.tsx             # react-day-picker wrapper
│   │   ├── SlotGrid.tsx                 # Slot buttons with realtime availability state
│   │   └── BookingForm.tsx              # react-hook-form + zod
│   ├── dashboard/
│   │   ├── AppointmentList.tsx          # Subscribes to Supabase Realtime
│   │   └── AppointmentRow.tsx
│   ├── admin/
│   │   ├── ScheduleEditor.tsx
│   │   └── BlockedPeriodForm.tsx
│   └── ui/                              # shadcn/ui generated components (Button, Dialog, etc.)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # createBrowserClient (Client Components)
│   │   └── server.ts                    # createServerClient (Route Handlers + Server Components)
│   ├── notifications/
│   │   ├── send.ts                      # Resend adapter + MOCK_EMAIL=true fallback
│   │   └── templates/
│   │       ├── booking-received.tsx     # @react-email template
│   │       ├── confirmed.tsx
│   │       ├── cancelled.tsx
│   │       └── reminder.tsx
│   └── scheduling/
│       └── slots.ts                     # Pure fn: generate slots from schedule minus blocked periods
│
├── types/
│   ├── database.ts                      # Generated: supabase gen types typescript
│   └── domain.ts                        # AppointmentStatus enum, domain interfaces, DTOs
│
└── middleware.ts                        # Supabase session refresh + route auth protection

supabase/
├── migrations/
│   ├── 20260305000000_initial_schema.sql
│   └── 20260305000001_book_appointment_function.sql
└── seed.sql                             # Local dev seed data

tests/
├── unit/
│   └── scheduling/slots.test.ts         # Slot generation logic (pure fn)
├── integration/
│   └── appointments/booking.test.ts     # Atomic booking + race-condition simulation
└── e2e/
    ├── booking.spec.ts                  # Full booking flow + conflict scenario
    └── provider-dashboard.spec.ts       # Confirm/cancel + realtime update

vercel.json                              # Cron job definition (reminder schedule)
.env.example                             # All required env vars documented
```

**Structure Decision**: Single Next.js project. Route Groups `(public)`, `(provider)`,
`(admin)` separate pages by auth tier. All business logic in `src/lib/` for
testability independent of Next.js. Supabase clients centralised in
`src/lib/supabase/`. No separate backend — satisfies Constitution Principle II.

## Complexity Tracking

No Constitution violations — all five principles satisfied without trade-offs.
No added complexity to justify.
