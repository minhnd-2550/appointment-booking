// domain.ts — Canonical TypeScript types for the clinic booking system
// All types in this file must match the DB schema in supabase/migrations/

// ============================================================
// Enums
// ============================================================
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no-show";
export type UserRole = "provider" | "admin" | "patient" | "receptionist";
export type NotificationType =
  | "booking-received"
  | "confirmed"
  | "cancelled"
  | "reminder"
  | "rescheduled"
  | "post-visit-summary"
  | "invoice"
  | "payment-received"
  | "rating-prompt"
  | "provider-invite"
  | "waitlist-joined"
  | "waitlist-opportunity"
  | "cancelled-by-patient";

export type LabOrderStatus = "ordered" | "result_available";
export type PaymentStatus =
  | "awaiting_payment"
  | "paid"
  | "refund_pending"
  | "refunded"
  | "voided";
export type DependentRelationship = "child" | "parent" | "spouse" | "other";
export type DocumentType =
  | "referral"
  | "previous_result"
  | "insurance"
  | "other";
export type WaitlistStatus = "active" | "fulfilled" | "expired" | "cancelled";
export type LabOrderType = "lab" | "imaging" | "other";
export type MedicalBackgroundEntryType = "allergy" | "chronic_condition";

// ============================================================
// Domain interfaces (mirrors DB tables)
// ============================================================
export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkingSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0 = Sunday … 6 = Saturday
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  slot_duration_minutes: number;
  created_at: string;
}

export interface BlockedPeriod {
  id: string;
  doctor_id: string;
  start_at: string; // ISO 8601 UTC
  end_at: string; // ISO 8601 UTC
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  slot_start: string; // ISO 8601 UTC
  slot_end: string; // ISO 8601 UTC
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  visit_reason: string | null;
  status: AppointmentStatus;
  reminder_sent: boolean;
  user_id: string | null;
  dependent_id: string | null;
  checked_in_at: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  appointment_id: string;
  notification_type: NotificationType;
  recipient_email: string;
  status: "sent" | "failed" | "retried";
  error_message: string | null;
  sent_at: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  doctor_id: string | null;
  is_active: boolean;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

// ============================================================
// New domain interfaces (US5–US19)
// ============================================================

export interface PatientProfile {
  id: string; // FK → auth.users
  full_name: string;
  date_of_birth: string | null; // ISO date
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientMedicalBackground {
  id: string;
  user_id: string;
  entry_type: MedicalBackgroundEntryType;
  description: string;
  added_at: string;
}

export interface MedicalRecord {
  id: string;
  appointment_id: string;
  diagnosis: string | null;
  examination_notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  medical_record_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}

export interface LabOrder {
  id: string;
  appointment_id: string;
  test_name: string;
  type: LabOrderType;
  instructions: string | null;
  ordered_by: string;
  status: LabOrderStatus;
  created_at: string;
}

export interface ExaminationResult {
  id: string;
  lab_order_id: string;
  result_text: string | null;
  file_path: string | null; // storage path — never returned as-is to client
  uploaded_by: string;
  uploaded_at: string;
}

export interface Service {
  id: string;
  name: string;
  default_duration_minutes: number;
  default_fee: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  invoice_number: string | null;
  invoice_path: string | null; // storage path — never returned as-is to client
  paid_at: string | null;
  created_at: string;
}

export interface DoctorProfile {
  id: string; // FK → doctors
  photo_url: string | null;
  biography: string | null;
  qualifications: string | null;
  languages: string[];
  fee_override: number | null;
  updated_at: string;
}

export interface InternalNote {
  id: string;
  appointment_id: string;
  content: string;
  authored_by: string;
  created_at: string;
  updated_at: string;
}

export interface PatientCheckIn {
  id: string;
  appointment_id: string;
  checked_in_by: string;
  checked_in_at: string;
}

export interface DoctorRating {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  rating: number; // 1–5
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
}

export interface Dependent {
  id: string;
  account_holder_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  relationship: DependentRelationship;
  is_active: boolean;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  doctor_id: string;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  status: WaitlistStatus;
  claim_token: string | null;
  claim_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  patient_id: string;
  event_type: string;
  email_enabled: boolean;
  updated_at: string;
}

export interface InAppNotification {
  id: string;
  patient_id: string;
  event_type: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PatientDocument {
  id: string;
  appointment_id: string;
  uploaded_by: string;
  document_type: DocumentType;
  description: string | null;
  file_path: string; // storage path — never returned as-is to client
  uploaded_at: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  default_value: string;
  description: string;
  last_updated_by: string | null;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ============================================================
// DTOs
// ============================================================

/** A displayable time slot returned by GET /api/slots */
export interface SlotDTO {
  start: string; // ISO 8601 UTC
  end: string; // ISO 8601 UTC
  available: boolean;
}

/** Booking form payload sent to POST /api/appointments */
export interface CreateAppointmentPayload {
  doctorId: string;
  slotStart: string;
  slotEnd: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  visitReason?: string;
  userId?: string; // authenticated patient
  dependentId?: string; // booking for a dependent
}

/** Provider status-update payload sent to PATCH /api/appointments/[id]/status */
export interface UpdateAppointmentStatusPayload {
  status: Extract<
    AppointmentStatus,
    "confirmed" | "cancelled" | "completed" | "no-show"
  >;
}

/** API error response shape */
export interface ApiError {
  error: string;
  message?: string;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Notification payload shape passed to sendNotification() */
export interface NotificationPayload {
  patientName?: string;
  doctorName?: string;
  slotStart?: string; // ISO 8601 UTC — templates format to local time
  slotEnd?: string;
  visitReason?: string;
  // Rescheduled
  oldSlot?: string;
  newSlot?: string;
  newSlotStart?: string;
  // General / shared
  name?: string;
  email?: string;
  // Invoice
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  invoiceUrl?: string;
  // Provider invite
  setPasswordUrl?: string;
  // Waitlist
  claimUrl?: string;
  preferredDateFrom?: string;
  preferredDateTo?: string;
  expiresAt?: string;
  // Extra
  [key: string]: unknown;
}

// ============================================================
// API response shapes
// ============================================================
export interface ApiError {
  error: string;
  message?: string;
  conflicts?: Appointment[];
}

export interface SlotsResponse {
  slots: SlotDTO[];
}

export interface AppointmentResponse {
  appointment: Appointment;
}
