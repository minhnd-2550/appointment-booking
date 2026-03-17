# Data Model: Google Login for Patient Portal

**Phase**: 1 — Design & Contracts  
**Branch**: `001-google-login`  
**Date**: 2026-03-17

---

## Entity Overview

This feature reuses existing Supabase Auth + application profile data. No mandatory new database table is required for MVP if provider identity is already represented in auth metadata.

```text
auth.users (Supabase)
  └─< public.user_profiles
        └─ authentication session (cookie-based via @supabase/ssr)

+ sign-in audit event (application log / audit log stream)
```

---

## Entity 1 — Auth User (`auth.users`)

Represents canonical identity managed by Supabase Auth.

| Field                    | Type          | Constraints             | Notes                                           |
| ------------------------ | ------------- | ----------------------- | ----------------------------------------------- |
| `id`                     | `uuid`        | PK                      | Stable identity key used across app tables      |
| `email`                  | `text`        | unique (provider-level) | Used for account matching when verified         |
| `email_confirmed_at`     | `timestamptz` | nullable                | Verification status used by patient-route guard |
| `app_metadata.providers` | `text[]`      | provider-managed        | Includes `google` after linking/login           |
| `last_sign_in_at`        | `timestamptz` | provider-managed        | Useful for auth analytics                       |

**Validation rules**:

- Google login completion requires successful provider verification.
- Matching/linking logic must use verified email only.

---

## Entity 2 — User Profile (`public.user_profiles`)

Application profile and role data used for authorization/redirect decisions.

| Field        | Type          | Constraints               | Notes                                     |
| ------------ | ------------- | ------------------------- | ----------------------------------------- |
| `id`         | `uuid`        | PK, FK -> `auth.users.id` | 1:1 with auth user                        |
| `role`       | enum/text     | required                  | For this feature, patient flow is allowed |
| `is_active`  | `boolean`     | default true              | Deactivated users must be blocked         |
| `created_at` | `timestamptz` | required                  | Existing field                            |

**Validation rules**:

- If profile role is not `patient`, Google login in this scope must not route to patient pages.
- `is_active = false` must force sign-out/block behavior consistently with middleware.

---

## Entity 3 — Authentication Session (SSR cookie session)

Represents authenticated state after callback code exchange.

| Attribute      | Source           | Notes                                       |
| -------------- | ---------------- | ------------------------------------------- |
| Access token   | Supabase session | Stored as secure cookies by `@supabase/ssr` |
| Refresh token  | Supabase session | Rotated through middleware/session refresh  |
| Session expiry | Supabase config  | Used by existing session management         |

**State transitions**:

- `unauthenticated -> authenticated` on successful OAuth code exchange.
- `authenticated -> unauthenticated` on explicit sign-out, invalid session, or blocked user policy.

---

## Entity 4 — Sign-in Audit Event

Logical event record for observability/security.

| Field        | Type          | Notes                                                                                           |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------- |
| `event_type` | enum/text     | `google_login_success`, `google_login_failed`, `google_login_cancelled`, `google_login_blocked` |
| `user_id`    | `uuid?`       | Present when resolvable                                                                         |
| `email`      | `text?`       | Optional for traceability                                                                       |
| `reason`     | `text?`       | Failure/blocked reason code                                                                     |
| `created_at` | `timestamptz` | Event timestamp                                                                                 |

**Validation rules**:

- Failures and blocked attempts must be logged.
- Raw provider errors should be sanitized before any user-facing display.

---

## Relationships

- `auth.users (1) -> (1) user_profiles` by shared `id`.
- `auth.users (1) -> (N) sign_in_audit_events` (logical/observability relation).
- `auth.users (1) -> (N) sessions` managed by Supabase Auth runtime.

---

## Impact on Existing Schema

- No required schema migration for baseline Google login enablement.
- Optional future extension: explicit `user_identity_links` table if organization needs provider-level audit lineage beyond Supabase metadata.
