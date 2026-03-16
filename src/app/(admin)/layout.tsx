import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản trị – Phòng Khám",
};

const navItems = [
  { href: "/admin/schedules", label: "Lịch làm việc" },
  { href: "/admin/appointments", label: "Lịch hẹn" },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/reports", label: "Báo cáo" },
  { href: "/admin/audit-log", label: "Nhật ký" },
  { href: "/admin/settings", label: "Cài đặt" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/schedules");

  return (
    <div className='page-shell p-2 md:p-3'>
      <div className='flex min-h-[calc(100vh-1rem)] overflow-hidden rounded-2xl border border-white/60 shadow-sm md:min-h-[calc(100vh-1.5rem)]'>
        {/* Sidebar */}
        <aside className='w-60 shrink-0 border-r border-white/50 bg-white/85 backdrop-blur-md'>
          <div className='flex h-full flex-col'>
            <div className='border-b border-slate-200/80 px-5 py-5'>
              <p className='heading-gradient text-base font-extrabold'>
                Phòng Khám
              </p>
              <p className='mt-0.5 text-xs text-slate-500'>Quản trị viên</p>
            </div>
            <nav className='flex-1 space-y-1 px-3 py-4'>
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className='flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700'>
                  {label}
                </Link>
              ))}
            </nav>
            <div className='border-t border-slate-200/80 px-4 py-4'>
              <p className='mb-2 truncate text-xs text-slate-500'>
                {user.email}
              </p>
              <form action='/auth/signout' method='POST'>
                <button
                  type='submit'
                  className='w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-100'>
                  Đăng xuất
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className='flex-1 flex flex-col min-w-0'>
          <main className='flex-1 p-6 md:p-8'>{children}</main>
        </div>
      </div>
    </div>
  );
}
