import { redirect } from "next/navigation";
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
    <div className='mx-auto w-full max-w-6xl space-y-12 py-2'>
      <div>
        <h1 className='text-2xl font-bold text-slate-900'>
          Quản lý người dùng
        </h1>
        <p className='text-sm text-slate-500'>Mời bác sĩ, quản lý dịch vụ</p>
      </div>

      <section>
        <h2 className='mb-4 text-lg font-semibold text-slate-800'>
          Bác sĩ / Nhà cung cấp dịch vụ
        </h2>
        <ProviderTable />
      </section>

      <section>
        <h2 className='mb-4 text-lg font-semibold text-slate-800'>
          Danh mục dịch vụ
        </h2>
        <ServiceCatalogue />
      </section>
    </div>
  );
}
