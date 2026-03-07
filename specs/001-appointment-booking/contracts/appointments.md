# Contract: Appointments

**Base path**: `/api/appointments`  
**Purpose**: Create new appointments (patient-facing) and update appointment status (provider-facing).

---

## POST /api/appointments

**Auth**: Public (no authentication required)  
**Purpose**: Create a new appointment booking. Delegates to `book_appointment()` PL/pgSQL function for atomicity.

### Request Body

```typescript
interface CreateAppointmentRequest {
  doctorId: string;      // UUID
  slotStartUtc: string;  // ISO 8601 UTC, e.g. "2026-03-10T02:00:00.000Z"
  slotEndUtc: string;    // ISO 8601 UTC
  patientName: string;   // 1–100 chars
  patientEmail: string;  // valid email
  patientPhone?: string; // optional, 7–20 chars if provided
  visitReason?: string;  // optional, max 500 chars
}
```

```json
{
  "doctorId": "123e4567-e89b-12d3-a456-426614174000",
  "slotStartUtc": "2026-03-10T02:00:00.000Z",
  "slotEndUtc": "2026-03-10T02:30:00.000Z",
  "patientName": "Nguyễn Văn A",
  "patientEmail": "nguyenvana@example.com",
  "patientPhone": "+84901234567",
  "visitReason": "Khám tổng quát"
}
```

### Responses

#### 201 Created

```typescript
interface CreateAppointmentResponse {
  id: string;            // UUID of created appointment
  status: 'pending';
  slotStartUtc: string;
  slotEndUtc: string;
  doctorId: string;
  patientEmail: string;
}
```

```json
{
  "id": "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb",
  "status": "pending",
  "slotStartUtc": "2026-03-10T02:00:00.000Z",
  "slotEndUtc": "2026-03-10T02:30:00.000Z",
  "doctorId": "123e4567-e89b-12d3-a456-426614174000",
  "patientEmail": "nguyenvana@example.com"
}
```

#### 409 Conflict — Slot already taken

```json
{
  "error": "BOOKING_CONFLICT",
  "message": "This slot was just taken. Please choose another time."
}
```

#### 400 Bad Request — Validation failure

```json
{
  "error": "INVALID_PARAMETERS",
  "details": {
    "patientEmail": "Invalid email address",
    "slotStartUtc": "Must be a valid ISO 8601 UTC datetime"
  }
}
```

#### 404 Not Found — Doctor does not exist

```json
{ "error": "DOCTOR_NOT_FOUND" }
```

### Validation (zod schema)

```typescript
const CreateAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  slotStartUtc: z.string().datetime({ offset: true }),
  slotEndUtc: z.string().datetime({ offset: true }),
  patientName: z.string().min(1).max(100),
  patientEmail: z.string().email(),
  patientPhone: z.string().min(7).max(20).optional(),
  visitReason: z.string().max(500).optional(),
}).refine(d => new Date(d.slotEndUtc) > new Date(d.slotStartUtc), {
  message: 'slotEndUtc must be after slotStartUtc',
});
```

### Side effects

1. DB: `book_appointment()` inserts appointment with `status = 'pending'`
2. Notification: fires `sendNotification('booking-received', patientEmail, ...)`
   asynchronously (fire-and-forget); logs result to `notification_logs`

---

## PATCH /api/appointments/[id]/status

**Auth**: Required — `provider` or `admin` role  
**Purpose**: Transition appointment status. Validates state machine before update.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Appointment ID |

### Request Body

```typescript
interface UpdateStatusRequest {
  status: 'confirmed' | 'cancelled';
}
```

```json
{ "status": "confirmed" }
```

### Responses

#### 200 OK

```typescript
interface UpdateStatusResponse {
  id: string;
  status: 'confirmed' | 'cancelled';
  updatedAt: string;  // ISO 8601 UTC
}
```

```json
{
  "id": "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb",
  "status": "confirmed",
  "updatedAt": "2026-03-05T08:00:00.000Z"
}
```

#### 400 Bad Request — Invalid transition

```json
{
  "error": "INVALID_STATUS_TRANSITION",
  "message": "Cannot transition from 'cancelled' to 'confirmed'."
}
```

#### 401 Unauthorized

```json
{ "error": "UNAUTHORIZED" }
```

#### 403 Forbidden — Provider trying to update another doctor's appointment

```json
{ "error": "FORBIDDEN" }
```

#### 404 Not Found

```json
{ "error": "APPOINTMENT_NOT_FOUND" }
```

### Validation (zod schema)

```typescript
const UpdateStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']),
});
```

### Side effects

- `confirmed`: fires `sendNotification('confirmed', patientEmail, ...)`
- `cancelled`: fires `sendNotification('cancelled', patientEmail, ...)`;
  the partial unique index is released (appointment no longer `pending`/`confirmed`)
- All notifications are async; appointment status is committed first

---

## GET /api/appointments (Provider / Admin)

**Auth**: Required — `provider` or `admin` role  
**Purpose**: List appointments for the authenticated provider's doctor (or all doctors for admin).

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | `YYYY-MM-DD` | Optional | Filter by slot date (UTC date) |
| `status` | `pending\|confirmed\|cancelled` | Optional | Filter by status |
| `page` | integer ≥ 1 | Optional, default 1 | Pagination |
| `pageSize` | integer 1–100 | Optional, default 20 | |

### Response 200 OK

```typescript
interface AppointmentListResponse {
  data: AppointmentListItem[];
  pagination: { page: number; pageSize: number; total: number };
}

interface AppointmentListItem {
  id: string;
  doctorId: string;
  slotStartUtc: string;
  slotEndUtc: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string | null;
  visitReason: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}
```
