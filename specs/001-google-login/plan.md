# Implementation Plan: Google Login for Patient Portal

**Branch**: `001-google-login` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-google-login/spec.md`

## Summary

Implement patient Google OAuth login in the existing Supabase Auth flow by
adding a "Continue with Google" entry point on the login UI, handling callback
exchange and role-safe redirection, and enforcing safe account-linking rules to
avoid duplicates while preserving existing email/password authentication.

**Technical approach**: Reuse current Next.js App Router + `@supabase/ssr`
architecture (`/auth/login` + `/auth/callback`), extend login page to start
`signInWithOAuth`, and harden callback + middleware checks for patient-only
access and error handling.

## Technical Context

**Language/Version**: TypeScript 5.9+, Node.js 22 LTS  
**Primary Dependencies**:

- `next@16` + React 19 (App Router)
- `@supabase/ssr` + `@supabase/supabase-js@2` (Auth/session)
- `react-hook-form@7`, `zod@4`, `@hookform/resolvers@5` (existing auth form validation)
- shadcn/ui components (`Button`, `Form`, `Card`, etc.)

**Storage**: Supabase PostgreSQL (existing `auth.users` + `user_profiles` tables)  
**Testing**: Vitest + React Testing Library (unit/component), Playwright (E2E auth flow)  
**Target Platform**: Web (Next.js on Vercel + Supabase Cloud)  
**Project Type**: Full-stack web application (single Next.js project)  
**Performance Goals**:

- Median OAuth login completion time < 20 seconds (SC-002)
- No regression to existing auth route TTFB and protected-route redirects

**Constraints**:

- Google login is additive; email/password MUST keep working (FR-013)
- Patient-only scope for this feature; non-patient role must be blocked (FR-008)
- Callback safety: reject invalid/expired/replayed code flows (FR-009)
- No secrets in source; provider credentials only in Supabase dashboard / env config

**Scale/Scope**:

- Scope: patient login experience (`/auth/login`, `/auth/callback`, middleware role redirects)
- Out of scope: staff/admin OAuth onboarding, social providers beyond Google, MFA rollout

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                          | Status               | Notes                                                                                    |
| --- | ---------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| I   | Type-Safety First                  | ✅ PASS              | Continue typed Supabase clients and typed role checks in login/callback/middleware paths |
| II  | Full-Stack Next.js                 | ✅ PASS              | Feature lives in existing App Router pages + Route Handler (`/auth/callback`)            |
| III | Supabase as Single Source of Truth | ✅ PASS              | Auth identity remains in Supabase Auth + `user_profiles`; no external user store         |
| IV  | Time-Slot Integrity                | ✅ PASS (N/A impact) | No booking logic/schema change; existing non-negotiable booking constraints untouched    |
| V   | Notification-Driven UX             | ✅ PASS (N/A impact) | Login feature does not alter appointment lifecycle notifications                         |

**Post-design re-check**: ✅ All gates pass after design artifacts. No justified violations required.

## Project Structure

### Documentation (this feature)

```text
specs/001-google-login/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth-google.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx           # Add Google login CTA + error state handling
│   │   └── callback/route.ts        # OAuth code exchange + patient-safe redirect
│   └── (patient)/
│       └── auth/
│           └── register/page.tsx    # Keep existing password registration behavior
├── lib/
│   └── supabase/
│       ├── client.ts                # Browser auth client used by login page
│       └── server.ts                # Server auth client used by callback route
└── middleware.ts                    # Protected-route + role enforcement post-login

tests/
├── unit/
│   └── auth/                        # New pure utility tests (redirect / role mapping)
└── e2e/
    └── auth-google-login.spec.ts    # End-to-end Google login happy/error flows
```

**Structure Decision**: Use existing single-project Next.js structure. No new
service or package introduced. Implementation is constrained to current auth
pages/routes and middleware so rollout risk stays low.

## Complexity Tracking

No Constitution violations — all gates pass without extra justification.
