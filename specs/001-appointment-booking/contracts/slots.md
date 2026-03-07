# Contract: Slot Availability

**Endpoint**: `GET /api/slots`  
**Auth**: Public (no authentication required)  
**Purpose**: Returns all available (unbookable) time slots for a given doctor on a given date.

---

## Request

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctorId` | `string` (UUID) | ✅ | The doctor to query |
| `date` | `string` (ISO 8601 date: `YYYY-MM-DD`) | ✅ | The local date to query in the clinic's timezone |
| `timezone` | `string` (IANA timezone, e.g. `Asia/Ho_Chi_Minh`) | ✅ | Client timezone for display formatting |

### Example Request

```
GET /api/slots?doctorId=123e4567-e89b-12d3-a456-426614174000&date=2026-03-10&timezone=Asia%2FHo_Chi_Minh
```

---

## Response

### 200 OK — Slots found (may be empty array if no availability)

```typescript
interface SlotsResponse {
  doctorId: string;
  date: string;            // YYYY-MM-DD, as requested
  timezone: string;        // IANA timezone, as requested
  slotDurationMinutes: number;
  slots: SlotDto[];
}

interface SlotDto {
  startUtc: string;        // ISO 8601 UTC, e.g. "2026-03-10T02:00:00.000Z"
  endUtc: string;          // ISO 8601 UTC
  startLocal: string;      // ISO 8601 with offset, e.g. "2026-03-10T09:00:00+07:00"
  endLocal: string;
  available: boolean;      // false = booked/blocked; true = bookable
}
```

```json
{
  "doctorId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2026-03-10",
  "timezone": "Asia/Ho_Chi_Minh",
  "slotDurationMinutes": 30,
  "slots": [
    {
      "startUtc": "2026-03-10T02:00:00.000Z",
      "endUtc": "2026-03-10T02:30:00.000Z",
      "startLocal": "2026-03-10T09:00:00+07:00",
      "endLocal": "2026-03-10T09:30:00+07:00",
      "available": true
    },
    {
      "startUtc": "2026-03-10T02:30:00.000Z",
      "endUtc": "2026-03-10T03:00:00.000Z",
      "startLocal": "2026-03-10T09:30:00+07:00",
      "endLocal": "2026-03-10T10:00:00+07:00",
      "available": false
    }
  ]
}
```

### 400 Bad Request — Invalid parameters

```json
{
  "error": "INVALID_PARAMETERS",
  "details": {
    "doctorId": "Required",
    "date": "Must be a valid ISO date (YYYY-MM-DD)",
    "timezone": "Must be a valid IANA timezone string"
  }
}
```

### 404 Not Found — Doctor does not exist or is inactive

```json
{
  "error": "DOCTOR_NOT_FOUND"
}
```

---

## Validation (zod schema, Route Handler)

```typescript
const QuerySchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1),
});
```

---

## Notes

- Response includes **all** slots (available and unavailable) so the UI can
  render a complete grid with greyed-out booked slots.
- Results are **not cached** on the server — fresh on every request to ensure
  real-time accuracy. Supabase Realtime handles client-side invalidation.
- Slot generation is performed by `src/lib/scheduling/slots.ts` (pure function,
  independently testable).
