# Research: Clinic Appointment Booking System

**Phase**: 0 — Outline & Research  
**Branch**: `001-appointment-booking`  
**Date**: 2026-03-05

All unknowns from Technical Context are resolved below. No NEEDS CLARIFICATION
items remain.

---

## Decision 1 — Reminder Scheduling Mechanism

**Decision**: Vercel Cron → Next.js Route Handler at `GET /api/cron/reminders`

**Rationale**:
- Vercel Cron is available on all Vercel plan tiers (including Hobby), triggers
  a Route Handler on a cron schedule defined in `vercel.json`.
- The Route Handler queries Supabase directly for appointments where
  `slot_start BETWEEN now()+23h55min AND now()+24h05min AND status='confirmed'
  AND reminder_sent = false`, sends the reminder, then flips `reminder_sent = true`.
- No additional infrastructure beyond what the project already uses (Vercel +
  Supabase). The endpoint is protected by a `CRON_SECRET` header check.

**Alternatives considered**:
- `pg_cron` (Supabase extension): Available on Pro plan only; adds operational
  complexity to manage inside the DB. Rejected — over-engineered for MVP.
- Supabase Edge Functions with a scheduled trigger: Works but requires a
  separate Edge Function runtime. Rejected — Vercel Cron achieves the same
  outcome with simpler developer experience.
- External cron services (Inngest, Trigger.dev): Great for complex workflows;
  overkill for a single recurring job. Rejected.

**`vercel.json` entry**:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
Runs every 5 minutes; the ±5-minute window in `spec.md SC-004` is satisfied.

---

## Decision 2 — Email Provider

