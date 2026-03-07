# Feature Specification: Clinic Appointment Booking System

**Feature Branch**: `001-appointment-booking`  
**Created**: 2026-03-05  
**Status**: Draft  
**Input**: User description: "Xây dựng hệ thống đặt lịch theo khung giờ, với xác nhận và nhắc lịch. Người dùng xem Availability, đặt Appointment, nhà cung cấp xác nhận/huỷ, hệ thống gửi Reminder (email/mock). Quản trị cấu hình khung giờ nghỉ/làm việc."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Patient Books an Appointment (Priority: P1)

A patient (unauthenticated or logged-in) visits the booking page, selects a
doctor, picks an available date, chooses an open time slot, fills in contact
details, and submits. The system creates a pending appointment and sends a
booking-received email to the patient.

**Why this priority**: This is the core value of the product. Without it,
nothing else matters. It validates the full happy path from slot display to
confirmation email.

**Independent Test**: A tester can open the booking page, complete a booking
for a doctor who has configured working hours, and verify that (a) the slot
disappears from the availability calendar for other users, and (b) a
booking-received email arrives in the patient's inbox (or mock log).

**Acceptance Scenarios**:

1. **Given** a doctor has at least one available slot for today, **When** a
   patient selects that slot and submits valid contact details, **Then** the
   system creates an appointment with status `pending`, the slot is no longer
   shown as available to other users, and the patient receives a
   "Booking Received" email within 60 seconds.

2. **Given** a patient is on the slot selection screen, **When** another user
   books the same slot concurrently before the first patient submits, **Then**
   the first patient sees a clear "This slot was just taken — please choose
   another" message and is returned to the slot picker without losing their
   other form data.

3. **Given** a patient submits the booking form with an invalid email address,
   **When** the form is validated, **Then** the system rejects the submission
   with an inline field error and does not create any appointment record.

4. **Given** no slots are available for the selected doctor on the chosen date,
   **When** the patient views the calendar, **Then** all slots for that date
   are shown as unavailable and the patient cannot select them.

---

### User Story 2 — Provider Confirms or Cancels an Appointment (Priority: P2)

A doctor or clinic staff member (provider) logs in to their dashboard, views
the list of pending appointments, and either confirms or cancels each one.
The patient receives an email notification for either outcome.

**Why this priority**: Confirmation closes the booking loop and gives the
patient certainty. Without this, appointments stay perpetually pending and the
reminder system cannot fire on confirmed-only appointments.

**Independent Test**: A provider can log in, see a pending appointment created
in US1, click Confirm, and verify the appointment status changes to `confirmed`
and the patient's inbox (or mock log) shows a "Appointment Confirmed" email.
Separately, clicking Cancel changes status to `cancelled` and fires a
"Appointment Cancelled" email.

**Acceptance Scenarios**:

1. **Given** a provider is logged in and there is at least one `pending`
   appointment, **When** the provider clicks "Confirm", **Then** the
   appointment status changes to `confirmed`, the slot remains blocked, and
   the patient receives a "Appointment Confirmed" email within 60 seconds.

2. **Given** a provider clicks "Cancel" on a `pending` or `confirmed`
   appointment, **When** the cancellation is submitted, **Then** the
   appointment status changes to `cancelled`, the slot becomes available again
   for new bookings, and the patient receives a "Appointment Cancelled" email.

3. **Given** a provider's dashboard is open, **When** a new pending appointment
   is created by a patient in another session, **Then** the new appointment
   appears in the provider's list without a full page reload (real-time update).

4. **Given** an appointment is already in `cancelled` status, **When** the
   provider attempts to confirm it, **Then** the system rejects the action with
   an appropriate error message and makes no state change.

---

### User Story 3 — System Sends 24-Hour Reminder (Priority: P3)

For every `confirmed` appointment, the system automatically sends a reminder
email to the patient 24 hours before the appointment start time. No manual
action is required from the provider or patient.

**Why this priority**: Reduces no-show rates, which is a direct business
outcome. Depends on US2 (confirmed appointments must exist first) but is
independently deliverable once the scheduling infrastructure is in place.

**Independent Test**: A tester creates a confirmed appointment with a start
time 25 hours in the future, advances the system clock (or waits), and verifies
that a reminder email arrives in the patient's inbox (or mock log) approximately
24 hours before the appointment.

**Acceptance Scenarios**:

1. **Given** a `confirmed` appointment is scheduled for tomorrow at 10:00,
   **When** the system clock reaches 24 hours before that time (today at 10:00),
   **Then** a "Reminder: Your appointment is tomorrow" email is sent to the
   patient's registered address.

2. **Given** a confirmed appointment is cancelled after the reminder job
   processes it, **When** the cancellation email is sent, **Then** no duplicate
   reminder is sent for the already-cancelled record (idempotent delivery).

3. **Given** the email provider is temporarily unavailable, **When** the reminder
   job runs, **Then** the failure is logged with a structured error entry and
   the delivery is retried at least once before marking as failed.

---

### User Story 4 — Admin Configures Working Hours and Blocked Slots (Priority: P4)

A clinic administrator logs in to the admin panel and configures, for each
doctor, the recurring weekly working schedule (days and hours) and any specific
blocked-off periods (holidays, breaks, days off). The availability calendar
immediately reflects these changes.

**Why this priority**: Without configured working hours, the availability
calendar cannot display any bookable slots. Logically prerequisite to US1, but
delivered as a separate story because it has its own independent admin UI.

**Independent Test**: An admin can set Monday 09:00–17:00 for a doctor (with
a 13:00–14:00 lunch break), verify that those slots appear in the booking calendar,
then add a blocked period for the entire next Monday and verify all those slots
disappear.

**Acceptance Scenarios**:

1. **Given** an admin is on the schedule configuration page for a specific
   doctor, **When** the admin sets working hours (e.g., Mon–Fri 09:00–17:00,
   slot duration 30 minutes), **Then** the availability calendar for that doctor
   shows the expected bookable slots starting from the next working day.

2. **Given** working hours are configured, **When** the admin adds a blocked
   period (e.g., 2026-04-01, all day), **Then** all slots on that date are
   removed from the availability calendar immediately.

3. **Given** a slot is blocked by admin config but an existing `confirmed`
   appointment already occupies that slot, **When** the block is applied,
   **Then** the existing appointment is NOT automatically cancelled — the system
   warns the admin that a conflict exists and requires explicit action.

4. **Given** an admin sets a slot duration of 30 minutes with working hours
   09:00–11:00, **When** the patient views the calendar, **Then** exactly 4
   slots are shown (09:00, 09:30, 10:00, 10:30).

---

### User Story 5 — Patient Registers, Logs In, and Tracks Appointments (Priority: P2)

A new patient creates an account with email and password, logs in, and can view
their complete appointment history. For each past visit where a doctor has recorded
clinical information, the patient can read the diagnosis, examination notes, and
prescribed medications.

**Why this priority**: Account creation enables continuity of care — patients can
review prescribed medications and past diagnoses without relying solely on email
receipts, and clinic staff gain access to a longitudinal patient record.

**Independent Test**: A tester registers as a new patient, books and completes an
appointment, and after the doctor records a diagnosis and prescription, the patient
logs in and sees those details on the appointment detail page.

**Acceptance Scenarios**:

1. **Given** an unregistered user visits the registration page, **When** they
   submit a valid email and a password meeting minimum-strength requirements,
   **Then** a new Patient account is created, the user is logged in, and
   redirected to their My Appointments page.

2. **Given** a registered patient logs in, **When** they navigate to My
   Appointments, **Then** they see a list of all their appointments (upcoming
   and past) sorted by date, showing doctor name, specialty, date/time, and
   status.

3. **Given** a doctor has saved diagnosis and prescription data for a completed
   appointment, **When** the authenticated patient opens that appointment's detail
   view, **Then** they can read the diagnosis text, examination notes, and the
   full prescription (medication name, dosage, frequency, duration per item).

4. **Given** a patient with no appointment history logs in, **When** they open
   the My Appointments page, **Then** an empty-state message is shown with a
   clear prompt to book their first appointment.

5. **Given** a patient enters the wrong password, **When** login fails, **Then**
   the system returns a non-specific "Invalid email or password" error to prevent
   account enumeration.

---

### User Story 6 — Doctor Views Patient List and Records Clinical Notes (Priority: P2)

A doctor logs in to their dashboard, browses the list of patients who have booked
or attended appointments with them, opens a patient's history, and records or edits
a diagnosis, examination notes, and prescription items for each visit.

**Why this priority**: Clinical documentation closes the loop between the booking
system and healthcare delivery, transforming the platform from a pure scheduler
into a lightweight electronic medical record.

**Independent Test**: A doctor logs in, opens a confirmed appointment, adds a
diagnosis and a two-item prescription, saves the record, and verifies the
information is visible when the authenticated patient views that appointment.

**Acceptance Scenarios**:

