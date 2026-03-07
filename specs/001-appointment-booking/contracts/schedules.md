# Contract: Schedules & Blocked Periods

**Base paths**: `/api/schedules`, `/api/blocked-periods`  
**Auth**: All endpoints require `admin` role  
**Purpose**: Manage doctor working hours and blocked periods.

---

## GET /api/schedules

**Purpose**: List all working schedule entries, optionally filtered by doctor.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctorId` | UUID | Optional | Filter to one doctor |

### Response 200 OK

```typescript
interface ScheduleListResponse {
  data: WorkingScheduleDto[];
}

interface WorkingScheduleDto {
  id: string;
  doctorId: string;
  dayOfWeek: number;           // 0 = Sunday … 6 = Saturday
  startTime: string;           // "HH:MM" local clinic time
  endTime: string;             // "HH:MM" local clinic time
  slotDurationMinutes: number;
}
```

```json
{
  "data": [
    {
      "id": "sch-uuid-1",
      "doctorId": "doc-uuid-1",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "slotDurationMinutes": 30
    }
  ]
}
```

---

## POST /api/schedules

**Purpose**: Create or replace a working schedule entry for a doctor on a specific day.

### Request Body

```typescript
interface CreateScheduleRequest {
  doctorId: string;            // UUID
  dayOfWeek: number;           // 0–6
  startTime: string;           // "HH:MM"
  endTime: string;             // "HH:MM", must be > startTime
  slotDurationMinutes: number; // 15–120
}
```

```json
{
  "doctorId": "doc-uuid-1",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDurationMinutes": 30
}
```

### Responses

#### 201 Created — returns the created `WorkingScheduleDto`

#### 409 Conflict — schedule for (doctorId, dayOfWeek) already exists
Use `PATCH /api/schedules/[id]` to update.

```json
{
  "error": "SCHEDULE_CONFLICT",
  "message": "A schedule for this doctor on this day already exists.",
  "existingId": "sch-uuid-1"
}
```

#### 400 Bad Request — validation failure

```json
{
  "error": "INVALID_PARAMETERS",
  "details": { "dayOfWeek": "Must be 0–6", "slotDurationMinutes": "Must be 15–120" }
}
```

### Validation (zod schema)

```typescript
const CreateScheduleSchema = z.object({
  doctorId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.number().int().min(15).max(120),
}).refine(d => d.startTime < d.endTime, {
  message: 'endTime must be after startTime',
});
```

---

## PATCH /api/schedules/[id]

**Purpose**: Update an existing working schedule entry.

### Request Body

All fields optional (partial update):

```typescript
interface UpdateScheduleRequest {
  startTime?: string;
  endTime?: string;
  slotDurationMinutes?: number;
}
```

### Responses

#### 200 OK — returns updated `WorkingScheduleDto`
#### 404 Not Found
#### 400 Bad Request

### Side effect warning

If `slotDurationMinutes` changes, **existing `pending`/`confirmed` appointments
are not affected** — they retain their original `slot_start` and `slot_end`.
Only future slot generation uses the new duration.

---

## DELETE /api/schedules/[id]

**Purpose**: Remove a working schedule entry (doctor no longer works that day).

### Responses

#### 204 No Content — deleted successfully
#### 404 Not Found
#### 409 Conflict — active appointments exist on affected future dates

```json
{
  "error": "APPOINTMENTS_EXIST",
  "message": "There are pending or confirmed appointments on days covered by this schedule.",
  "appointmentCount": 3
}
```

---

## GET /api/blocked-periods

**Purpose**: List blocked periods, optionally filtered by doctor and date range.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctorId` | UUID | Optional | Filter to one doctor |
| `from` | `YYYY-MM-DD` | Optional | Include blocks starting from this date (UTC) |
| `to` | `YYYY-MM-DD` | Optional | Include blocks ending before this date (UTC) |

### Response 200 OK

```typescript
interface BlockedPeriodListResponse {
  data: BlockedPeriodDto[];
}

interface BlockedPeriodDto {
  id: string;
  doctorId: string;
  startAt: string;   // ISO 8601 UTC
  endAt: string;     // ISO 8601 UTC
  reason: string | null;
}
```

---

## POST /api/blocked-periods

**Purpose**: Add a blocked period for a doctor.

### Request Body

```typescript
interface CreateBlockedPeriodRequest {
  doctorId: string;   // UUID
  startAt: string;    // ISO 8601 UTC
  endAt: string;      // ISO 8601 UTC, must be > startAt
  reason?: string;    // max 200 chars
}
```

### Responses

#### 201 Created — returns created `BlockedPeriodDto`

#### 400 Bad Request

#### 409 Conflict — overlapping confirmed/pending appointments exist

```json
{
  "error": "APPOINTMENT_CONFLICT",
  "message": "There are 2 confirmed or pending appointments during this period. Acknowledge to proceed.",
  "conflictingAppointments": [
    { "id": "appt-uuid-1", "slotStartUtc": "2026-04-01T02:00:00.000Z", "patientName": "Trần B" }
  ]
}
```

The client must re-submit with `"acknowledgeConflicts": true` to apply the
block anyway. Existing appointments are **NOT** automatically cancelled.

### Request Body (with acknowledgement)

```typescript
interface CreateBlockedPeriodRequest {
  doctorId: string;
  startAt: string;
  endAt: string;
  reason?: string;
  acknowledgeConflicts?: boolean;  // default false
}
```

### Validation (zod schema)

```typescript
const CreateBlockedPeriodSchema = z.object({
  doctorId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().max(200).optional(),
  acknowledgeConflicts: z.boolean().default(false),
}).refine(d => new Date(d.endAt) > new Date(d.startAt), {
  message: 'endAt must be after startAt',
});
```

---

## DELETE /api/blocked-periods/[id]

**Purpose**: Remove a blocked period (e.g., holiday cancelled).

### Responses

#### 204 No Content
#### 404 Not Found
