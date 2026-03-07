import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PatchBodySchema = z
  .object({
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    slotDurationMinutes: z.number().int().min(15).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => {
      if (v.startTime && v.endTime) return v.startTime < v.endTime
      return true
    },
    { message: 'startTime must be before endTime' },
  )

interface RouteContext {
  params: Promise<{ id: string }>
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('user_profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? serviceClient : null
}

/**
 * PATCH /api/schedules/[id] — partial update, admin only
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const serviceClient = await requireAdmin()
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PatchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.startTime !== undefined) updates['start_time'] = parsed.data.startTime
  if (parsed.data.endTime !== undefined) updates['end_time'] = parsed.data.endTime
  if (parsed.data.slotDurationMinutes !== undefined) updates['slot_duration_minutes'] = parsed.data.slotDurationMinutes
  if (parsed.data.isActive !== undefined) updates['is_active'] = parsed.data.isActive

  const { data, error } = await serviceClient
    .from('working_schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json({ schedule: data })
}

/**
 * DELETE /api/schedules/[id] — admin only
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const serviceClient = await requireAdmin()
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('working_schedules')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