1. **Given** a doctor is logged in and has at least one patient with an
   appointment, **When** they navigate to the Patients section, **Then** they
   see a paginated, searchable list showing patient name, email, and most recent
   appointment date.

2. **Given** a doctor selects a patient from the list, **When** the patient
   profile opens, **Then** it shows a full chronological history of all
   appointments that patient has had with that doctor, with status and date
   visible for each visit.

3. **Given** a doctor opens a specific `confirmed` or `completed` appointment,
   **When** they enter a diagnosis and one or more prescription items and click
   Save, **Then** the clinical record is saved, timestamped, and attributed to
   that doctor.

4. **Given** a doctor attempts to edit clinical notes on a `cancelled`
   appointment, **Then** the system rejects the change with a clear error
   message and the existing record remains unchanged.

5. **Given** a doctor edits a previously saved prescription, **When** the save
   is confirmed, **Then** the authenticated patient sees the updated prescription
   on their next view.

---

### User Story 7 — Patient Manages Profile and Medical Background (Priority: P2)

A registered patient can view and update their personal profile (date of birth,
gender, address, emergency contact) and maintain a medical background list of
known allergies and chronic conditions. If they forget their password, they can
reset it through an email link without contacting clinic staff.

**Why this priority**: A richer patient profile removes the need to re-enter
personal details on every booking, surfaces allergy safety information to the
treating doctor before a visit, and gives patients autonomous control of their
own account.

**Independent Test**: A tester registers, navigates to their Profile page, adds
a date of birth and an allergy entry, saves successfully, then logs out and uses
the Forgot Password flow to reset their password and log back in.

**Acceptance Scenarios**:

1. **Given** a registered patient on their Profile page, **When** they update
   date of birth, gender, address, or emergency contact and click Save, **Then**
   all changes are persisted and the profile page immediately reflects the
   updated values.

2. **Given** a patient on their Medical Background section, **When** they add
   an allergy or chronic-condition entry and save, **Then** the entry appears
   on their profile and is visible to the treating doctor on the appointment
   clinical view.

3. **Given** a patient who has forgotten their password, **When** they submit
   the Forgot Password form with their registered email, **Then** a one-time
   reset link is sent to that email and expires after 60 minutes.

4. **Given** a patient clicks a valid, unexpired reset link and enters a new
   password meeting minimum-strength requirements, **Then** the password is
   updated, the link is invalidated, and they are redirected to My Appointments.

5. **Given** a patient uses an expired or already-used reset link, **Then** the
   system displays a clear expiry error and offers to send a fresh reset email.

---

### User Story 8 — Patient Reschedules or Cancels Their Own Appointment (Priority: P2)

An authenticated patient can reschedule an upcoming `pending` or `confirmed`
appointment to a different open slot with the same doctor, or cancel it
themselves. Changes are blocked within a configurable cutoff window before the
appointment start, and the doctor receives an automated notification for every
patient-initiated change.

**Why this priority**: Self-service rescheduling and cancellation reduces
administrative workload for clinic staff, increases patient satisfaction, and
ensures slots are freed in time for other patients to book.

**Independent Test**: A patient with a confirmed appointment 48 hours away
reschedules it to a different slot, verifies the new slot appears in their
history and the original slot is released, then cancels the rescheduled
appointment and verifies the slot is freed again.

**Acceptance Scenarios**:

1. **Given** a patient has a `pending` or `confirmed` appointment outside the
   cutoff window, **When** they select a new available slot and confirm the
   reschedule, **Then** the original appointment is cancelled, a new `pending`
   appointment is created for the new slot, and both patient and doctor receive
   a reschedule notification email.

2. **Given** a patient initiates a reschedule or cancellation within the cutoff
   window (e.g., within 2 hours of the appointment), **Then** the system blocks
   the action with a clear message explaining the cutoff policy.

3. **Given** a patient cancels their own appointment outside the cutoff window,
   **When** the cancellation is confirmed, **Then** the status changes to
   `cancelled`, the slot is released, and both the patient and the doctor
   receive a cancellation notification email.

4. **Given** a patient attempts to modify an appointment that is already
   `cancelled`, `completed`, or `no-show`, **Then** the system rejects the
   action with a read-only error message.

---

### User Story 9 — Doctor Orders Tests and Records Examination Results (Priority: P3)

During or after a consultation, a doctor can attach one or more lab or imaging
test orders to an appointment. Once results are available, the doctor (or
authorised staff) records the results as text or uploads a file. The
authenticated patient can view their results from the appointment detail page.

**Why this priority**: Test orders and results are core to a complete electronic
health record, enabling the system to serve as the single source of truth for
a patient's visit beyond appointments and prescriptions alone.

**Independent Test**: A doctor opens a confirmed appointment, creates a
blood-test order, saves it, then enters a text result. The patient logs in and
reads the result from their appointment detail page.

**Acceptance Scenarios**:

1. **Given** a doctor is viewing a `confirmed` or `completed` appointment,
   **When** they create a test order with name, type (lab/imaging/other), and
   optional instructions, **Then** the order is saved and appears in the
   clinical section of the appointment.

2. **Given** a test order exists, **When** the doctor records a result
   (free-text or file upload ≤ 10 MB), **Then** the result is attached to the
   order with a timestamp and the patient sees a "Results available" indicator
   on their appointment.

3. **Given** a patient opens an appointment detail with at least one completed
   result, **When** they view the Test Results section, **Then** they can read
   each result text or download the attached file.

4. **Given** a doctor uploads a result file exceeding 10 MB, **Then** the
   upload is rejected with a clear error before submission and no partial file
   is stored.

5. **Given** a doctor attempts to create a test order on a `cancelled` or
   `no-show` appointment, **Then** the system rejects the action with a clear
   status error.

---

### User Story 10 — Patient Pays for Consultation and Views Invoice (Priority: P2)

After a consultation is completed, the patient is presented in their portal
with the consultation fee configured for that specialty or doctor. The patient
can pay online; on success a sequentially numbered PDF invoice is generated,
emailed to the patient, and permanently available for download in the portal.

**Why this priority**: Payment collection is a core business operation.
Automating invoicing eliminates manual billing steps for reception staff and
gives patients an auditable record of their expenses.

**Independent Test**: Admin configures a consultation fee. A patient books,
completes an appointment, sees "Awaiting Payment" in their portal, pays, and
immediately receives an invoice by email and can download it from the portal.

**Acceptance Scenarios**:

1. **Given** an appointment moves to `completed` status, **When** the patient
   opens their portal, **Then** the appointment shows "Awaiting Payment" with
   the consultation fee amount and a Pay Now button.

2. **Given** a patient submits valid payment details, **When** the gateway
   confirms success, **Then** a numbered invoice is generated, stored, and
   emailed to the patient within 60 seconds.

3. **Given** a payment fails (e.g., insufficient funds, gateway timeout),
   **Then** the appointment status remains "Awaiting Payment", the patient
   sees a specific failure message and a retry option, and no invoice is
   generated.

4. **Given** an appointment is cancelled before payment, **When** the
   cancellation is processed, **Then** the pending payment is voided; if any
   amount was captured it is queued for refund and shown to the patient as
   `refund_pending`.

5. **Given** a patient opens the Invoices section of their portal, **Then**
   they see all invoices with amount, date, status, and a per-invoice PDF
   download link.

---

### User Story 11 — Admin Manages Users, Service Catalogue, and Reports (Priority: P3)

A clinic administrator can create and deactivate provider accounts, manage the
specialty and service catalogue (including default consultation fees), and view
summary dashboards and exportable reports covering appointment volumes and
revenue for a chosen date range.

**Why this priority**: User management is required to onboard new doctors;
pricing configuration feeds the payment flow; operational reports give
management the visibility needed to run the clinic.

**Independent Test**: Admin creates a new doctor account, configures a
consultation fee for their specialty, verifies the doctor appears in the booking
calendar, generates a monthly revenue report, and exports it as CSV.

**Acceptance Scenarios**:

1. **Given** an admin creates a new Provider account (email, name, specialty),
   **When** submitted, **Then** an invitation email is sent to the provider and
   they appear in the system as inactive until the invitation is accepted.

2. **Given** an admin deactivates a Provider account that has active
   appointments, **When** the change is saved, **Then** the provider no longer
   appears in the booking calendar and the admin must acknowledge a warning
   about active appointments before deactivation proceeds.

3. **Given** an admin updates the default consultation fee for a specialty,
   **When** saved, **Then** all new bookings under that specialty use the
   updated fee; existing in-flight appointments are not retroactively repriced.

4. **Given** an admin selects a date range on the Reports page, **When** the
   report is generated, **Then** it shows total appointments by status, revenue
   collected, revenue by specialty and by doctor, plus an Export CSV button.

5. **Given** an admin views any doctor's profile, **Then** they can see that
   doctor's aggregate star rating, total completed appointments, and average
   appointments per week.

---

### User Story 12 — Patient Views Detailed Doctor Profile (Priority: P2)

Before committing to a booking, a patient can open a doctor's full profile page
showing biography, qualifications, specialty, consultation fee, next available
slot, and a breakdown of ratings and recent reviews. The profile is publicly
accessible without an account.

