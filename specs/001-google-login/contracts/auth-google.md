# Contract: Google Login Authentication Flow

**Feature**: `001-google-login`  
**Date**: 2026-03-17

This contract defines externally observable behavior for Google login entry, callback handling, and redirects.

---

## 1) Login Page Contract (`GET /auth/login`)

### Purpose

Render authentication UI including password login and Google login entry point.

### Inputs

- Optional query params:
  - `next` (string, optional): desired post-login path, must be a safe internal route.
  - `error` (string, optional): normalized auth error code for user-facing messaging.

### Outputs

- HTML page containing:
  - Email/password login form.
  - "Continue with Google" action.
  - Error banner when `error` is present and recognized.

### Behavioral Rules

- `next` must be sanitized (only app-internal paths, reject absolute or API paths).
- Already authenticated users are redirected to role-appropriate destination.

### Error Codes (display-level)

- `missing_code`: callback arrived without code.
- `auth_failed`: provider exchange failed.
- `access_denied`: user canceled consent or denied access.
- `account_deactivated`: existing policy enforcement.

---

## 2) OAuth Callback Contract (`GET /auth/callback`)

### Purpose

Exchange one-time auth code for Supabase session and redirect user.

### Inputs (query)

- `code` (required): one-time authorization code from provider/Supabase.
- `next` (optional): post-login internal route candidate.

### Success Behavior

1. Exchange `code` for session.
2. Resolve signed-in user and corresponding profile role.
3. Enforce feature scope (patient flow).
4. Redirect to safe destination.

### Failure Behavior

- Missing `code` -> redirect `/auth/login?error=missing_code`
- Exchange failure/invalid/replayed code -> redirect `/auth/login?error=auth_failed`
- Access denied/cancelled provider flow -> redirect `/auth/login?error=access_denied`
- Blocked/deactivated profile -> sign out and redirect `/auth/login?error=account_deactivated`

### Security Rules

- Never create session on invalid/expired/replayed callback code.
- Never trust unsanitized `next` value.
- Never expose raw provider/internal error details in query params.

---

## 3) Redirect Mapping Contract

### Destination mapping

- Patient role -> `/my-appointments` (or safe `next` if provided and allowed)
- Admin/Provider/Receptionist in this feature scope -> blocked from patient Google login route handling and redirected with authorization-safe behavior
- Unknown role/no profile -> conservative fallback to `/auth/login?error=auth_failed`

### Safe `next` rules

A route is safe only if all are true:

- Starts with `/`
- Does not start with `//`
- Does not start with `/api`

---

## 4) Observability Contract

For each Google login attempt, emit log/audit event with:

- event type (success/failure/cancelled/blocked)
- timestamp
- user id when available
- normalized reason code

No PII beyond already-authorized operational logging policy.
