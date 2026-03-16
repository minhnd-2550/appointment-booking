import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Appointment } from "@/types/domain";
import { AppointmentList } from "@/components/dashboard/AppointmentList";

export const metadata = {
  title: "Dashboard – Phòng Khám",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard");

  // Fetch this provider's doctor_id
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("doctor_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.doctor_id) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-white/85'>
        <p className='text-slate-500'>
          Tài khoản chưa được liên kết với bác sĩ nào. Vui lòng liên hệ quản trị
          viên.
        </p>
      </div>
    );
  }

  // Fetch initial appointments (server-side, passed as props for hydration)
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("doctor_id", profile.doctor_id)
    .order("slot_start", { ascending: true });

  return (
    <div className='mx-auto w-full max-w-5xl py-2'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-slate-900'>Dashboard</h1>
        <p className='text-sm text-slate-500'>Quản lý lịch hẹn của bạn</p>
      </div>

      <AppointmentList
        initialAppointments={(appointments as Appointment[]) ?? []}
        doctorId={profile.doctor_id}
      />
    </div>
  );
}