**Decision**: [Resend](https://resend.com) with `MOCK_EMAIL=true` dev fallback

**Rationale**:
- Resend has a first-class TypeScript SDK (`resend@6`), 3,000 free emails/month,
  and native support for React Email templates (`@react-email/components`).
- React Email allows writing email templates as `.tsx` components — same toolchain
  as the rest of the project; templates are versionable and testable.
- `MOCK_EMAIL=true` in `.env.local` routes delivery to `console.log` so local
  development requires zero external credentials.

**Alternatives considered**:
- SendGrid: More powerful but heavier SDK and more complex React integration.
  Rejected — Resend is simpler for this scale.
- Nodemailer: Requires an SMTP server. Rejected — unnecessary operational overhead.
- Postmark: Excellent deliverability but no free tier. Rejected for MVP.

**sendNotification signature** (`src/lib/notifications/send.ts`):
```typescript
export async function sendNotification(
  type: NotificationType,
  to: string,
  payload: NotificationPayload
): Promise<void>
```
Throws on permanent failure after one retry; caller logs to `notification_logs`.

---

## Decision 3 — Real-Time Slot Availability

**Decision**: Supabase Realtime `postgres_changes` subscription on `appointments` table

**Rationale**:
- Patients viewing the slot grid subscribe to `INSERT` and `UPDATE` events on
  `appointments` filtered by `doctor_id`. On any change the client re-fetches
  the availability from `/api/slots` (or merges the diff).
- Provider dashboard subscribes to `INSERT` on `appointments` — new bookings
  appear without polling.
- No extra infrastructure; Supabase Realtime is included in all plan tiers.
- RLS is respected on Realtime channels — patients cannot see other patients'
  data.

**Alternatives considered**:
- Server-Sent Events (SSE) via Next.js Route Handler: Works but requires managing
  connections server-side. Rejected — Supabase Realtime is free and simpler.
- Client-side polling every N seconds: Always-on network traffic; less responsive.
  Rejected except as fallback if Realtime connection drops.

**Client-side setup** (`SlotGrid.tsx`):
```typescript
const channel = supabase
  .channel('slots-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'appointments',
    filter: `doctor_id=eq.${doctorId}`,
  }, () => refetchSlots())
  .subscribe();
```

---

## Decision 4 — Auth Flow (Next.js App Router + Supabase)

**Decision**: `@supabase/ssr` with cookie-based sessions + `middleware.ts` refresh

**Rationale**:
- `@supabase/ssr` is the official Supabase package for Next.js App Router.
  It stores the session in HTTP-only cookies (not `localStorage`) and provides
  `createBrowserClient` (Client Components) and `createServerClient`
  (Server Components, Route Handlers, middleware).
- `middleware.ts` refreshes the session on every request so tokens are always
  current without an extra round-trip on the client.
- Route protection is done in `middleware.ts` with path matchers for
  `/dashboard` and `/admin/*`; unauthenticated requests are redirected to
  `/auth/login`.

**Alternatives considered**:
- NextAuth.js: Adds another dependency and abstracts Supabase Auth. Rejected —
  Supabase Auth is sufficient and keeps auth in one place (Principle III).
- JWT in `Authorization` header: Requires different Client Component setup.
  Rejected — cookie-based sessions work more naturally with App Router SSR.

---

## Decision 5 — Atomic Booking (PL/pgSQL Function)

**Decision**: `book_appointment(p_doctor_id, p_slot_start, p_slot_end, p_patient_*)` DB function

**Rationale**:
- The function runs inside a single PG transaction with `SERIALIZABLE` isolation
  (or explicit `SELECT ... FOR UPDATE`) on the partial unique index check.
- If the slot is already taken (`pending` or `confirmed`), the function raises
  an exception with a well-known error code `BOOKING_CONFLICT`.
- Called via `supabase.rpc('book_appointment', {...})` from the Route Handler.
- Guarantees atomicity regardless of concurrent API calls — satisfies
  Constitution Principle IV.

**Function outline**:
```sql
CREATE OR REPLACE FUNCTION book_appointment(
  p_doctor_id   uuid,
  p_slot_start  timestamptz,
  p_slot_end    timestamptz,
  p_name        text,
  p_email       text,
  p_phone       text DEFAULT NULL,
  p_reason      text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Will fail with unique_violation if slot taken (partial unique index)
  INSERT INTO appointments (doctor_id, slot_start, slot_end,
    patient_name, patient_email, patient_phone, visit_reason, status)
  VALUES (p_doctor_id, p_slot_start, p_slot_end,
    p_name, p_email, p_phone, p_reason, 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
```

---

## Decision 6 — Date / Time Handling

**Decision**: `date-fns` + `date-fns-tz` for logic; `Intl.DateTimeFormat` for display

**Rationale**:
- All slot datetimes are UTC in the DB. Server-side slot generation and email
  template rendering use `date-fns-tz` to format dates in a target timezone.
- Client-side slot grid uses `Intl.DateTimeFormat(undefined, ...)` to render
  in the user's browser timezone automatically — no timezone config required.
- `date-fns` v3 is tree-shakeable and fully TypeScript-typed.
- No `moment.js` (deprecated, large bundle) or `luxon` (heavier than needed).

---

## Decision 7 — UI Component Library

**Decision**: `shadcn/ui` on top of Radix UI + Tailwind CSS

**Rationale**:
- `shadcn/ui` components are copied into `src/components/ui/` and are fully
  owned — no runtime dependency, no version lock-in.
- Built on Radix UI primitives which are WCAG-accessible out of the box
  (keyboard nav, ARIA roles).
- Styled with Tailwind utility classes consistently with the rest of the project.
- Key components used: `Button`, `Dialog`, `Select`, `Badge` (appointment status),
  `Table`, `Form` (react-hook-form integration), `Calendar`, `Toast`.

**Alternatives considered**:
- Headless UI (Tailwind Labs): Less component coverage than Radix. Rejected.
- MUI / Chakra: Runtime CSS-in-JS incompatible with Next.js RSC. Rejected.
- Mantine: Good but heavier bundle; shadcn/ui is zero-runtime. Rejected.

---

## Decision 8 — Client-Side State Management

**Decision**: TanStack Query v5 for server state; React state for local UI state

**Rationale**:
- TanStack Query handles fetching, caching, and invalidation of server data
  (slots, appointments list). Background refetch on Realtime triggers is clean.
- No global store (Zustand, Redux) is needed — all shared state is server-derived
  and managed by TanStack Query. Form state is local to components via
  react-hook-form.
- Keeps the bundle lean and avoids two layers of state for the same data.

---

## Summary of All Resolved Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Reminder scheduling | Vercel Cron → `/api/cron/reminders` Route Handler (every 5 min) |
| 2 | Email provider | Resend + React Email; `MOCK_EMAIL=true` for dev |
| 3 | Real-time availability | Supabase Realtime `postgres_changes` on `appointments` |
| 4 | Auth flow | `@supabase/ssr` cookie sessions + `middleware.ts` refresh |
| 5 | Atomic booking | PL/pgSQL `book_appointment()` function via `supabase.rpc()` |
| 6 | Date/time | `date-fns-tz` server-side; `Intl.DateTimeFormat` client-side |
| 7 | UI components | `shadcn/ui` (Radix UI + Tailwind) |
| 8 | Client state | TanStack Query v5 + react-hook-form; no global store |
