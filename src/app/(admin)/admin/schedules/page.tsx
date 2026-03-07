import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Doctor } from '@/types/domain'
import { ScheduleEditor } from '@/components/admin/ScheduleEditor'

export const metadata = {
  title: 'Quản lý lịch làm việc – Admin',
}

export default async function AdminSchedulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/schedules')

  const { data: doctors } = await supabase
    .from('doctors')
    .select('id, name, specialty')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý lịch làm việc</h1>
            <p className="text-sm text-slate-500">Cấu hình giờ làm việc và ngày nghỉ cho từng bác sĩ</p>
          </div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Trang chủ
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <ScheduleEditor doctors={(doctors as Doctor[]) ?? []} />
      </div>
    </main>
  )
}
