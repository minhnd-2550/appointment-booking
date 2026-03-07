import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications/send'
import type { NotificationPayload } from '@/types/domain'

/**
 * GET /api/cron/reminders
 *
 * Called every 5 minutes by Vercel Cron (vercel.json).
 * Sends 24-hour reminder emails for upcoming confirmed appointments.
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const now = new Date()
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 55 * 60 * 1000) // +23h55m
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000)   // +24h5m

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*, doctors(name)')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .gte('slot_start', windowStart.toISOString())
    .lte('slot_start', windowEnd.toISOString())

  if (error) {
    console.error('[cron/reminders] query error', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let succeeded = 0
  let failed = 0

  for (const appt of appointments ?? []) {
    const doctorName =
      (appt as Record<string, unknown>)['doctors'] &&
      typeof (appt as Record<string, unknown>)['doctors'] === 'object' &&
      (appt as { doctors: { name?: string } }).doctors?.name
        ? (appt as { doctors: { name: string } }).doctors.name
        : 'Bác sĩ'

    const payload: NotificationPayload = {
      patientName: appt.patient_name as string,
      doctorName,
      slotStart: appt.slot_start as string,
      slotEnd: appt.slot_end as string,
      visitReason: (appt.visit_reason as string | null) ?? undefined,
    }

    try {
      await sendNotification('reminder', appt.patient_email as string, payload, {
        appointmentId: appt.id as string,
        supabaseServiceClient: supabase,
      })

      // Mark reminder sent — use explicit id to stay idempotent
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id as string)
        .eq('reminder_sent', false) // guard against race

      succeeded++
    } catch (err) {
      console.error(
        `[cron/reminders] failed for appointment ${appt.id as string}`,
        err,
      )
      failed++
    }
  }

  return NextResponse.json({
    processed: (appointments ?? []).length,
    succeeded,
    failed,
  })
}
