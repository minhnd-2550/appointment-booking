import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSlots, getDateRangeUTC, matchesDayOfWeek } from '@/lib/scheduling/slots'
import type { WorkingSchedule, BlockedPeriod, SlotDTO } from '@/types/domain'
import { parseISO, isValid } from 'date-fns'

/**
 * GET /api/slots?doctorId=&date=YYYY-MM-DD&timezone=Asia/Ho_Chi_Minh
 *
 * Returns available time slots for a doctor on a given date.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const doctorId = searchParams.get('doctorId')
  const dateStr = searchParams.get('date')
  const timezone = searchParams.get('timezone') ?? 'Asia/Ho_Chi_Minh'

  if (!doctorId || !dateStr) {
    return NextResponse.json(
      { error: 'Missing required query params: doctorId, date' },
      { status: 400 },
    )
  }

  const date = parseISO(dateStr)
  if (!isValid(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  // Fetch doctor's working schedules that match this day of week
  const { data: schedules, error: schedulesError } = await supabase
    .from('working_schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('is_active', true)

  if (schedulesError) {
    console.error('[GET /api/slots] schedules error', schedulesError)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }

  const matchingSchedules = (schedules as WorkingSchedule[]).filter((s) =>
    matchesDayOfWeek(date, s.day_of_week, timezone),
  )

  if (matchingSchedules.length === 0) {
    return NextResponse.json({ slots: [] })
  }

  // Fetch blocked periods that overlap with this date
  const { startUTC: dayStart, endUTC: dayEnd } = getDateRangeUTC(date, timezone)

  const { data: blockedPeriods, error: blockedError } = await supabase
    .from('blocked_periods')
    .select('*')
    .eq('doctor_id', doctorId)
    .lt('start_at', dayEnd.toISOString())
    .gt('end_at', dayStart.toISOString())

  if (blockedError) {
    console.error('[GET /api/slots] blocked periods error', blockedError)
    return NextResponse.json({ error: 'Failed to fetch blocked periods' }, { status: 500 })
  }

  // Fetch existing non-cancelled appointments for this date
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('slot_start, slot_end')
    .eq('doctor_id', doctorId)
    .in('status', ['pending', 'confirmed'])
    .gte('slot_start', dayStart.toISOString())
    .lt('slot_start', dayEnd.toISOString())

  if (apptError) {
    console.error('[GET /api/slots] appointments error', apptError)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }

  const takenSlots = (appointments ?? []).map((a) => a.slot_start as string)

  // Generate slots for every matching schedule entry
  const allSlots: SlotDTO[] = []
  for (const schedule of matchingSchedules) {
    const slots = generateSlots(
      schedule,
      date,
      (blockedPeriods as BlockedPeriod[]) ?? [],
      takenSlots,
      timezone,
    )
    allSlots.push(...slots)
  }

  // Deduplicate by slot start (multiple schedule rows unlikely but safe)
  const seen = new Set<string>()
  const uniqueSlots = allSlots.filter((s) => {
    if (seen.has(s.start)) return false
    seen.add(s.start)
    return true
  })

  // Sort chronologically
  uniqueSlots.sort((a, b) => a.start.localeCompare(b.start))

  return NextResponse.json({ slots: uniqueSlots })
}
