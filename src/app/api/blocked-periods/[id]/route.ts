import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Appointment } from '@/types/domain'

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
 * DELETE /api/blocked-periods/[id] — admin only.
 *
 * Warns (409) if confirmed appointments exist in the freed window.
 * The client decides whether to proceed.
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const serviceClient = await requireAdmin()
  if (!serviceClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  // Fetch existing blocked period to check window
  const { data: blocked } = await serviceClient
    .from('blocked_periods')
    .select('doctor_id, start_at, end_at')
    .eq('id', id)
    .single()

  if (!blocked) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if confirmed appointments exist in this window ONLY if ?force is not set
  const force = request.nextUrl.searchParams.get('force') === 'true'
  if (!force) {
    const { data: conflicts } = await serviceClient
      .from('appointments')
      .select('*')
      .eq('doctor_id', blocked.doctor_id as string)
      .eq('status', 'confirmed')
      .lt('slot_start', blocked.end_at as string)
      .gt('slot_end', blocked.start_at as string)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'APPOINTMENT_CONFLICT',
          message: 'Confirmed appointments exist in this period. Pass ?force=true to proceed.',
          conflicts: conflicts as Appointment[],
        },
        { status: 409 },
      )
    }
  }

  const { error } = await serviceClient
    .from('blocked_periods')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
