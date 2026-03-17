# Research: Google Login for Patient Portal

**Phase**: 0 — Outline & Research  
**Branch**: `001-google-login`  
**Date**: 2026-03-17

All technical unknowns from planning context are resolved. No `NEEDS CLARIFICATION` items remain.

---

## Decision 1 — OAuth provider integration path

**Decision**: Use Supabase Auth social provider (Google) initiated from client with `supabase.auth.signInWithOAuth({ provider: 'google' })`, returning to existing `/auth/callback` route.

**Rationale**:

- Project already uses Supabase Auth + `@supabase/ssr`; this is the native path with lowest integration risk.
- Reuses existing callback route and session cookie model; no new auth framework is introduced.
- Keeps identity source centralized in Supabase, aligned with Constitution Principle III.

**Alternatives considered**:

- NextAuth/Auth.js as separate auth layer: rejected due to duplicated identity/session logic.
- Custom OAuth implementation: rejected due to security complexity and unnecessary maintenance cost.

---

## Decision 2 — Account matching and deduplication

**Decision**: Use verified email as primary matching key for first Google sign-in. If a patient account with same verified email exists, link and sign in to that account; otherwise create a new patient account/profile.

**Rationale**:

- Aligns with FR-006/FR-007 to prevent duplicate patient identities.
- Compatible with existing profile model keyed by auth user id in `user_profiles`.
- Reduces fragmented records for patient history and appointments.

**Alternatives considered**:

- Always create a new user for OAuth identities: rejected because it creates duplicate patient records.
- Manual account-link screen before first login: rejected for MVP due to higher friction and UI complexity.

---

## Decision 3 — Role safety after callback

**Decision**: Enforce role-based redirect and role blocking in callback + middleware. Google login feature allows patient usage only in this scope.

**Rationale**:

- Feature scope explicitly excludes staff/admin OAuth behavior.
- Existing middleware already performs role checks and route protection; extending logic here is low-risk and consistent.
- Prevents accidental elevation or cross-role route access after social login.

**Alternatives considered**:

- Allow all roles via Google login now: rejected as out-of-scope and would require broader policy/sign-in UX updates.
- Enforce role only in UI: rejected because server-side enforcement is required for security correctness.

---

## Decision 4 — Failure handling and UX messaging

**Decision**: Standardize error query states (`missing_code`, `auth_failed`, `access_denied`) and show user-friendly recovery UI on login page with retry action.

**Rationale**:

- Meets FR-010 and SC-005 by keeping user recovery straightforward.
- Avoids leaking low-level provider errors while still supporting troubleshooting via server logs.
- Keeps behavior consistent between password and OAuth sign-in failures.

**Alternatives considered**:

- Surface raw error strings from provider directly to end users: rejected due to poor UX and potential information leakage.
- Silent fallback to password form only: rejected because failures become unclear and hurt conversion.

---

## Decision 5 — Validation and test strategy

**Decision**: Add E2E coverage for happy path, cancel/denied path, and invalid callback path; add unit tests for redirect safety and role mapping utility functions.

**Rationale**:

- OAuth flows are integration-heavy and best validated at browser level.
- Redirect safety (`next` sanitization) is security-sensitive and should have deterministic unit tests.
- Supports success criteria on completion rate and callback rejection behavior.

**Alternatives considered**:

- Unit tests only: rejected because OAuth redirect/callback behavior is browser and cookie dependent.
- Manual QA only: rejected due to regression risk and repeatability limitations.
