import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Appointment } from "@/types/domain";
import { PatientAppointmentList } from "@/components/patient/PatientAppointmentList";

export const metadata = { title: "Lịch hẹn của tôi – Phòng khám" };

export default async function MyAppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/my-appointments");

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `id, doctor_id, slot_start, slot_end, patient_name, patient_email,
       patient_phone, visit_reason, status, user_id, dependent_id, checked_in_at,
       reminder_sent, created_at,
       doctors ( name, specialty )`,
    )
    .eq("user_id", user.id)
    .order("slot_start", { ascending: false });

  if (error) {
    console.error("[my-appointments] query error", error);
  }

  // Row shape: appointment + joined doctor
  const rows = (appointments ?? []) as Array<
    Appointment & { doctors: { name: string; specialty: string } | null }
  >;

  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      <h1 className='text-2xl font-bold mb-6'>Lịch hẹn của tôi</h1>
      <PatientAppointmentList appointments={rows} />
    </div>
  );
}
