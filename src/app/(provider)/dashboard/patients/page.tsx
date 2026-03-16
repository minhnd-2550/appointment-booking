import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DoctorPatientList } from "@/components/dashboard/DoctorPatientList";

export const metadata = { title: "Danh sách bệnh nhân – Bảng điều khiển" };

export default async function DoctorPatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/patients");

  return (
    <div className='mx-auto w-full max-w-4xl py-6'>
      <h1 className='text-2xl font-bold mb-6'>Danh sách bệnh nhân</h1>
      <DoctorPatientList />
    </div>
  );
}
