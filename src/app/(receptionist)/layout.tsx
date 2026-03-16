import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lễ tân - Phòng khám",
};

export default async function ReceptionistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/receptionist/day-view");

  return (
    <div className='page-shell'>
      <header className='sticky top-0 z-20 border-b border-white/50 bg-white/80 backdrop-blur-md'>
        <div className='section-shell-7 flex h-16 items-center gap-6'>
          <Link href='/' className='heading-gradient text-base font-extrabold'>
            Phòng Khám
          </Link>
          <span className='text-slate-400 text-sm'>Lễ tân</span>
          <nav className='flex gap-4 text-sm flex-1'>
            <Link
              href='/receptionist/day-view'
              className='rounded-xl px-3 py-2 font-medium text-muted-foreground transition hover:bg-blue-50 hover:text-blue-700'>
              Lịch hôm nay
            </Link>
            <Link
              href='/receptionist/walk-in'
              className='rounded-xl px-3 py-2 font-medium text-muted-foreground transition hover:bg-blue-50 hover:text-blue-700'>
              Đặt lịch trực tiếp
            </Link>
          </nav>
          <div className='flex items-center gap-3'>
            <span className='text-xs text-slate-500 hidden sm:block'>
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
      <main className='section-shell-7 py-6'>{children}</main>
    </div>
  );
}
