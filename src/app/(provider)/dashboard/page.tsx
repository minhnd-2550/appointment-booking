import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Appointment } from '@/types/domain'
import { AppointmentList } from '@/components/dashboard/AppointmentList'

export const metadata = {
  title: 'Dashboard – Phòng Khám',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/dashboard')

  // Fetch this provider's doctor_id
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('doctor_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.doctor_id) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">
          Tài khoản chưa được liên kết với bác sĩ nào. Vui lòng liên hệ quản
          trị viên.
        </p>
      </main>
    )
  }

  // Fetch initial appointments (server-side, passed as props for hydration)
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', profile.doctor_id)
    .order('slot_start', { ascending: true })

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Quản lý lịch hẹn của bạn</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppointmentList
          initialAppointments={(appointments as Appointment[]) ?? []}
          doctorId={profile.doctor_id}
        />
      </div>
    </main>
  )
}
