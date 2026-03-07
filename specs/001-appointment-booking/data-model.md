# Data Model: Clinic Appointment Booking System

**Phase**: 1 — Design & Contracts  
**Branch**: `001-appointment-booking`  
**Date**: 2026-03-05

---

## Entity Overview

```
users (Supabase Auth)
  └─< user_profiles (role + doctor link)
        └─< doctors
              └─< working_schedules   (recurring weekly availability)
              └─< blocked_periods     (one-off unavailability)
              └─< appointments        (patient bookings)
                    └─< notification_logs
```

---

## Entity 1 — `doctors`

Represents a bookable clinic provider. Created and managed by admins.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `name` | `text` | NOT NULL | Display name |
| `email` | `text` | NOT NULL, UNIQUE | For internal reference; not patient-facing |
| `specialty` | `text` | NOT NULL | e.g. "General Practice", "Cardiology" |
| `bio` | `text` | nullable | Short description shown to patients |
| `avatar_url` | `text` | nullable | Optional profile photo URL |
| `is_active` | `boolean` | NOT NULL, default `true` | Soft-delete; inactive doctors hidden from booking |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**RLS policies**:
- `SELECT`: public (patients need to read doctor list)
- `INSERT/UPDATE/DELETE`: `admin` role only

---

## Entity 2 — `working_schedules`

Recurring weekly availability per doctor. One row per (doctor, day-of-week).
Slot times are generated on-the-fly from these records — no pre-generated slots
are stored in the DB.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `doctor_id` | `uuid` | NOT NULL, FK → `doctors.id` ON DELETE CASCADE | |
| `day_of_week` | `smallint` | NOT NULL, CHECK (0–6) | 0 = Sunday … 6 = Saturday |
| `start_time` | `time` | NOT NULL | e.g. `09:00:00` |
| `end_time` | `time` | NOT NULL | e.g. `17:00:00` |
| `slot_duration_minutes` | `smallint` | NOT NULL, CHECK (15–120) | e.g. 30 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Constraints**:
- `UNIQUE (doctor_id, day_of_week)` — one schedule per weekday per doctor
- `CHECK (start_time < end_time)`

**RLS policies**:
- `SELECT`: public
- `INSERT/UPDATE/DELETE`: `admin` role only

---

## Entity 3 — `blocked_periods`

One-off dates/time ranges during which a doctor is unavailable. Overrides
`working_schedules` when computing availability.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `doctor_id` | `uuid` | NOT NULL, FK → `doctors.id` ON DELETE CASCADE | |
| `start_at` | `timestamptz` | NOT NULL | UTC start of unavailability |
| `end_at` | `timestamptz` | NOT NULL | UTC end of unavailability |
| `reason` | `text` | nullable | e.g. "Holiday", "Conference" |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Constraints**:
- `CHECK (start_at < end_at)`
- Overlapping blocks for the same doctor are allowed (union applied when computing)

**RLS policies**:
- `SELECT`: public (needed to compute availability)
- `INSERT/UPDATE/DELETE`: `admin` role only

---

## Entity 4 — `appointments`

A booking made by a patient for a specific doctor slot.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `doctor_id` | `uuid` | NOT NULL, FK → `doctors.id` | |
| `slot_start` | `timestamptz` | NOT NULL | UTC start of the booked slot |
| `slot_end` | `timestamptz` | NOT NULL | UTC end of the booked slot |
| `patient_name` | `text` | NOT NULL | |
| `patient_email` | `text` | NOT NULL | Notification destination |
| `patient_phone` | `text` | nullable | |
| `visit_reason` | `text` | nullable | |
| `status` | `appointment_status` | NOT NULL, default `'pending'` | Enum — see below |
| `reminder_sent` | `boolean` | NOT NULL, default `false` | Flipped by cron job after reminder fires |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Enum**:
```sql
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');
```

**Indexes**:
```sql
-- Enforce time-slot integrity (Constitution Principle IV)
CREATE UNIQUE INDEX appointments_doctor_slot_unique
  ON appointments (doctor_id, slot_start)
  WHERE status IN ('pending', 'confirmed');

-- Performance: provider dashboard filtered by doctor + date
CREATE INDEX appointments_doctor_id_slot_start_idx
  ON appointments (doctor_id, slot_start);

-- Cron job: find reminders due
CREATE INDEX appointments_reminder_idx
  ON appointments (slot_start, status, reminder_sent)
  WHERE status = 'confirmed' AND reminder_sent = false;
```

