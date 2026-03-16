import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bệnh nhân – Phòng Khám",
};

const navItems = [
  { href: "/my-appointments", label: "Lịch hẹn của tôi" },
  { href: "/my-invoices", label: "Hóa đơn" },
  { href: "/my-dependents", label: "Người phụ thuộc" },
  { href: "/my-profile", label: "Hồ sơ cá nhân" },
];

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // No redirect here — middleware handles that; auth sub-pages are unauthenticated

  return (
    <div className='page-shell'>
      {/* Top navbar — only rendered when logged in */}
      {user && (
        <header className='sticky top-0 z-20 border-b border-white/50 bg-white/80 backdrop-blur-md'>
          <div className='section-shell-5 flex h-16 items-center justify-between'>
            <div className='flex items-center gap-6'>
              <Link
                href='/'
                className='heading-gradient text-sm font-extrabold'>
                Phòng Khám
              </Link>
              <nav className='flex items-center gap-1'>
                {navItems.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className='rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700'>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className='flex items-center gap-3'>
              <span className='hidden text-xs text-slate-500 sm:block'>
                {user.email}
              </span>
              <form action='/auth/signout' method='POST'>
                <button
                  type='submit'
                  className='rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100'>
                  Đăng xuất
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <main className='section-shell-5 py-6'>{children}</main>
    </div>
  );
}