**Why this priority**: Patients make higher-confidence booking decisions when
they can evaluate a doctor's credentials and social proof upfront. Without a
profile page, the discovery experience is limited to a name and specialty.

**Independent Test**: A guest visitor searches for a doctor, opens their
profile, reads their bio and fee, sees the star rating breakdown, and clicks
"Book Now" — landing directly on the slot-selection screen for that doctor.

**Acceptance Scenarios**:

1. **Given** a patient is on the doctor listing, **When** they click a doctor
   card, **Then** the doctor's profile page loads showing: photo, full name,
   specialty, bio, qualifications, languages spoken, consultation fee, and
   next available appointment date.

2. **Given** a doctor has at least one published review, **When** the patient
   views the profile, **Then** the rating section shows the aggregate score,
   total review count, a star-distribution breakdown, and the 5 most recent
   visible reviews.

3. **Given** a doctor has no available slot in the next 30 days, **When** a
   patient views their profile, **Then** the profile shows a clear
   "No upcoming slots" message alongside a waitlist option (US13).

4. **Given** a patient clicks "Book Now" on a doctor's profile, **Then** they
   are taken directly to the slot-selection screen pre-filled with that doctor.

---

### User Story 13 — Patient Joins a Waitlist for Fully-Booked Slots (Priority: P3)

When no slots are available for a desired doctor or date, a registered patient
can join a waitlist. When a cancellation or reschedule frees a slot that matches
the waitlisted criteria, the system automatically notifies the patient by email
so they can claim the slot before it goes back to the public calendar.

**Why this priority**: Cancellations create open capacity that is otherwise
wasted. Waitlist fills that gap automatically, improving slot utilisation and
patient satisfaction without requiring manual outreach from staff.

**Independent Test**: With a fully-booked doctor, a tester joins the waitlist.
A separate session then cancels an appointment for that doctor. Within 60
seconds the tester receives a waitlist-opportunity email with a claim link that
expires after 30 minutes.

**Acceptance Scenarios**:

1. **Given** no slots are available for a doctor, **When** a registered patient
   clicks "Join Waitlist", **Then** a waitlist entry is created for that patient
   and doctor, and a confirmation message is displayed and emailed.

2. **Given** a slot becomes available (via cancellation or reschedule),
   **When** the system detects the opening, **Then** every patient on the
   waitlist for that doctor receives a notification within 60 seconds containing
   a time-limited claim link (default 30-minute expiry).

3. **Given** a patient clicks the claim link within the expiry window, **When**
   they confirm the slot, **Then** a new appointment is created for them, the
   slot is removed from availability, and the patient receives a booking
   confirmation email.

4. **Given** a patient's claim link has expired before they click it, **Then**
   the slot returns to the public availability calendar and the patient remains
   on the waitlist for the next opening.

5. **Given** a patient is on the waitlist, **When** they navigate to their
   My Appointments page, **Then** they can see their active waitlist entries
   and cancel any of them.

---

### User Story 14 — Patient Controls Notification Preferences and Views In-App Alerts (Priority: P3)

A registered patient has a notification centre in their portal showing a feed
of unread system events (appointment confirmed, result available, payment due,
rating prompt, waitlist opportunity). They can also configure which events
trigger email notifications.

**Why this priority**: Email-only coverage means patients miss real-time
updates when not checking email, and those who are over-notified unsubscribe.
Giving patients control improves both engagement and data quality.

**Independent Test**: A patient turns off reminder email notifications,
proceeds to have an appointment confirmed, and verifies no reminder email
arrives but the in-portal notification feed shows the confirmation alert.

**Acceptance Scenarios**:

1. **Given** a patient navigates to Notifications in their portal, **Then**
   they see a chronological feed of all system events relating to their
   account, with unread items highlighted and an overall unread count badge
   on the navigation.

2. **Given** a new system event is generated (e.g., appointment confirmed),
   **When** the patient's portal is open, **Then** the unread badge count
   increments without a full page reload.

3. **Given** a patient opens Notification Preferences, **When** they toggle
   off email notifications for a specific event type (e.g., Appointment
   Reminder), **Then** subsequent events of that type do NOT trigger an email
   but still appear in the in-portal feed.

4. **Given** a patient marks all notifications as read, **Then** the unread
   badge clears and all items are shown in a read state.

---

### User Story 15 — Patient Books on Behalf of a Family Member / Dependent (Priority: P2)

A registered patient can create and manage dependent profiles (e.g., children,
elderly parents) linked to their account. When booking, they can select a
dependent as the patient so appointment and clinical records are organised
under that dependent rather than the account holder.

**Why this priority**: Many clinic visits are made for children or elderly
relatives. Without dependent support, parents must create separate accounts per
family member or lump all records under one profile — both create confusion for
clinical staff.

**Independent Test**: A parent registers, creates a dependent profile for their
child, books an appointment selecting the child as patient, completes the visit,
and verifies the clinical record and invoice are attributed to the child's
dependent profile, not the parent's own history.

**Acceptance Scenarios**:

1. **Given** an authenticated patient on their Account page, **When** they
   create a dependent with name, date of birth, gender, and relationship
   (e.g. Child), **Then** the dependent appears in their profile and can be
   selected when booking.

2. **Given** a patient is on the booking form, **When** they switch from
   "Booking for myself" to a dependent, **Then** the appointment is created
   with the dependent's name and the account-holder's contact email; clinical
   records and invoices are grouped under the dependent's profile.

3. **Given** a patient views My Appointments, **Then** they can filter between
   their own appointments and appointments made for each of their dependents.

4. **Given** a patient attempts to delete a dependent profile that has active
   or historical appointments, **Then** the system blocks deletion with a
   clear error; deactivation (hiding the profile without data loss) is offered
   as the alternative.

---

### User Story 16 — Patient Uploads Supporting Documents Before a Visit (Priority: P3)

Before an upcoming appointment, an authenticated patient can upload supporting
documents such as referral letters or previous external test results. The
treating doctor sees these documents in the appointment's clinical view,
alongside doctor-uploaded examination results.

**Why this priority**: Bringing physical documents to a first visit is
unreliable. Pre-upload reduces consultation time spent re-explaining history
and gives the doctor full context before the patient even walks in.

**Independent Test**: A patient with a confirmed appointment uploads a PDF
referral letter. The doctor logs in, opens the appointment, and can read and
download the patient-uploaded document from the Supporting Documents section.

**Acceptance Scenarios**:

1. **Given** a patient has a `pending` or `confirmed` appointment, **When**
   they open the appointment and attach a file (PDF, JPEG, or PNG, ≤ 10 MB)
   with a document type (referral | previous_result | insurance | other) and
   optional description, **Then** the upload succeeds and the document appears
   in the appointment's Uploaded Documents section.

2. **Given** a patient uploads a file exceeding 10 MB or of an unsupported
   type, **Then** the upload is rejected before submission with a clear error
   message; no partial file is stored.

3. **Given** a doctor opens the appointment in their clinical dashboard,
   **Then** a Supporting Documents section shows all patient-uploaded files
   with type, description, upload date, and a download link.

4. **Given** a patient attempts to upload a document to a `cancelled`,
   `completed`, or `no-show` appointment, **Then** the system rejects the
   action with a read-only status error.

5. **Given** an unauthenticated user or a different patient attempts to access
   a patient-uploaded document URL directly, **Then** the system returns HTTP
   403; file access MUST be enforced via signed tokens identical to the rules
   governing examination results (FR-054).

---

### User Story 17 — Doctor Manages Their Own Profile and Completes Appointments (Priority: P2)

A doctor can view and update their own public profile (photo, biography,
qualifications, languages spoken) and set a personal consultation fee that
overrides the specialty default. From their dashboard the doctor can see their
daily appointment queue in order and mark a `confirmed` appointment as
`completed` at the end of a visit. They can also generate a printable
prescription PDF for the patient to take to a pharmacy.

**Why this priority**: Profile management enables doctors to maintain accurate
credentials without constantly relying on admin intervention. Marking
appointments as `completed` is a core trigger for payment and rating flows —
without it, the billing pipeline never fires.

**Independent Test**: A doctor logs in, updates their bio and sets a fee
override, then opens today's schedule, marks a confirmed appointment as
completed, and generates a PDF prescription — all without contacting an admin.

**Acceptance Scenarios**:

1. **Given** an authenticated provider on their Profile Settings page, **When**
   they update their photo, bio, qualifications, or languages spoken and click
   Save, **Then** all changes are persisted and immediately reflected on the
   public doctor profile page (US12).

2. **Given** a doctor sets a personal consultation fee override, **When** a new
   appointment is subsequently booked under that doctor, **Then** the
   appointment's payment record uses the doctor's override fee rather than the
   specialty default.

3. **Given** a doctor navigates to Today's Schedule, **Then** they see all
   their appointments for the current calendar day, listed in chronological
   order, showing patient name (or dependent name), appointment time, status,
   and quick-action buttons (Confirm / Complete / No-Show / Internal Note) per
   row.

