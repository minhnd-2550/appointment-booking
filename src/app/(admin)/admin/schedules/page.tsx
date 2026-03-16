import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Doctor } from "@/types/domain";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";

export const metadata = {
  title: "Quản lý lịch làm việc – Admin",
};

export default async function AdminSchedulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/schedules");

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, name, specialty")
    .eq("is_active", true)
    .order("name");

  return (
    <div className='mx-auto w-full max-w-5xl py-2'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-slate-900'>
          Quản lý lịch làm việc
        </h1>
        <p className='text-sm text-slate-500'>
          Cấu hình giờ làm việc và ngày nghỉ cho từng bác sĩ
        </p>
      </div>

      <ScheduleEditor doctors={(doctors as Doctor[]) ?? []} />
    </div>
  );
}
