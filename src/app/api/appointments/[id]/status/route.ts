import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications/send'
import { z } from 'zod'

const ParamsSchema = z.object({ id: z.string().uuid() })
const BodySchema = z.object({
  status: z.enum(['confirmed', 'cancelled']),
})

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/appointments/[id]/status
 *
 * Requires authenticated session. Provider can only update their own doctor's appointments.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate route param
  const { id: appointmentId } = await params
  const paramsParsed = ParamsSchema.safeParse({ id: appointmentId })
  if (!paramsParsed.success) {
    return NextResponse.json({ error: 'Invalid appointment ID' }, { status: 400 })
  }

  // Validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const bodyParsed = BodySchema.safeParse(body)
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: bodyParsed.error.flatten() },
      { status: 422 },
    )
  }

  const { status: newStatus } = bodyParsed.data

  const serviceClient = await createServiceClient()

  // Fetch appointment + doctor ownership check
  const { data: appointment, error: fetchError } = await serviceClient
    .from('appointments')
    .select('*, doctors!inner(id, name)')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  // Check provider owns this appointment's doctor
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role, doctor_id')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const isOwner =
    profile?.role === 'provider' && profile.doctor_id === appointment.doctor_id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate transition
  const currentStatus = appointment.status as string
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []
  if (!(allowed as string[]).includes(newStatus)) {
    return NextResponse.json(
      {
        error: 'INVALID_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
      },
      { status: 422 },
    )
  }

  // Apply update
  const { data: updated, error: updateError } = await serviceClient
    .from('appointments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single()

  if (updateError || !updated) {
    console.error('[PATCH appointments/status] update error', updateError)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // Fire notification (fire-and-forget)
  const notifType = newStatus === 'confirmed' ? 'confirmed' : 'cancelled'
  sendNotification(
    notifType,
    appointment.patient_email as string,
    {
      patientName: appointment.patient_name as string,
      doctorName: ((appointment as unknown as { doctors: { name: string } }).doctors?.name) ?? '',
      slotStart: appointment.slot_start as string,
      slotEnd: appointment.slot_end as string,
      visitReason: (appointment.visit_reason as string | null) ?? undefined,
    },
    { appointmentId, supabaseServiceClient: serviceClient },
  ).catch(console.error)

  return NextResponse.json({ appointment: updated })
}