4. **Given** a doctor clicks "Mark as Completed" on a `confirmed` appointment,
   **Then** the appointment status changes to `completed`, the payment record
   is created (FR-057), the rating prompt is queued (FR-063), and an optional
   post-visit summary email is sent to the patient.

5. **Given** a doctor opens a `confirmed` or `completed` appointment with at
   least one prescription item, **When** they click "Print Prescription",
   **Then** a formatted PDF is generated containing: clinic name, doctor name
   and qualifications, patient name, appointment date, and all prescription
   items; the PDF is downloadable from both the doctor's dashboard and the
   patient portal.

6. **Given** a doctor adds an internal note to an appointment, **Then** the
   note is saved and visible only to providers and admins; it MUST NOT appear
   in any patient-facing view, confirmation email, or data export.

---

### User Story 18 — Receptionist Handles Walk-Ins, Phone Bookings, and Patient Check-In (Priority: P3)

A clinic receptionist (a distinct staff role, separate from Provider and Admin)
can book appointments on behalf of patients who visit in person or call by
phone, check in a patient when they arrive at the clinic, update patient
contact details on an existing booking, and view the full day-view schedule for
all doctors.

**Why this priority**: Many clinic bookings happen via phone or walk-in rather
than through the patient portal. Without a receptionist workflow, staff must
use workarounds that create data inconsistencies. Check-in gives the treating
doctor real-time visibility that the patient is physically present.

**Independent Test**: A receptionist logs in, creates a walk-in appointment for
a new patient, marks the patient as checked in upon arrival, views the full
clinic schedule for today, and confirms that the checked-in indicator is visible
to the treating doctor on their dashboard.

**Acceptance Scenarios**:

1. **Given** a receptionist is logged in, **When** they select a doctor, choose
   an available slot, and enter the patient's name, email, and phone, **Then**
   a `pending` appointment is created and a booking-received email is sent to
   the patient's address.

2. **Given** a receptionist opens an existing `pending` or `confirmed`
   appointment, **When** they update the patient's contact name, email, or
   phone and click Save, **Then** the changes are persisted; editing contact
   details on `completed`, `cancelled`, or `no-show` appointments MUST be\
   blocked with a read-only error.

3. **Given** a patient arrives at the clinic and a receptionist clicks "Check
   In" on their `confirmed` appointment, **Then** a check-in timestamp is
   recorded, the appointment shows a "Checked In" indicator visible to the
   treating doctor on the Today's Schedule view, and the main appointment
   status remains `confirmed` until the doctor marks it `completed`.

4. **Given** a receptionist navigates to the Clinic Day View, **When** they
   select a date, **Then** they see a consolidated schedule for all doctors
   on that date, showing each doctor's appointment queue colour-coded by
   status, with a count of checked-in vs. total appointments per doctor column.

5. **Given** a receptionist attempts to access clinical notes, lab orders,
   examination results, prescriptions, invoices, or any admin report,
   **Then** the system denies access with an HTTP 403 and shows a clear
   "Insufficient permissions" message.

---

### User Story 19 — Admin Configures System Settings and Views Audit Log (Priority: P4)

A clinic administrator can manage all global system configuration values
(cancellation cutoff, reminder timing, file size limits, waitlist claim expiry)
from a dedicated System Settings panel without requiring a code deployment. The
admin also has access to a searchable audit log covering all significant system
events (account changes, appointment state transitions, setting changes) to
support healthcare compliance and incident investigation.

**Why this priority**: Multiple FRs explicitly state that thresholds are
"admin-configurable". Without a settings panel no admin can actually change
them. The audit log is required for regulatory compliance in healthcare
environments and for post-incident investigation.

**Independent Test**: An admin changes the cancellation cutoff from 2 hours to
4 hours in the System Settings panel, verifies the booking UI reflects the new
value immediately, then searches the audit log for the change and sees the
actor, old value, and new value.

**Acceptance Scenarios**:

1. **Given** an admin navigates to System Settings, **Then** they see a list
   of configurable values including: patient cancellation cutoff window,
   appointment reminder lead time, maximum file upload size, and waitlist claim
   link expiry; each shows the current value, default, and an Edit button.

2. **Given** an admin updates a setting (e.g., cancellation cutoff from 2h to
   4h), **When** saved, **Then** the new value takes effect immediately for all
   subsequent operations; any in-progress or already-booked appointments are
   not retroactively affected; a confirmation message is shown.

3. **Given** an admin searches the Audit Log with a date range, actor filter
   (any user), or event type, **Then** the results show matching log entries
   each containing: timestamp, actor name and role, event type, affected entity,
   and old-value → new-value for setting changes; the log is exportable as CSV.

4. **Given** an admin navigates to the Appointments section, **When** they
   search or filter by date range, doctor, patient name, or status, **Then**
   they see all matching appointments across all doctors; they can open any
   appointment's detail view.

5. **Given** an admin clicks "Cancel Appointment" on any `pending` or
   `confirmed` appointment, **When** they provide a mandatory reason and
   confirm, **Then** the status changes to `cancelled`, the slot is released,
   the patient and doctor receive a cancellation email, and the action is
   logged in the audit log with the admin as actor.

---

### Edge Cases

- **Timezone boundary**: A patient in UTC+7 books a slot that, in UTC, falls on
  the previous day — the system must store UTC and display correctly in the
  patient's local time.
- **Same-second concurrent bookings**: Two patients submit for the identical slot
  within milliseconds — only one booking succeeds; the other receives a conflict
  error.
- **Doctor with no schedule configured**: The booking page must display a
  human-readable "No available slots — please try a different date or doctor"
  message rather than an empty or broken calendar.
- **Reminder for appointment within 24 hours of booking**: If a patient books
  and the appointment is less than 24 hours away, the reminder job must not
  fire (confirmation email serves this purpose) or must detect that the window
  has already passed.
- **Admin modifies slot duration mid-operation**: Changing slot duration while
  existing `pending`/`confirmed` appointments exist must not corrupt those
  appointments; existing bookings retain their original start/end times.
- **Email delivery failure**: All notification types (confirmation, cancellation,
  reminder) must be retried at least once and failures must be logged; the
  appointment state itself must not be rolled back due to a notification failure.
- **Patient data isolation**: A patient who attempts to access another patient's
  appointment detail via a guessed URL MUST be denied access; no appointment or
  clinical data MUST be leaked to unauthorised users.
- **Guest booking with registered email**: If a guest books using an email address
  that matches a registered patient account, the booking is created but NOT
  automatically linked to that account; retroactive linking is out of scope.
- **Clinical note on cancelled appointment**: A doctor who attempts to save or
  edit diagnosis/prescription data for a `cancelled` appointment MUST receive a
  clear error; no changes MUST be persisted to the clinical record.
- **Patient cancellation within cutoff window**: The system MUST block
  patient-initiated reschedule and cancellation when the appointment is within
  the configurable cutoff window, regardless of status (`pending` or
  `confirmed`); the cutoff value must be admin-adjustable without a code change.
- **Payment gateway timeout**: If the gateway returns no response within its
  timeout, the payment is treated as failed; the appointment MUST NOT be
  cancelled, and the patient MUST be able to retry payment without data loss.
- **Result file privacy**: Direct URL access to an uploaded examination result
  by an unauthenticated user or a patient who does not own the appointment MUST
  return HTTP 403; file storage MUST use time-limited signed URLs.
- **Provider deactivated with active appointments**: When an admin deactivates
  a provider, existing `pending`/`confirmed` appointments MUST NOT be
  automatically cancelled; the admin MUST acknowledge an explicit warning before
  deactivation proceeds.
- **Concurrent profile update**: If a patient submits a profile update from two
  browser sessions simultaneously, the last write MUST win with no silent data
  loss; the losing session MUST display a stale-data notice on its next
  interaction.
- **Waitlist claim race condition**: If two waitlisted patients click a claim
  link for the same freed slot simultaneously, only the first to submit wins;
  the second receives a clear "slot already taken" message and their waitlist
  entry MUST be re-activated for the next opening.
- **Dependent record on account deletion**: If a patient requests account
  deletion and they have dependent profiles with historical clinical records,
  the deletion request MUST surface a clear warning; dependents' clinical
  records MUST be retained for the statutory minimum retention period even
  after account deletion.
- **Guest booking confirmation offer**: The one-time account-creation prompt
  shown after a guest booking MUST NOT persist beyond the confirmation page
  session; the patient MUST be able to dismiss it without registration.
- **Doctor completes already-invoiced appointment**: Marking an appointment
  `completed` when a Payment record was somehow already created (race condition)
  MUST be idempotent; a second Payment record MUST NOT be created; any existing
  Payment record is retained unchanged.
- **Receptionist books into a just-taken slot**: If a receptionist submits a
  walk-in booking and the slot was concurrently taken by a patient portal
  submission, the receptionist MUST receive the same conflict error as any other
  booking collision; no double-booking occurs.
