import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bệnh nhân – Phòng Khám',
}

const navItems = [
  { href: '/my-appointments', label: 'Lịch hẹn của tôi' },
  { href: '/my-invoices', label: 'Hóa đơn' },
  { href: '/my-dependents', label: 'Người phụ thuộc' },
  { href: '/my-profile', label: 'Hồ sơ cá nhân' },
]

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // No redirect here — middleware handles that; auth sub-pages are unauthenticated

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navbar — only rendered when logged in */}
      {user && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-sm font-bold text-slate-900">
                Phòng Khám
              </Link>
              <nav className="flex items-center gap-1">
                {navItems.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Đăng xuất
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
