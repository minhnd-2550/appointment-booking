import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DoctorCard } from '@/components/booking/DoctorCard'
import type { Doctor } from '@/types/domain'

export const metadata = {
  title: 'Đặt lịch khám – Phòng Khám',
  description: 'Chọn bác sĩ và đặt lịch khám trực tuyến nhanh chóng, tiện lợi.',
}

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: doctors, error }, { data: { user } }] = await Promise.all([
    supabase.from('doctors').select('*').eq('is_active', true).order('name'),
    supabase.auth.getUser(),
  ])

  // Get role for dashboard link
  let role: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
  }

  const dashboardHref =
    role === 'admin' ? '/admin/schedules'
    : role === 'provider' ? '/dashboard'
    : role === 'receptionist' ? '/receptionist/day-view'
    : role === 'patient' ? '/my-appointments'
    : '/dashboard'

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Phòng Khám</h1>
            <p className="text-sm text-slate-500">Hệ thống đặt lịch trực tuyến</p>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user.email}</span>
              <Link
                href={dashboardHref}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Trang quản lý →
              </Link>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Đăng xuất
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          Đặt lịch khám dễ dàng
        </h2>
        <p className="text-slate-600 text-lg max-w-xl mx-auto">
          Chọn bác sĩ, chọn khung giờ phù hợp — nhận xác nhận lịch hẹn ngay
          trong vài giây.
        </p>
      </section>

      {/* Doctor grid */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h3 className="text-lg font-semibold text-slate-700 mb-6">
          Đội ngũ bác sĩ
        </h3>

        {error && (
          <p className="text-red-600 text-sm">
            Không thể tải danh sách bác sĩ. Vui lòng thử lại sau.
          </p>
        )}

        {!error && (!doctors || doctors.length === 0) && (
          <p className="text-slate-500 text-sm">
            Hiện chưa có bác sĩ nào hoạt động.
          </p>
        )}

        {!error && doctors && doctors.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(doctors as Doctor[]).map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
