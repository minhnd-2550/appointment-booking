<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Type of bump: MINOR (initial population — all sections added from scratch)

Modified principles:
  [PRINCIPLE_1_NAME] → I. Type-Safety First
  [PRINCIPLE_2_NAME] → II. Full-Stack Next.js
  [PRINCIPLE_3_NAME] → III. Supabase as Single Source of Truth
  [PRINCIPLE_4_NAME] → IV. Time-Slot Integrity (NON-NEGOTIABLE)
  [PRINCIPLE_5_NAME] → V. Notification-Driven UX

Added sections:
  - Technology Stack & Constraints
  - Development Workflow & Quality Gates

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md  — Constitution Check gates now reference
     the five principles above; no structural changes needed (gates are plan-time).
  ✅ .specify/templates/spec-template.md  — No structural changes needed; FR labels
     and acceptance criteria in specs must reference slot-integrity + notification
     requirements per Principle IV and V.
  ✅ .specify/templates/tasks-template.md — Task categories already cover
     setup/foundation/story phases; Principle IV mandates a dedicated
     "Time-Slot Integrity" task group in Phase 2 (Foundational).
  ✅ .specify/templates/commands/*.md     — Constitution is generic; no
     agent-specific (CLAUDE-only) references remain.

Deferred TODOs: none — all placeholders resolved.
-->

# Clinic Appointment Booking Constitution

## Core Principles

### I. Type-Safety First (NON-NEGOTIABLE)

TypeScript strict mode (`"strict": true`) MUST be enabled across the entire
codebase — frontend pages, backend API route handlers, utility modules, and
database access layers included.

- `any` is FORBIDDEN; use `unknown` + type guards when the shape is truly dynamic.
- All Supabase query results MUST be typed via generated or hand-written database
  type definitions (`Database` type from `supabase gen types typescript`).
- All API request/response payloads MUST have explicit TypeScript interfaces or
  `zod` schemas; runtime validation is REQUIRED at every public API boundary.
- Shared types (entities, DTOs, enums) MUST live in a single canonical location
  (`src/types/`) and MUST NOT be duplicated across modules.

**Rationale**: Healthcare scheduling data is sensitive and structurally complex
(time zones, slot states, patient records). Type errors caught at compile time
prevent booking bugs that would be costly or harmful at runtime.

### II. Full-Stack Next.js

The application MUST use a single Next.js project for both the frontend UI
(React Server Components + Client Components) and the backend API (Route
Handlers under `app/api/`). No separate Express, Fastify, or other HTTP server
is permitted.

- Pages and layouts MUST use the App Router (`app/` directory).
- Data fetching that can happen server-side MUST use Server Components or Route
  Handlers — the Supabase service-role key MUST NEVER be exposed to the browser.
- Client Components (`"use client"`) MUST be used only when interactivity or
  browser APIs are required; default to Server Components.
- Environment variables carrying secrets MUST follow the `SUPABASE_SERVICE_ROLE_KEY`
  naming convention and MUST NOT be prefixed with `NEXT_PUBLIC_`.

**Rationale**: One runtime boundary minimises DevOps surface area, enforces
consistent type sharing, and keeps the service deployable on Vercel without
additional infrastructure.

### III. Supabase as Single Source of Truth

All persistent state MUST reside in Supabase (PostgreSQL). Supabase Auth MUST
be used for identity; no third-party auth library is permitted unless it wraps
Supabase Auth transparently.

- Database schema changes MUST be expressed as versioned SQL migration files
  (`supabase/migrations/`); ad-hoc `ALTER TABLE` statements run directly on
  the hosted DB are FORBIDDEN.
- Row Level Security (RLS) MUST be enabled on every table; a table with RLS
  disabled MUST be treated as a security incident.
- Supabase Realtime SHOULD be used for live slot-availability updates rather
  than polling; polling is permitted only as a last-resort fallback.
- Supabase Storage MUST be used if file/image uploads are introduced; self-hosted
  file storage is FORBIDDEN.

**Rationale**: Supabase provides auth, DB, realtime, and storage under one
managed platform. Centralising here eliminates credential sprawl, simplifies
data-location compliance, and leverages built-in backups.

### IV. Time-Slot Integrity (NON-NEGOTIABLE)

Double-booking is a P0 defect. The system MUST guarantee that at most one
confirmed appointment exists per `(doctor_id, slot_start)` pair at all times.

- A `UNIQUE` partial index on `(doctor_id, slot_start)` WHERE
  `status IN ('pending','confirmed')` MUST exist in the database schema.
- Slot reservation MUST be handled atomically via a Supabase Database Function
  (PL/pgSQL) or a single PostgreSQL transaction; application-level
  check-then-insert patterns are FORBIDDEN.
- Slot state machine MUST be explicit: `available → pending → confirmed →
  cancelled`; no state transition outside this graph is permitted.
- Optimistic UI is permitted for UX, but MUST reconcile against authoritative DB
  state immediately after the server responds; a stale-availability conflict
  MUST surface a clear, actionable error message to the user.

**Rationale**: Race conditions in high-traffic booking systems cause real patient
harm. Database-level enforcement is the only reliable guarantee regardless of
the number of concurrent API calls.

### V. Notification-Driven UX

Every appointment lifecycle event (created, confirmed, rescheduled, cancelled,
upcoming reminder) MUST trigger a user-facing notification. Silent state changes
are FORBIDDEN.

- Email notifications MUST be sent on: booking confirmation, doctor/admin
  confirmation, reschedule, cancellation, and 24-hour pre-appointment reminder.
- Notifications MUST be delivered asynchronously via Supabase Edge Functions or
  a DB-trigger-based queue; blocking notification calls inside Route Handlers
  are FORBIDDEN.
- Notification templates MUST be versioned and stored in the repository
  (`src/notifications/templates/`); hard-coded HTML strings in business logic
  are FORBIDDEN.
- Failed notification delivery MUST be logged with a structured error entry and
  retried at least once; silent failures are FORBIDDEN.

**Rationale**: Appointment no-shows carry a direct cost to the clinic. Reliable
confirmations and reminders are core product value, not an enhancement.

## Technology Stack & Constraints

**Frontend**: Next.js 16+ (App Router), React 19+, TypeScript 5.9+, Tailwind CSS 4+
**Backend**: Next.js Route Handlers (`app/api/`), TypeScript
**Database & Auth**: Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security)
**Realtime**: Supabase Realtime (slot availability updates)
**Notifications**: Supabase Edge Functions + email provider (Resend 6+)
**Package Manager**: pnpm (preferred) or npm; yarn is FORBIDDEN
**Deployment**: Vercel (frontend + API routes); Supabase Cloud (database)
**Testing**: Vitest + React Testing Library (unit/component); Playwright (E2E)
**Linting & Formatting**: ESLint with `@typescript-eslint`, Prettier

**Constraints**:
- Node.js ≥ 22 LTS required in all environments.
- No ORM (Prisma, Drizzle, etc.) — use Supabase JS client with generated types only.
- All time values MUST be stored and transmitted in UTC (ISO 8601); conversion to
  local timezone happens only inside UI display components.
- Patient contact details MUST be encrypted at rest before any production
  deployment (Supabase Vault or column-level encryption).
- Performance target: slot availability page MUST achieve LCP < 1.5 s on a
  simulated 3G mobile connection.

## Development Workflow & Quality Gates

**Branch strategy**: `main` (production-ready) ← `develop` ← feature branches
(`feature/###-short-name`). Direct pushes to `main` are FORBIDDEN.

**Definition of Done** — a task is complete only when ALL gates pass:

1. TypeScript compiles with zero errors (`tsc --noEmit`).
2. All unit and component tests pass (`pnpm test`).
3. ESLint reports zero errors (warnings tolerated with written justification).
4. An E2E test covering the concurrent double-booking conflict scenario passes.
5. Notification delivery confirmed functional in the staging environment.
6. PR reviewed and approved by at least one other contributor.
7. No RLS-disabled tables introduced; migration file included for schema changes.

**Secret management**: No secrets committed to the repository; use `.env.local`
(git-ignored) locally and platform environment variable dashboards in CI/CD.

## Governance

This constitution supersedes all other development practices, informal
conventions, and ad-hoc decisions for this project. In any conflict between
another document and this constitution, this constitution wins.

**Amendment procedure**:
1. Open a PR with the proposed changes to this file.
2. State the version bump type (MAJOR / MINOR / PATCH) and rationale in the PR
   description, including an updated Sync Impact Report comment.
3. All active contributors MUST review; at least one approval required.
4. Update `LAST_AMENDED_DATE` and `CONSTITUTION_VERSION` in the footer on merge.

**Versioning policy** (semantic):
- `MAJOR`: Removal or incompatible redefinition of an existing principle.
- `MINOR`: New principle or section added; materially expanded guidance.
- `PATCH`: Clarifications, wording improvements, typo fixes.

**Compliance review**: Every PR MUST include a "Constitution Check" section in
its description confirming which principles are relevant and how the change
complies. The plan template enforces this gate at feature-planning time.

**Version**: 1.0.0 | **Ratified**: 2026-03-05 | **Last Amended**: 2026-03-05
