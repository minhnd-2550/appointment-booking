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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/receptionist/day-view");

  return (
    <div className='min-h-screen bg-background'>
      <header className='border-b bg-white'>
        <div className='mx-auto flex h-14 max-w-7xl items-center gap-6 px-4'>
          <Link href="/" className='font-semibold text-slate-900'>Phòng Khám</Link>
          <span className="text-slate-400 text-sm">Lễ tân</span>
          <nav className='flex gap-4 text-sm flex-1'>
            <Link
              href='/receptionist/day-view'
              className='text-muted-foreground hover:text-foreground'>
              Lịch hôm nay
            </Link>
            <Link
              href='/receptionist/walk-in'
              className='text-muted-foreground hover:text-foreground'>
              Đặt lịch trực tiếp
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <form action="/auth/signout" method="POST">
              <button type="submit" className="text-sm text-red-500 hover:text-red-700">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className='mx-auto max-w-7xl px-4 py-6'>{children}</main>
    </div>
  );
}