- **Admin cancels a completed appointment**: Attempting to cancel an appointment
  already in `completed`, `no-show`, or `cancelled` status MUST be rejected
  with a clear terminal-state error, regardless of actor (Admin, Provider, or
  Patient).
- **Setting change mid-operation**: If an admin changes the cancellation cutoff
  from 2h to 4h while a patient's cancellation request is in-flight, the
  cutoff applied is the one active at the moment the patient's request was
  submitted, not the new value.

---

## Requirements _(mandatory)_

### Functional Requirements

#### Authentication & Roles

- **FR-001**: System MUST support four distinct roles: **Patient** (guest booking
  is supported without an account; patients may also register an authenticated
  account to access appointment history and clinical records), **Provider**
  (doctor/clinical staff, authenticated), **Receptionist** (clinic front-desk
  staff, authenticated; can create and manage bookings and check in patients
  but CANNOT access clinical records, lab orders, prescriptions, or financial
  reports), and **Admin** (authenticated, full configuration access).
- **FR-002**: Providers, Receptionists, and Admins MUST authenticate via email
  and password before accessing their dashboards; unauthenticated access to
  provider/receptionist/admin routes MUST be forbidden.

#### Availability Display

- **FR-003**: System MUST display a calendar view of available time slots for a
  selected doctor, showing only slots that are not already booked and not within
  a blocked period.
- **FR-004**: System MUST reflect slot availability changes in near real-time
  (within 5 seconds) for all users currently viewing the calendar, without
  requiring a manual page refresh.
- **FR-005**: System MUST display slot times in the viewing user's local timezone;
  all internal storage MUST use UTC.

#### Booking

- **FR-006**: Patients MUST be able to book a slot by providing: full name,
  email address, phone number (optional), and optionally a brief reason for visit.
- **FR-007**: System MUST prevent double-booking of the same `(doctor, slot_start)`
  pair atomically at the database level; application-layer-only checks are not
  sufficient.
- **FR-008**: Upon successful booking, the appointment MUST be created with status
  `pending` and the patient MUST receive a "Booking Received" email within
  60 seconds.
- **FR-009**: If a concurrent conflict is detected, the system MUST return a
  user-friendly conflict message and make no state change; the patient MUST be
  prompted to choose a different slot.
- **FR-009a**: Upon successful guest booking, the confirmation screen MUST
  display a one-time prompt inviting the guest to create an account using their
  booking email to track this appointment; the prompt is dismissible and MUST
  NOT re-appear after the confirmation session ends.

#### Appointment Management (Provider)

- **FR-010**: Providers MUST be able to view all appointments assigned to them,
  filterable by date and status (`pending`, `confirmed`, `cancelled`).
- **FR-011**: Providers MUST be able to confirm a `pending` appointment, changing
  its status to `confirmed`; the patient MUST receive a "Appointment Confirmed"
  email within 60 seconds.
- **FR-012**: Providers MUST be able to cancel a `pending` or `confirmed`
  appointment, changing its status to `cancelled`; the slot MUST be released
  for new bookings and the patient MUST receive a "Appointment Cancelled" email
  within 60 seconds.
- **FR-013**: The state transition graph MUST be enforced: `pending → confirmed`,
  `pending → cancelled`, `confirmed → completed` (visit concluded by provider),
  `confirmed → cancelled`, `confirmed → no-show` (patient did not attend);
  `no-show` and `cancelled` are terminal states; any other transition MUST be
  rejected with an error.

#### Reminders

- **FR-014**: System MUST automatically send a reminder email to the patient for
  every `confirmed` appointment, exactly 24 hours (±5 minutes) before the
  appointment start time.
- **FR-015**: System MUST NOT send a reminder for a `cancelled` appointment.
- **FR-016**: Reminder delivery failures MUST be logged and retried at least once;
  silent failures are forbidden.

#### Schedule Configuration (Admin)

- **FR-017**: Admins MUST be able to define, for each doctor, a recurring weekly
  working schedule: days of the week, start time, end time, and slot duration
  (minimum 15 minutes, maximum 120 minutes).
- **FR-018**: Admins MUST be able to add one-off blocked periods for a doctor:
  a date range with optional time range (full-day or partial-day block).
- **FR-019**: Changes to working hours or blocked periods MUST be reflected in
  the booking calendar immediately (within one page load/real-time update).
- **FR-020**: If a new blocked period overlaps with existing `confirmed` or
  `pending` appointments, the system MUST warn the admin and require explicit
  acknowledgement before applying the block; it MUST NOT silently cancel
  existing appointments.

#### Notifications

- **FR-021**: All outbound notifications MUST use versioned email templates stored
  in the repository; hard-coded message strings in business logic are forbidden.
- **FR-022**: In non-production environments, email delivery MAY be replaced by
  a mock provider that logs the email content to a structured log file or console
  output, without actually sending email.

#### Patient Authentication

- **FR-023**: Patients MUST be able to register a new account using an email
  address and password; duplicate email registration MUST be rejected with a
  clear, user-friendly error message.
- **FR-023a**: After registration, the system MUST send an email-verification
  link to the patient's registered address; patients with unverified email MUST
  be redirected to a verification-pending notice on login and MUST NOT access
  protected portal pages until verification is complete. Resend verification
  email MUST be available at any time before verification.
