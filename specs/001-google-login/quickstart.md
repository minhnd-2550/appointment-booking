# Quickstart: Implement Google Login (Patient Scope)

**Branch**: `001-google-login`  
**Date**: 2026-03-17

Use this guide to implement and validate Google login in the current architecture.

---

## Prerequisites

- Existing local project setup works (`pnpm install`, `pnpm dev`)
- Supabase project configured and reachable
- Existing auth routes available:
  - `/auth/login`
  - `/auth/callback`
- Test patient account/profile data available

---

## Step 1 — Configure Google provider in Supabase

In Supabase Auth provider settings:

1. Enable Google provider.
2. Set OAuth client ID/secret from Google Cloud Console.
3. Set redirect URL to your callback endpoint:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://<your-domain>/auth/callback`

---

## Step 2 — Confirm environment configuration

Ensure local env has standard Supabase keys for app runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only usage)

No Google client secrets are stored in app code for this flow (managed by Supabase provider config).

---

## Step 3 — Add Google entry point on login page

Update `src/app/auth/login/page.tsx`:

- Add "Continue with Google" button.
- Initiate `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams? } })`.
- Preserve existing email/password login behavior.
- Keep existing error display UX and map callback error codes to readable Vietnamese messages.

---

## Step 4 — Harden callback behavior

Update `src/app/auth/callback/route.ts`:

- Handle missing/invalid code with normalized error redirects.
- Exchange code for session.
- Resolve profile role and enforce patient-scope rule for this feature.
- Apply safe redirect sanitization for `next`.

---

## Step 5 — Keep middleware role protection consistent

Review `src/middleware.ts`:

- Ensure post-login routes remain protected by role and active status.
- Confirm deactivated users are blocked consistently regardless of login method.

---

## Step 6 — Test matrix

### Manual checks

- Happy path: patient clicks Google login -> returns to patient area.
- First login path: account/profile linkage/creation behaves as expected.
- Cancel consent: user lands back at login with friendly error and retry.
- Invalid callback code: rejected, no session established.
- Existing password login: still works unchanged.

### Automated checks

- Unit: redirect sanitizer + role mapping.
- E2E: OAuth success flow, cancelled flow, invalid callback flow.

---

## Definition of Done for this feature

- FR-001..FR-013 satisfied in implementation.
- No regression in existing auth flows.
- Role enforcement remains server-side.
- Security logs available for login outcomes.
- Spec success criteria SC-001..SC-005 measurable in staging telemetry.
