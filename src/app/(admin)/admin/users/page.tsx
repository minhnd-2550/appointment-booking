import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProviderTable } from "@/components/admin/ProviderTable";
import { ServiceCatalogue } from "@/components/admin/ServiceCatalogue";

export const metadata = {
  title: "Quản lý người dùng – Admin",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/users");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <main className='min-h-screen bg-slate-50'>
      <header className='bg-white border-b border-slate-200'>
        <div className='mx-auto max-w-6xl px-4 py-5 flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-bold text-slate-900'>
              Quản lý người dùng
            </h1>
            <p className='text-sm text-slate-500'>
              Mời bác sĩ, quản lý dịch vụ
            </p>
          </div>
          <Link
            href='/'
            className='text-sm text-slate-500 hover:text-slate-700'>
            ← Trang chủ
          </Link>
        </div>
      </header>

      <div className='mx-auto max-w-6xl px-4 py-8 space-y-12'>
        <section>
          <h2 className='text-lg font-semibold text-slate-800 mb-4'>
            Bác sĩ / Nhà cung cấp dịch vụ
          </h2>
          <ProviderTable />
        </section>

        <section>
          <h2 className='text-lg font-semibold text-slate-800 mb-4'>
            Danh mục dịch vụ
          </h2>
          <ServiceCatalogue />
        </section>
      </div>
    </main>
  );
}
