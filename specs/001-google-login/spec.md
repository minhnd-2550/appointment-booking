# Feature Specification: Google Login for Patient Portal

**Feature Branch**: `001-google-login`  
**Created**: 2026-03-17  
**Status**: Draft  
**Input**: User description: "bạn hãy viết thêm spec cho tính năng đăng nhập với google"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Patient signs in quickly with Google (Priority: P1)

A patient visiting the login page can choose "Continue with Google" and sign in without entering a password. If successful, the patient is signed in and taken to their patient area.

**Why this priority**: This is the core value of the feature: reducing friction at login and improving successful sign-in rate.

**Independent Test**: A tester can click "Continue with Google", complete consent using a valid Google account, and verify that they arrive on their patient portal with an active signed-in session.

**Acceptance Scenarios**:

1. **Given** a patient is on the login page and is not signed in, **When** they choose Google sign-in and complete consent successfully, **Then** the system signs them in and redirects them to the patient dashboard.
2. **Given** a signed-in patient returns to the login page, **When** page access is evaluated, **Then** the system redirects them away from login to their patient area.

---

### User Story 2 - New patient account is created safely on first Google login (Priority: P2)

When a person signs in with Google for the first time and no matching patient account exists, the system creates a new patient account and profile with essential information.

**Why this priority**: First-time onboarding is required for Google login to be useful beyond existing users.

**Independent Test**: A tester uses a Google account that has never signed in before and verifies that a new patient account is created and can immediately access patient features.

**Acceptance Scenarios**:

1. **Given** no existing patient account matches the Google identity, **When** Google sign-in completes successfully, **Then** the system creates a new patient account and signs the patient in.
2. **Given** a patient account already exists with the same verified email, **When** Google sign-in completes, **Then** the system links Google login to that same patient account instead of creating a duplicate.

---

### User Story 3 - Patients recover gracefully from sign-in failures (Priority: P3)

If Google sign-in fails, is cancelled, or cannot be completed, the patient sees a clear message and can retry or choose another login method.

**Why this priority**: Reliable error handling prevents user drop-off and support burden.

**Independent Test**: A tester cancels Google consent (or causes a callback failure) and verifies the user sees a human-readable error with a clear retry path.

**Acceptance Scenarios**:

1. **Given** a patient starts Google sign-in, **When** they cancel at Google consent, **Then** they return to login with a clear non-technical message and can retry.
2. **Given** the sign-in callback is invalid or expired, **When** the system processes it, **Then** sign-in is rejected safely, no session is created, and a retry option is shown.

---

### Edge Cases

- Google account does not provide a usable verified email for account matching.
- User starts sign-in in one tab and completes in another tab/session.
- Existing account was previously created with password login only and must be linked without duplicating profile data.
- Callback is replayed after successful sign-in.
- User attempts Google sign-in from a blocked or suspended patient account.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a visible "Continue with Google" option on the patient login page.
- **FR-002**: System MUST allow unauthenticated patients to initiate Google sign-in from the login page.
- **FR-003**: System MUST complete sign-in only after successful identity verification from Google.
- **FR-004**: On successful Google sign-in for an existing patient, system MUST create an authenticated session and redirect the patient to their patient area.
- **FR-005**: On successful Google sign-in for a first-time patient, system MUST create a new patient account and authenticated session in one flow.
- **FR-006**: System MUST prevent duplicate patient accounts when a matching verified email already exists.
- **FR-007**: System MUST link Google sign-in to an existing patient account when identity matching rules are satisfied.
- **FR-008**: System MUST block Google sign-in for non-patient roles in this feature scope and show an "insufficient permissions" style message.
- **FR-009**: System MUST reject invalid, expired, or replayed sign-in callbacks without creating a session.
- **FR-010**: System MUST show user-friendly error feedback for cancelled or failed Google sign-in and provide a retry path.
- **FR-011**: System MUST log security-relevant sign-in outcomes (success/failure/cancelled/blocked) with timestamp and actor reference where available.
- **FR-012**: System MUST preserve current sign-out behavior so users signed in via Google can sign out completely.
- **FR-013**: System MUST keep existing email/password login available; Google login is additive, not a replacement.

### Key Entities _(include if feature involves data)_

- **Identity Link**: Relationship between a patient account and external Google identity; used to avoid duplicate accounts and support repeat sign-in.
- **Authentication Session**: Active signed-in state for a patient, including creation time and expiry boundaries.
- **Sign-in Audit Event**: Record of authentication attempts/outcomes for monitoring and troubleshooting.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of patients who choose Google login complete sign-in successfully on first attempt under normal operating conditions.
- **SC-002**: Median time from clicking "Continue with Google" to reaching the patient area is under 20 seconds.
- **SC-003**: 100% of invalid/expired/replayed callbacks are rejected without creating authenticated sessions.
- **SC-004**: Duplicate-account creation rate caused by Google login is below 0.5% of first-time Google sign-ins.
- **SC-005**: At least 95% of sign-in failures present a clear recovery path (retry or alternate login) without requiring support contact.

## Assumptions

- Scope applies to **patient-facing authentication only**; staff/admin authentication remains unchanged.
- Existing patient portal access rules and protected-route behavior remain unchanged.
- Existing account suspension/blocking policies remain in effect for Google-authenticated users.
- Profile fields not provided by Google can be completed later by the patient in profile settings.
