import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quản trị – Phòng Khám',
}

const navItems = [
  { href: '/admin/schedules', label: 'Lịch làm việc' },
  { href: '/admin/appointments', label: 'Lịch hẹn' },
  { href: '/admin/users', label: 'Người dùng' },
  { href: '/admin/reports', label: 'Báo cáo' },
  { href: '/admin/audit-log', label: 'Nhật ký' },
  { href: '/admin/settings', label: 'Cài đặt' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin/schedules')

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-200">
          <p className="text-base font-bold text-slate-900">Phòng Khám</p>
          <p className="text-xs text-slate-500 mt-0.5">Quản trị viên</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2 truncate">{user.email}</p>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full text-left text-sm text-red-500 hover:text-red-700"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
