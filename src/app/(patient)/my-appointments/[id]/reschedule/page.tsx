import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RescheduleAppointmentForm } from "@/components/patient/RescheduleAppointmentForm";

interface ReschedulePageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Đổi lịch hẹn" };

export default async function RescheduleAppointmentPage({
  params,
}: ReschedulePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/my-appointments/${id}/reschedule`);
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, doctor_id, slot_start, status, doctors(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!appointment) {
    redirect("/my-appointments");
  }

  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    redirect(`/my-appointments/${id}`);
  }

  const doctor = Array.isArray(appointment.doctors)
    ? appointment.doctors[0]
    : appointment.doctors;

  return (
    <div className='mx-auto w-full max-w-5xl space-y-6 py-2'>
      <div className='space-y-2'>
        <Link
          href={`/my-appointments/${id}`}
          className='text-sm text-slate-500 transition hover:text-slate-700'>
          ← Quay về chi tiết lịch hẹn
        </Link>
        <h1 className='text-2xl font-bold text-slate-900'>Đổi lịch hẹn</h1>
        <p className='text-sm text-slate-500'>
          Chọn khung giờ mới phù hợp với lịch của bác sĩ.
        </p>
      </div>

      <RescheduleAppointmentForm
        appointmentId={appointment.id}
        doctorId={appointment.doctor_id}
        doctorName={doctor?.name ?? "Bác sĩ"}
        currentSlotStart={appointment.slot_start}
      />
    </div>
  );
}
