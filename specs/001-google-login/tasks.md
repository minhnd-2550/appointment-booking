# Tasks: Google Login for Patient Portal

**Input**: Design documents from `/specs/001-google-login/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/auth-google.md`

**Tests**: Test tasks are intentionally omitted because the feature spec does not explicitly require TDD-first test authoring.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare configuration and shared auth module structure for Google login.

- [x] T001 Update Google login environment variable documentation in .env.example
- [x] T002 Create auth module barrel file in src/lib/auth/index.ts
- [x] T003 [P] Add Google login setup section in README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared auth primitives required before user-story work.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [x] T004 Implement safe redirect-path sanitizer in src/lib/auth/redirect.ts
- [x] T005 [P] Define normalized auth error codes and mappers in src/lib/auth/auth-errors.ts
- [x] T006 [P] Implement auth audit event logger in src/lib/auth/auth-audit.ts
- [x] T007 Implement role-to-destination resolver in src/lib/auth/role-destination.ts
- [x] T008 Refactor shared auth exports for foundational utilities in src/lib/auth/index.ts

**Checkpoint**: Foundation complete — user stories can now proceed.

---

## Phase 3: User Story 1 - Patient signs in quickly with Google (Priority: P1) 🎯 MVP

**Goal**: Patient can sign in from login page using Google and land in patient portal.

**Independent Test**: Click “Continue with Google”, complete consent, and verify redirect to patient area with active session.

### Implementation for User Story 1

- [x] T009 [P] [US1] Add "Continue with Google" action UI in src/app/auth/login/page.tsx
- [x] T010 [US1] Implement Google OAuth initiation with preserved safe `next` param in src/app/auth/login/page.tsx
- [x] T011 [P] [US1] Implement callback success redirect flow for patient destination in src/app/auth/callback/route.ts
- [x] T012 [US1] Redirect already authenticated users away from login page in src/app/auth/login/page.tsx
- [x] T013 [US1] Align patient post-login redirect behavior with role resolver in src/app/auth/callback/route.ts

**Checkpoint**: User Story 1 is fully functional and demoable as MVP.

---

## Phase 4: User Story 2 - New patient account is created safely on first Google login (Priority: P2)

**Goal**: First-time Google sign-in creates/links patient account without duplicates.

**Independent Test**: First-time Google account can sign in and access patient portal; existing verified email account is linked, not duplicated.

### Implementation for User Story 2

- [ ] T014 [P] [US2] Implement patient profile upsert/link helper in src/lib/auth/patient-profile-sync.ts
- [ ] T015 [US2] Integrate first-login profile sync flow in src/app/auth/callback/route.ts
- [ ] T016 [US2] Enforce duplicate-account prevention using verified-email matching in src/lib/auth/patient-profile-sync.ts
- [ ] T017 [US2] Enforce patient-scope block for non-patient roles in src/app/auth/callback/route.ts
- [ ] T018 [US2] Ensure Google-linked users retain standard sign-out behavior in src/app/auth/signout/route.ts

**Checkpoint**: User Story 2 works independently and preserves account integrity.

---

## Phase 5: User Story 3 - Patients recover gracefully from sign-in failures (Priority: P3)

**Goal**: Cancelled/failed OAuth flows return friendly errors and retry path.

**Independent Test**: Cancel consent or use invalid callback code and verify safe redirect, user-friendly message, and retry action.

### Implementation for User Story 3

- [ ] T019 [P] [US3] Normalize callback failure branches (`missing_code`, `auth_failed`, `access_denied`) in src/app/auth/callback/route.ts
- [ ] T020 [P] [US3] Map auth error codes to friendly Vietnamese UI messages in src/app/auth/login/page.tsx
- [ ] T021 [US3] Emit structured success/failure/cancelled/blocked auth audit events in src/app/auth/callback/route.ts
- [ ] T022 [US3] Integrate callback audit logger usage in src/lib/auth/auth-audit.ts
- [ ] T023 [US3] Ensure deactivated-account OAuth handling remains consistent in src/middleware.ts

**Checkpoint**: User Story 3 handles failures cleanly without session leaks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, and rollout readiness.

- [ ] T024 [P] Document Google provider configuration and redirect URI matrix in specs/001-google-login/quickstart.md
- [ ] T025 [P] Update rollout notes and known limitations in specs/001-google-login/research.md
- [ ] T026 Validate full quickstart flow and capture final verification notes in specs/001-google-login/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2; MVP.
- **Phase 4 (US2)**: Depends on Phase 2 and builds on callback baseline from US1.
- **Phase 5 (US3)**: Depends on Phase 2 and callback/login flows established in US1.
- **Phase 6 (Polish)**: Depends on completed user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories.
- **US2 (P2)**: Starts after Foundational; functionally independent but shares callback/login files with US1.
- **US3 (P3)**: Starts after Foundational; independent failure handling slice but shares callback/login files with US1.

### Recommended Delivery Order

1. Setup + Foundational
2. US1 (MVP release)
3. US2
4. US3
5. Polish

---

## Parallel Execution Examples

### User Story 1 (US1)

- Run T009 and T011 in parallel (different files: `src/app/auth/login/page.tsx` and `src/app/auth/callback/route.ts`).

### User Story 2 (US2)

- Run T014 and T017 in parallel initially (helper creation vs callback role-gate scaffolding), then integrate with T015.

### User Story 3 (US3)

- Run T020 and T022 in parallel (UI error mapping vs logger integration), then finalize callback logic in T019 and T021.

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1).
3. Validate independent test for US1 and release MVP.

### Incremental Delivery

1. Add US2 for first-login account linking safety.
2. Add US3 for robust failure recovery and auditability.
3. Complete polish tasks and rollout checks.

### Parallel Team Strategy

1. One developer handles shared foundations (Phase 1–2).
2. After foundation:
   - Developer A: US1 login UX + callback happy path
   - Developer B: US2 account linking/profile sync
   - Developer C: US3 error handling + audit logging
3. Merge in priority order with callback file conflict resolution protocol.

---

## Notes

- `[P]` means tasks can run in parallel (different files, no unmet dependency).
- `[US1]`, `[US2]`, `[US3]` map tasks to user stories for traceability.
- All tasks include explicit file paths for direct execution.
- This breakdown is optimized for independently testable story increments and MVP-first delivery.
