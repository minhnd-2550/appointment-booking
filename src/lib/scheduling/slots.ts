import {
  parseISO,
  addMinutes,
  isBefore,
  addDays,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { BlockedPeriod, SlotDTO, WorkingSchedule } from '@/types/domain'

/**
 * Generate available time slots for a given (doctor, date) combination.
 *
 * This is a pure function with no side effects — fully unit-testable in isolation.
 *
 * @param schedule       The doctor's working schedule for the requested day-of-week
 * @param date           The calendar date being queried (time component is ignored)
 * @param blockedPeriods All blocked_periods rows for this doctor that overlap `date`
 * @param takenSlots     Array of slot_start values (UTC ISO strings) for confirmed/pending appointments on this date
 * @param timezone       IANA timezone string for the requesting user (e.g. "Asia/Ho_Chi_Minh")
 * @returns              Array of SlotDTO sorted by start time
 */
export function generateSlots(
  schedule: WorkingSchedule,
  date: Date,
  blockedPeriods: BlockedPeriod[],
  takenSlots: string[],
  timezone: string,
): SlotDTO[] {
  // 1. Parse the schedule's start/end times into UTC Date objects for this specific date
  //    Schedule times are stored in local clinic time (we treat them as if in `timezone`)
  const [startHour, startMin] = schedule.start_time.split(':').map(Number)
  const [endHour, endMin] = schedule.end_time.split(':').map(Number)

  // Build the day start in the doctor's timezone, then convert to UTC
  const dayStart = startOfDay(date)
  const localSlotDayStart = setMilliseconds(
    setSeconds(setMinutes(setHours(dayStart, startHour!), startMin!), 0),
    0,
  )
  const localSlotDayEnd = setMilliseconds(
    setSeconds(setMinutes(setHours(dayStart, endHour!), endMin!), 0),
    0,
  )

  // Convert to UTC using the provided timezone
  const slotDayStartUTC = fromZonedTime(localSlotDayStart, timezone)
  const slotDayEndUTC = fromZonedTime(localSlotDayEnd, timezone)

  const duration = schedule.slot_duration_minutes

  // 2. Generate all candidate slots
  const candidates: Array<{ start: Date; end: Date }> = []
  let cursor = slotDayStartUTC
  while (isBefore(cursor, slotDayEndUTC)) {
    const slotEnd = addMinutes(cursor, duration)
    if (!isBefore(slotDayEndUTC, slotEnd)) {
      candidates.push({ start: cursor, end: slotEnd })
    }
    cursor = addMinutes(cursor, duration)
  }

  // 3. Set of taken slot start times (UTC ISO) for O(1) lookup
  const takenSet = new Set(takenSlots.map((s) => parseISO(s).toISOString()))

  // 4. Filter each candidate slot
  const slots: SlotDTO[] = candidates.map(({ start, end }) => {
    const startISO = start.toISOString()

    // Check if this slot is already taken
    if (takenSet.has(startISO)) {
      return { start: startISO, end: end.toISOString(), available: false }
    }

    // Check if this slot overlaps any blocked period
    const isBlocked = blockedPeriods.some((bp) => {
      const blockStart = parseISO(bp.start_at)
      const blockEnd = parseISO(bp.end_at)
      // Slot overlaps block if: slot.start < block.end AND slot.end > block.start
      return isBefore(start, blockEnd) && isBefore(blockStart, end)
    })

    if (isBlocked) {
      return { start: startISO, end: end.toISOString(), available: false }
    }

    return { start: startISO, end: end.toISOString(), available: true }
  })

  return slots
}

/**
 * Check whether a date string falls within a working schedule day-of-week.
 * Helper used in the API route to match `date`'s day of week to `schedule.day_of_week`.
 */
export function matchesDayOfWeek(date: Date, dayOfWeek: number, timezone: string): boolean {
  const zonedDate = toZonedTime(date, timezone)
  return zonedDate.getDay() === dayOfWeek
}

/**
 * Get the start and end of a calendar date in UTC, given a timezone.
 * Used to query blocked_periods and appointments that overlap a given date.
 */
export function getDateRangeUTC(
  date: Date,
  timezone: string,
): { startUTC: Date; endUTC: Date } {
  const zonedDay = toZonedTime(date, timezone)
  const dayStart = startOfDay(zonedDay)
  const dayEnd = addDays(dayStart, 1)
  return {
    startUTC: fromZonedTime(dayStart, timezone),
    endUTC: fromZonedTime(dayEnd, timezone),
  }
}
