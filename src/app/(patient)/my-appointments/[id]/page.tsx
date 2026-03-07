import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PatientAppointmentDetail } from "@/components/patient/PatientAppointmentDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Chi tiết lịch hẹn ${id.slice(0, 8)}… – Phòng khám` };
}

export default async function AppointmentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/my-appointments");

  // Load appointment with doctor + medical record + prescriptions + lab orders
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      `id, doctor_id, slot_start, slot_end, patient_name, patient_email,
       patient_phone, visit_reason, status, user_id, dependent_id,
       checked_in_at, reminder_sent, created_at,
       doctors ( name, specialty ),
       medical_records (
         id, diagnosis, examination_notes, recorded_by, created_at, updated_at,
         prescription_items ( id, medication_name, dosage, frequency, duration, notes )
       ),
       lab_orders (
         id, test_name, type, instructions, status, created_at,
         examination_results ( id, result_text, file_path, uploaded_at )
       )`,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!appt) notFound();

  return (
    <div className='max-w-3xl mx-auto px-4 py-8'>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PatientAppointmentDetail appointment={appt as any} />
    </div>
  );
}