**RLS policies**:
- `SELECT`: provider can see their own doctor's appointments; admin sees all;
  public can read only `status` for a given doctor+slot (availability check)
- `INSERT`: via `book_appointment()` RPC function executed with service role
- `UPDATE (status)`: provider (their doctor's appointments only); admin (all)
- `UPDATE (reminder_sent)`: service role only (cron job)
- `DELETE`: admin only

---

## Entity 5 — `notification_logs`

Audit trail of every outbound notification attempt. Never deleted.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `appointment_id` | `uuid` | NOT NULL, FK → `appointments.id` | |
| `notification_type` | `text` | NOT NULL | `booking-received` \| `confirmed` \| `cancelled` \| `reminder` |
| `recipient_email` | `text` | NOT NULL | |
| `status` | `text` | NOT NULL | `sent` \| `failed` \| `retried` |
| `error_message` | `text` | nullable | Populated on failure |
| `sent_at` | `timestamptz` | NOT NULL, default `now()` | |

**RLS policies**:
- `SELECT`: admin only
- `INSERT`: service role only (notification system)
- No UPDATE / DELETE

---

## Entity 6 — `user_profiles`

Extends Supabase Auth `auth.users` with role and doctor association.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, FK → `auth.users.id` ON DELETE CASCADE | Matches auth user ID |
| `role` | `user_role` | NOT NULL | Enum: `'provider'` or `'admin'` |
| `doctor_id` | `uuid` | nullable, FK → `doctors.id` | Set for providers; null for admins |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |

**Enum**:
```sql
CREATE TYPE user_role AS ENUM ('provider', 'admin');
```

**RLS policies**:
- `SELECT`: user can read their own row; admin can read all
- `INSERT`: admin only (admin creates provider accounts)
- `UPDATE`: admin only
- Trigger `on auth.users INSERT` creates a profile row automatically (optional)

---

## Appointment State Machine

```
                    ┌──────────────────────────────────────┐
                    │             (patient submits)         │
                    ▼                                       │
               [ pending ] ──── provider cancels ──→ [ cancelled ]
                    │
                    │ provider confirms
                    ▼
             [ confirmed ] ──── provider cancels ──→ [ cancelled ]
                    │
                    │ 24h before slot_start
                    ▼
              reminder sent
           (reminder_sent = true)
```

**Allowed transitions** (enforced in Route Handler + DB CHECK):

| From | To | Actor |
|------|-----|-------|
| `pending` | `confirmed` | Provider, Admin |
| `pending` | `cancelled` | Provider, Admin |
| `confirmed` | `cancelled` | Provider, Admin |
| Any other | Any | ❌ REJECTED |

---

## Slot Generation Logic

Slots are **not stored** in the database. They are computed on-the-fly by
`src/lib/scheduling/slots.ts` for a given `(doctorId, date)`:

```
1. Load working_schedule for doctor on that day_of_week
2. Generate candidate slots: start_time → end_time in slot_duration_minutes increments
3. Load blocked_periods that overlap the date
4. Load existing appointments for doctor on that date with status IN ('pending','confirmed')
5. Return: candidate slots MINUS blocked intervals MINUS taken appointment slots
```

This pure function is independently unit-testable (`tests/unit/scheduling/slots.test.ts`).

---

## Migration Files

```
supabase/migrations/
├── 20260305000000_initial_schema.sql
│   Creates: appointment_status, user_role enums
│   Creates: doctors, working_schedules, blocked_periods,
│            appointments, notification_logs, user_profiles tables
│   Creates: all indexes listed above
│   Enables: RLS on all tables; adds all RLS policies
│
└── 20260305000001_book_appointment_function.sql
    Creates: book_appointment() PL/pgSQL function
    Creates: update_appointment_status() PL/pgSQL function
             (validates state transition before update)
```

---

## TypeScript Domain Types (`src/types/domain.ts`)

```typescript
export const AppointmentStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;
export type AppointmentStatus = typeof AppointmentStatus[keyof typeof AppointmentStatus];

export const UserRole = {
  PROVIDER: 'provider',
  ADMIN: 'admin',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const NotificationType = {
  BOOKING_RECEIVED: 'booking-received',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REMINDER: 'reminder',
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export interface TimeSlot {
  start: Date;  // UTC
  end: Date;    // UTC
  available: boolean;
}
```