- **FR-024**: Registered patients MUST be able to log in with their email and
  password; failed login attempts MUST return a non-specific error ("Invalid
  email or password") to prevent account enumeration.
- **FR-025**: Authenticated patients MUST be able to log out and have their
  session terminated immediately.
- **FR-026**: Patient-specific pages (appointment history, visit detail) MUST
  be accessible only to authenticated patients; unauthenticated access MUST
  redirect to the login page.

#### Booking Discovery

- **FR-027**: The doctor listing and booking start pages MUST allow patients to
  filter the list of available doctors by **specialty** (exact match from the
  system-defined specialty list).
- **FR-028**: The doctor listing page MUST allow patients to **search doctors
  by name** using a partial, case-insensitive text match.
- **FR-029**: Filter and search results MUST update without a full page reload
  and MUST surface only doctors who have at least one available slot within the
  next 30 days.
- **FR-029a**: The system MUST provide a dedicated doctor profile page (publicly
  accessible) showing: photo, full name, specialty, biography, qualifications
  / certifications (free-text), languages spoken, consultation fee, next
  available slot date, aggregate star rating, review count, star-distribution
  breakdown, and the 5 most recent visible reviews.
- **FR-029b**: Each doctor card in the listing MUST display the next available
  appointment date so patients can compare availability without opening each
  profile.

#### Patient Portal

- **FR-030**: Authenticated patients MUST be able to view a list of all their
  own appointments (upcoming and past), showing at minimum: doctor name,
  specialty, appointment date/time, and current status.
- **FR-031**: Authenticated patients MUST be able to open a detail view for any
  of their own appointments.
- **FR-032**: When a doctor has recorded clinical information, the patient's
  appointment detail view MUST display: diagnosis, examination notes, and the
  complete prescription list (per item: medication name, dosage, frequency,
  duration, and optional notes).
- **FR-033**: Patients MUST NOT be able to view any other patient's appointment
  data or clinical records; row-level data isolation MUST be enforced at the
  database level.

#### Medical Records & Clinical Notes (Doctor)

- **FR-034**: Doctors MUST be able to view a paginated list of all patients who
  have appointments (past or upcoming) with them, searchable by patient name or
  email address.
- **FR-035**: From the patient list, a doctor MUST be able to open a patient
  profile showing a full chronological appointment history for that patient
  (appointments with that doctor only).
- **FR-036**: For each appointment in the history, the doctor MUST be able to
  open a detail view showing: booking information, current status, and any
  previously recorded clinical notes.
- **FR-037**: Doctors MUST be able to record and edit a **diagnosis** (free-text)
  and **examination notes** (free-text) for any appointment with status
  `confirmed` or `completed`.
- **FR-038**: Doctors MUST be able to create and edit a **prescription** for an
  appointment, consisting of one or more items; each item MUST capture:
  medication name, dosage (e.g., "500 mg"), frequency (e.g., "twice daily"),
  duration (e.g., "7 days"), and optional additional notes.
- **FR-039**: Clinical records (diagnosis, examination notes, prescriptions)
  MUST NOT be editable for `cancelled` appointments; any such attempt MUST be
  rejected with a clear error and the existing record MUST remain unchanged.
- **FR-040**: All saves and edits to clinical records MUST be timestamped and
  attributed to the authenticated doctor who made the change.

#### Patient Profile & Password Reset

- **FR-041**: Registered patients MUST be able to maintain a personal profile
  containing: full name, date of birth, gender, residential address, and an
  emergency contact (name and phone number).
- **FR-042**: Patients MUST be able to record and update a medical background
  list of known allergies and active chronic conditions; this information MUST
  be visible to the treating doctor on the appointment clinical view.
- **FR-043**: Authenticated patients MUST be able to change their password from
  Profile settings by confirming their current password and entering a new one
  meeting minimum-strength requirements.
- **FR-044**: The system MUST provide a Forgot Password flow: the patient
  requests a reset via their registered email; the one-time link MUST expire
  after 60 minutes and be invalidated after first use.

#### Appointment Self-Service (Patient)

- **FR-045**: An authenticated patient MUST be able to reschedule a `pending`
  or `confirmed` appointment to a different available slot with the same doctor,
  subject to the cutoff window (FR-047).
- **FR-046**: An authenticated patient MUST be able to cancel their own
  `pending` or `confirmed` appointment from the patient portal.
- **FR-047**: Patient-initiated reschedule and cancellation MUST be blocked when
  the appointment start is within a configurable cutoff window (default 2 hours;
  admin-adjustable without a code change); the patient MUST see the active
  cutoff value in the error message.
- **FR-048**: On patient-initiated reschedule or cancellation, the doctor MUST
  receive an automated email notification within 60 seconds.

#### No-Show Management

- **FR-049**: Providers MUST be able to mark a `confirmed` appointment as
  `no-show` when the patient does not attend; `no-show` is a terminal status
  with no further valid transitions.
- **FR-050**: `no-show` appointments MUST NOT trigger reminder emails and MUST
  be excluded from all future reminder job processing.

#### Lab Orders & Examination Results

- **FR-051**: Doctors MUST be able to create one or more test orders on a
  `confirmed` or `completed` appointment, each capturing: test name, type
  (lab | imaging | other), and optional instructions.
- **FR-052**: Doctors or authorised staff MUST be able to record a result per
  order as free-text and/or a file upload (max 10 MB; accepted formats: PDF,
  JPEG, PNG).
- **FR-053**: When at least one result is available, the patient's appointment
  detail view MUST show a "Results available" indicator and display each result
  inline or as a downloadable link.
- **FR-054**: Result files MUST be accessible only to the patient who owns the
  appointment and to authenticated providers; all file URLs MUST use
  access-controlled signed tokens with a configurable expiry; unauthenticated
  or cross-patient access MUST return HTTP 403.
- **FR-055**: Test orders and results MUST NOT be creatable or editable on
  `cancelled` or `no-show` appointments; any such attempt MUST be rejected.

#### Payments & Invoicing

- **FR-056**: Admins MUST be able to configure a default consultation fee
  (amount and currency) per specialty and optionally override it per doctor.
- **FR-057**: When an appointment reaches `completed` status, a Payment record
  MUST be created automatically with status `awaiting_payment` and the amount
  derived from the applicable service fee.
- **FR-058**: Patients MUST be able to pay outstanding fees via the patient
  portal using an integrated payment gateway; the integration MUST be
  abstracted behind a provider-agnostic interface.
- **FR-059**: On payment success, the system MUST generate a sequentially
  numbered invoice, store it as a PDF, and email it to the patient within
  60 seconds; the invoice MUST be permanently retrievable from the portal.
- **FR-060**: On payment failure, the payment status MUST remain
  `awaiting_payment`, no invoice MUST be generated, and the patient MUST see
  a specific error message and a retry option.
- **FR-061**: If an appointment is cancelled before payment, the Payment record
  MUST be voided; if any amount was captured, a refund MUST be initiated and
  the status set to `refund_pending`.
- **FR-062**: Patients MUST be able to view all their invoices (amount, date,
  status: awaiting_payment | paid | refund_pending | refunded | voided) and
  download each as PDF from the patient portal.

#### Ratings & Reviews

- **FR-063**: After an appointment reaches `completed` status and payment is
  settled, the patient MUST be prompted once (via email and in-portal banner)
  to leave a rating (1–5 stars) and optional comment for the doctor.
- **FR-064**: Each patient may submit at most one rating per appointment; once
  submitted, the rating MUST NOT be editable by the patient.
- **FR-065**: Doctor profiles in the booking discovery view MUST display the
  aggregate star rating and total number of reviews.
- **FR-066**: Admins MUST be able to hide or permanently delete a review that
  violates clinic content policy; editing review content is forbidden.

#### Admin: User Management

- **FR-067**: Admins MUST be able to create Provider accounts by specifying
  email, full name, specialty, and optional doctor record link; the new
  provider MUST receive a one-time invite-to-set-password email automatically.
- **FR-068**: Admins MUST be able to deactivate a Provider account; a
  deactivated provider MUST NOT appear in the booking calendar; if the provider
  has active (`pending`/`confirmed`) appointments the admin MUST acknowledge
  a warning before deactivation proceeds.
- **FR-069**: Admins MUST be able to list, search (by name or email), and
  deactivate Patient accounts; deactivation MUST prevent further login but MUST
  NOT delete historical appointments or clinical records.

#### Admin: Service Catalogue & Pricing

- **FR-070**: Admins MUST be able to create, edit, and deactivate entries in
  the specialty/service catalogue; each entry MUST capture: service name,
  default consultation duration, default fee, and currency.
- **FR-071**: When a service/specialty is deactivated, new bookings under that
  service MUST be blocked with a user-friendly message; existing appointments
  are unaffected.

#### Admin: Reports & Analytics

- **FR-072**: Admins MUST be able to generate appointment summary reports for
  a selected date range, showing: total by status, by doctor, and by specialty,
  exportable as CSV.
- **FR-073**: Admins MUST be able to generate revenue reports for a selected
  date range, showing: total collected, by specialty, and by doctor, exportable
  as CSV.
- **FR-074**: The admin dashboard MUST display live summary widgets showing at
  minimum: today’s appointment count, pending-confirmation count, and
  outstanding-payment count.

#### Waitlist

- **FR-075**: Registered patients MUST be able to join a waitlist for a doctor
  when no slots are available; each waitlist entry captures: patient reference,
  doctor reference, optional preferred date range, and created-at timestamp.
- **FR-076**: When a slot is freed (due to cancellation or reschedule), the
  system MUST notify all waitlisted patients for that doctor within 60 seconds
  via email with a time-limited claim link (default expiry: 30 minutes;
  admin-configurable).
- **FR-077**: On successful slot claim via waitlist link, a new `pending`
  appointment MUST be created and the claim link MUST be invalidated.
- **FR-078**: If the claim link expires unclaimed, the slot MUST return to
  the public availability calendar; the patient's waitlist entry MUST remain
  active for the next opening.
- **FR-079**: Patients MUST be able to view and cancel their active waitlist
  entries from the My Appointments page.

#### In-App Notifications & Preferences

- **FR-080**: The patient portal MUST include a notification centre: a
  chronological feed of system events related to the patient's account
  (appointment status changes, result available, payment due, rating prompt,
  waitlist opportunity, etc.).
- **FR-081**: Unread notifications MUST be indicated by a badge count on the
  navigation that updates in near real-time without a full page reload.
- **FR-082**: Patients MUST be able to mark individual notifications or all
  notifications as read.
- **FR-083**: Patients MUST be able to configure per-event-type email
  notification preferences (enable / disable) from a Notification Preferences
  settings page; disabling email for an event type MUST NOT suppress the
  in-portal notification.
- **FR-084**: The in-portal notification feed MUST persist all notifications
  for at least 90 days.

#### Dependent / Family Member Profiles

- **FR-085**: Registered patients MUST be able to create, edit, and deactivate
  dependent profiles linked to their account; each dependent captures: full
  name, date of birth, gender, and relationship (e.g., child, parent, spouse).
- **FR-086**: When booking, an authenticated patient MUST be able to select a
  dependent as the appointment patient; all appointment details, clinical
  records, and invoices MUST be associated with the selected dependent profile,
  not the account holder.
- **FR-087**: The My Appointments page MUST allow filtering between the
  account holder's own appointments and appointments for each dependent.
- **FR-088**: Attempting to delete a dependent profile that has any historical
  or active appointments MUST be blocked; deactivation (soft-hide without data
  loss) MUST be offered as an alternative.

#### Patient Document Upload

- **FR-089**: Patients MUST be able to upload supporting documents to any of
  their own `pending` or `confirmed` appointments; each upload requires:
  document type (referral | previous_result | insurance | other), optional
  description, and a file (PDF, JPEG, or PNG, max 10 MB).
- **FR-090**: Patient-uploaded documents MUST be visible to the treating doctor
  in the appointment's clinical view, with type, description, upload timestamp,
  and a signed download link.
- **FR-091**: Uploading to `cancelled`, `completed`, or `no-show` appointments
  MUST be blocked with a clear status error.
- **FR-092**: Access to patient-uploaded document files MUST be subject to
  the same signed-token and HTTP 403 enforcement rules as examination result
  files (FR-054).

#### Patient Account Data & Privacy

- **FR-093**: Registered patients MUST be able to submit a data export request
  from their Account Settings; the system MUST deliver a downloadable archive
  (JSON or PDF) of all their personal data, appointment history, and clinical
  records within 48 hours.
- **FR-094**: Registered patients MUST be able to submit an account deletion
  request; the account is soft-deleted after a 30-day grace period during which
  the patient may cancel the request; active appointments at deletion time MUST
  be cancelled automatically with patient and doctor notifications; clinical
  records under dependents MUST be retained for the statutory minimum retention
  period regardless of account deletion.

#### Doctor Profile Self-Management

- **FR-095**: Authenticated providers MUST be able to view and edit their own
  public profile: profile photo, biography (free-text), qualifications /
  certifications (free-text), and languages spoken (multi-select); changes
  MUST be reflected on the public doctor profile page (FR-029a) within one
  page load.
- **FR-096**: Authenticated providers MUST be able to set a personal
  consultation fee override (amount in the clinic's configured currency);
  the override supersedes the specialty default (FR-056) for all new
  appointment bookings under that doctor; existing in-flight appointments are
  not retroactively repriced.
- **FR-097**: Authenticated providers MUST have a "Today's Schedule" view
  showing all their appointments for the current calendar day in chronological
  order; each row MUST display: patient name (or dependent name if applicable),
  appointment time, status, check-in indicator (if receptionist has checked in
  the patient), and quick-action buttons appropriate to the current status.

#### Appointment Completion (Provider)

- **FR-098**: Providers MUST be able to mark a `confirmed` appointment as
  `completed`; this transition MUST automatically trigger: creation of a
  Payment record (FR-057), queuing of the rating prompt (FR-063), and
  optionally a post-visit summary email to the patient.
- **FR-098a**: The `confirmed → completed` transition MUST be idempotent at
  the database level; a second attempt MUST return a non-error response without
  creating duplicate Payment or rating records.

#### Prescription Export

- **FR-099**: Providers MUST be able to generate a downloadable PDF prescription
  for any `confirmed` or `completed` appointment that has at least one
  prescription item; the PDF MUST include: clinic name, doctor full name and
  qualifications, patient name, appointment date, and all prescription items
  (medication name, dosage, frequency, duration, notes); the PDF MUST be
  permanently available for download from both the provider's dashboard and
  the patient portal.

#### Internal Appointment Notes (Staff-Only)

- **FR-100**: Providers and Receptionists MUST be able to add and edit a
  free-text **internal note** on any `pending`, `confirmed`, or `completed`
  appointment; internal notes MUST be visible only to authenticated providers,
  receptionists, and admins. Internal notes MUST NOT appear in any
  patient-facing page, confirmation email, data export, or audit log detail
  exposed to the patient.

#### Receptionist: Walk-In Booking & Schedule View

- **FR-101**: Receptionists MUST be able to create an appointment for any
  available doctor slot on behalf of any patient, providing: patient full
  name, email, phone, and optional visit reason; created appointments start
  with `pending` status and fire the same booking-received email as patient
  portal bookings (FR-008).
- **FR-102**: Receptionists MUST be able to update the contact details (name,
  email, phone) on a `pending` or `confirmed` appointment; editing contact
  details on `completed`, `cancelled`, or `no-show` appointments MUST be
  blocked with a clear error.
- **FR-103**: Receptionists MUST be able to mark a `confirmed` appointment as
  `checked_in`; a `checked_in` indicator and timestamp MUST be stored on the
  appointment and displayed on the provider's Today's Schedule (FR-097) and
  the receptionist's Clinic Day View; `checked_in` is an informational attribute
  only and does NOT change the main appointment status.
- **FR-104**: Receptionists MUST have access to a Clinic Day View showing the
  consolidated daily schedule for all doctors; filterable by date and doctor;
  each doctor's column shows their appointment queue colour-coded by status, a
  patient name per slot, and a per-column summary of checked-in vs. total
  appointments.
- **FR-105**: Receptionists MUST NOT have access to: clinical notes,
  prescriptions, lab orders, examination results, payment records, invoices,
  admin reports, system settings, or audit log; any navigation attempt to these
  areas MUST return HTTP 403.

#### Admin: Appointment Management

- **FR-106**: Admins MUST be able to view and search all appointments across
  all doctors, filterable by date range, doctor, patient name/email, and
  status; admins can open the full detail view of any appointment.
- **FR-107**: Admins MUST be able to cancel any `pending` or `confirmed`
  appointment as an emergency override; the admin MUST provide a mandatory
  reason; the cancellation follows the same downstream effects as a
  provider-initiated cancellation (slot released, patient and doctor notified,
  action logged in the audit log).

#### Admin: System Settings

- **FR-108**: Admins MUST have a System Settings panel where they can
  view and configure the following global values without a code deployment:
  patient cancellation cutoff window (default 2 hours), appointment reminder
  lead time (default 24 hours), maximum file upload size (default 10 MB),
  and waitlist claim link expiry (default 30 minutes); each entry shows its
  current value, system default, data type, and allowed range.
- **FR-109**: Changes to system settings MUST take effect immediately for all
  subsequent operations; in-flight requests submitted before the change MUST
  use the setting value that was active at the time of submission.

#### Admin: Audit Log

- **FR-110**: The system MUST maintain an immutable audit log recording the
  following event types: user account created / deactivated / password-reset;
  appointment status transition (actor, from-status, to-status, timestamp);
  system setting changed (setting key, old value, new value, actor); report
  exported (type, date range, actor); patient data export requested /
  fulfilled; content deletion or hiding (reviews, accounts).
- **FR-111**: Admins MUST be able to search and filter the audit log by: date
  range, actor (user), event type, and affected entity reference; results MUST
  be displayed in descending time order and be exportable as CSV.
- **FR-112**: Audit log entries MUST be retained for a rolling minimum of
  12 months and MUST NOT be editable or deletable by any role, including Admin.

---

### Key Entities _(mandatory)_

working schedule, list of blocked periods.

- **WorkingSchedule**: Recurring weekly availability for a doctor. Attributes:
  doctor reference, day of week, start time, end time, slot duration in minutes.
  Multiple entries per doctor allowed (one per weekday).

- **BlockedPeriod**: A specific date/time range during which a doctor is
  unavailable. Attributes: doctor reference, start datetime, end datetime,
  reason (optional). Overrides WorkingSchedule.

- **Appointment**: A booking for a specific doctor slot. Attributes: doctor
  reference, authenticated patient reference (optional — null for guest
  bookings), patient name, patient email, patient phone, visit reason, slot
  start datetime (UTC), slot end datetime (UTC), status (`pending` |
  `confirmed` | `completed` | `cancelled` | `no-show`), payment status
  (`awaiting_payment` | `paid` | `refund_pending` | `refunded` | `voided` —
  populated when status reaches `completed`), created-at timestamp.

- **NotificationLog**: Audit record of every outbound notification attempt.
  Attributes: appointment reference, notification type (booking-received |
  confirmed | cancelled | reminder), recipient email, sent-at timestamp, status
  (sent | failed | retried), error message if failed.

- **User** (Patient / Provider / Admin): Authenticated system user. **Patient**
  accounts are optional — guest bookings are not linked to a User record.
  **Provider** and **Admin** accounts are required for dashboard access.
  Attributes: email, hashed password (managed by auth provider), role
  (`patient` | `provider` | `admin`), associated doctor reference (for
  providers only).

- **MedicalRecord**: Clinical documentation for a single appointment visit.
  One record per appointment (one-to-one). Attributes: appointment reference,
  diagnosis (free-text), examination notes (free-text), recorded-by doctor
  (user reference), created-at timestamp, updated-at timestamp. Editable only
  when the linked appointment status is `confirmed` or `completed`.

- **PrescriptionItem**: A single medication line item within a MedicalRecord.
  Multiple items allowed per record. Attributes: medical record reference,
  medication name, dosage (e.g., "500 mg"), frequency (e.g., "twice daily"),
  duration (e.g., "7 days"), additional notes (optional).

- **PatientProfile**: Extended personal details for a registered patient (one
  per user). Attributes: user (Patient) reference, date of birth, gender,
  residential address, emergency contact name, emergency contact phone,
  created-at, updated-at.

- **PatientMedicalBackground**: Medical background entries for a registered
  patient. Multiple entries per patient. Attributes: patient reference, entry
  type (allergy | chronic_condition), description (free-text), added-at.

- **LabOrder**: A diagnostic test order attached to an appointment. Attributes:
  appointment reference, test name, type (lab | imaging | other), instructions
  (optional), ordered-by doctor (user reference), status (ordered |
  result_available), created-at.

- **ExaminationResult**: Result record linked to a LabOrder (one per order).
  Attributes: lab order reference, result text (optional), file URL (optional,
  signed), uploaded-by (user reference), uploaded-at.

- **Payment**: Financial record for an appointment (one per appointment, created
  when appointment reaches `completed`). Attributes: appointment reference,
  amount, currency, status (awaiting_payment | paid | refund_pending | refunded
  | voided), invoice number (sequential — set on payment success), paid-at,
  created-at.

- **Service**: Clinic service/specialty catalogue entry. Attributes: name,
  default consultation duration (minutes), default fee, currency, is_active,
  created-at.

- **DoctorRating**: Patient review of a completed appointment (one per
  appointment). Attributes: appointment reference, patient (User) reference,
  doctor reference, rating (integer 1–5), comment (optional), is_hidden
  (admin-controlled), created-at.

- **WaitlistEntry**: A patient's waitlist subscription for a doctor.
  Attributes: patient (User) reference, doctor reference, optional preferred
  date-from, optional preferred date-to, status (active | fulfilled | expired
  | cancelled), created-at, updated-at.

- **Dependent**: A family member or beneficiary linked to a patient account.
  Attributes: account-holder (User) reference, full name, date of birth,
  gender, relationship (child | parent | spouse | other), is_active,
  created-at.

- **NotificationPreference**: Per-event-type email opt-in/out for a registered
  patient. Attributes: patient (User) reference, event type (appointment_confirmed
  | appointment_cancelled | appointment_reminder | result_available |
  payment_due | rating_prompt | waitlist_opportunity), email_enabled (boolean),
  updated-at.

- **InAppNotification**: A system event record surfaced in the patient portal
  notification feed. Attributes: patient (User) reference, event type,
  message text, related entity reference (appointment / payment / waitlist),
  is_read (boolean), created-at.

- **PatientDocument**: A file uploaded by a patient and attached to an
  appointment. Attributes: appointment reference, uploaded-by patient (User)
  reference, document type (referral | previous_result | insurance | other),
  description (optional), file URL (signed), uploaded-at.

- **DoctorProfile**: Extended public-facing profile for a provider (one per
  doctor). Attributes: doctor (User) reference, profile photo URL, biography
  (free-text), qualifications / certifications (free-text), languages spoken
  (array), consultation fee override (nullable — uses specialty default when
  null), updated-at.

- **PatientCheckIn**: Records the moment a patient physically arrives at the
  clinic. Attributes: appointment reference, checked-in-by (User —
  Receptionist reference), checked-in-at timestamp.

- **InternalNote**: A staff-only free-text note attached to an appointment.
  Attributes: appointment reference, note text, authored-by (User — Provider
  or Receptionist reference), created-at, updated-at.

- **SystemSetting**: A configurable global parameter stored in the database.
  Attributes: setting key (uniqu identifier), value (text, stored as string
  and cast at runtime), default value, description, last-updated-by (Admin
  User reference), updated-at.

- **AuditLogEntry**: An immutable record of a significant system event.
  Attributes: actor (User reference — nullable for system-initiated events),
  event type, affected entity type, affected entity reference, old value
  (JSON — nullable), new value (JSON — nullable), ip address (optional),
  created-at.

### Measurable Outcomes

- **SC-001**: A patient can complete the full booking flow — from opening the
  calendar to receiving a booking-received email — in under 3 minutes on a
  standard mobile connection.

- **SC-002**: When two patients attempt to book the same slot simultaneously,
  exactly one booking succeeds and the other receives a conflict error; zero
  double-bookings occur in any load test scenario.

- **SC-003**: Booking-received, confirmation, and cancellation emails are
  delivered (or logged by mock) within 60 seconds of the triggering action in
  95% of cases under normal load.

- **SC-004**: Appointment reminders are dispatched within ±5 minutes of the
  24-hour-before-appointment threshold for 99% of confirmed appointments.

- **SC-005**: The slot availability calendar reflects any booking, confirmation,
  cancellation, or schedule-config change within 5 seconds for all active viewers.

- **SC-006**: An admin can configure or update a doctor's full weekly working
  schedule in under 5 minutes and verify the changes are live on the booking page
  immediately.

- **SC-007**: 90% of first-time patients can complete a booking without external
  help, as measured by task-completion rate in usability testing.

- **SC-008**: An authenticated patient can locate and read their most recent
  appointment's clinical record (diagnosis and prescription) within 2 navigation
  steps from the My Appointments list.

- **SC-009**: A doctor can open a patient's appointment, record a full diagnosis
  and prescription with at least two items, and save the record in under
  3 minutes through the clinical notes interface.

- **SC-010**: Online payment completion rate exceeds 95% of initiated payment
  sessions under normal operating load (gateway successful response → invoice
  generated; no partial or double charges).

- **SC-011**: An authenticated patient can locate and view their latest
  examination result within one navigation step from the appointment detail
  page.

- **SC-012**: An admin can generate and export a monthly revenue report as CSV
  in under 30 seconds for up to 10,000 appointments in the selected period.

- **SC-013**: A patient's submitted doctor rating is visible on the doctor's
  public booking profile within 5 seconds of submission under normal load.

- **SC-014**: When a slot is freed by a cancellation, all waitlisted patients
  for that doctor receive the claim-link notification within 60 seconds under
  normal load.

- **SC-015**: A patient data export request is fulfilled (archive available for
  download) within 48 hours of submission for datasets of up to 1,000
  appointments.

- **SC-016**: A receptionist can create a walk-in appointment and have the
  booking-received email sent to the patient within 60 seconds, matching the
  same SLA as patient-portal bookings (SC-003).

- **SC-017**: An admin can search the audit log for a specific event (e.g., a
  particular appointment status change) and retrieve the matching entry within
  5 seconds for a log dataset of up to 12 months of clinic activity.

---

## Assumptions

- Patient registration is optional: guest booking (no account required) is fully
  supported. Patients who register can additionally access appointment history
  and clinical records. A guest booking is NOT retroactively linked to a
  registered account sharing the same email; that migration flow is out of scope.
- Slot duration is uniform within a doctor's schedule (no mixed-duration slots
  per day).
- The system operates within a single timezone context for the clinic; multi-
  clinic or multi-timezone deployments are out of scope.
- SMS reminders are out of scope; email (or mock log) is the only notification
  channel.
- Payment processing is out of scope.
- Rescheduling (moving an existing appointment to a new slot) is out of scope
  for this version; cancellation followed by a new booking is the workaround.
- The admin role manages all doctors in the clinic; per-doctor self-service
  schedule management by providers is out of scope.
- Prescription management is scoped to documenting post-visit clinical notes
  within the system; integration with external pharmacy or dispensing systems
  is out of scope.
- A `completed` appointment status (provider-triggered transition from
  `confirmed`) is introduced for visits that have concluded. Full valid
  transitions: `pending → confirmed`, `pending → cancelled`,
  `confirmed → completed`, `confirmed → cancelled`. Clinical notes may be
  added or edited for `confirmed` or `completed` appointments only.
- Full audit history (change-by-change log) for clinical records is out of
  scope; only the most recently saved version and its timestamp are persisted.
- Payment gateway integration is abstracted behind a provider-agnostic
  interface; a sandbox/mock gateway is used in development. No specific payment
  vendor is mandated by this specification.
- Consultation fees are denominated in a single currency per clinic deployment
  (default: VND); multi-currency support is out of scope.
- Uploaded files (examination results) are stored in an object-storage service;
  the relational database stores only references (signed URL paths), not binary
  data. Maximum accepted file size per result is 10 MB.
- Rating visibility is limited to the booking discovery UI within this system;
  syndication to external review platforms or cross-clinic aggregation is out
  of scope.
- Provider invitation uses a one-time secure token sent by email; SSO, SAML,
  or social login for providers is out of scope for this version.
- The patient cancellation cutoff window is a single value applied uniformly to
  all doctors; per-doctor or per-specialty cutoff configuration is out of scope.
- Lab and imaging result analysis (AI-assisted diagnosis, DICOM viewer) is out
  of scope; the system stores and displays results as provided by the clinic.
- Email verification is required before a registered patient can access
  protected portal pages; the verification token expires after 24 hours.
- The waitlist is not priority-ordered; when a slot opens all waitlisted
  patients for that doctor are notified simultaneously and the slot is awarded
  on a first-claim basis (no queue ordering).
- In-app notifications are scoped to the patient portal only; provider and
  admin dashboards receive updates via real-time list refresh (FR-004 / US2
  scenario 3) rather than a dedicated notification feed.
- Dependent profiles are managed solely by the account-holding patient; clinic
  staff cannot create or modify dependent profiles.
- Medical record retention periods and data export compliance are governed by
  Vietnamese healthcare data regulations; the system MUST default to a minimum
  10-year retention period for clinical records regardless of account status.
- Two-factor authentication (2FA) for patient accounts is out of scope for
  this version; it is reserved as a future enhancement.
- Doctor profile self-management covers public-facing bio and fee override
  only; schedule configuration (working hours, blocked periods) remains an
  admin-only operation in this version.
- The Receptionist role is provisioned by admin (same mechanism as Provider
  accounts, FR-067); self-registration as a Receptionist is not supported.
- Audit log entries are immutable and append-only; no role may edit or delete
  them; admin can only search, filter, and export.
- The System Settings panel covers operational thresholds (timeouts, windows,
  limits) only; email template content and branding are managed via files in
  the repository (FR-021) and are not editable from the admin UI in this
  version.
- Internal appointment notes are never included in patient data exports
  (FR-093) or any patient-facing communication; they are scoped to clinical
  staff only.
