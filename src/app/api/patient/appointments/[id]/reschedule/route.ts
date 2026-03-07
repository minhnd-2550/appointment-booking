import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications/send";

const bodySchema = z.object({
  newSlotStart: z.string().datetime(),
  newSlotEnd: z.string().datetime(),
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // Verify ownership
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, user_id, doctor_id, slot_start, slot_end, status, patient_name, patient_email, doctors(email, name)",
    )
    .eq("id", id)
    .single();

  if (!appointment)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (appointment.user_id !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (!["pending", "confirmed"].includes(appointment.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 422 });
  }

  // Check cutoff window
  const { data: cutoffSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "cancellation_cutoff_hours")
    .single();

  const cutoffHours = cutoffSetting ? Number(cutoffSetting.value) : 24;
  const slotStart = new Date(appointment.slot_start);
  const diffMs = slotStart.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < cutoffHours) {
    return NextResponse.json(
      { error: "CUTOFF_WINDOW", cutoffHours },
      { status: 422 },
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { newSlotStart, newSlotEnd } = parsed.data;

  // Cancel current appointment
  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  // Book new appointment (same doctor, same patient)
  const { data: newAppt, error: bookError } = await supabase.rpc(
    "book_appointment",
    {
      p_doctor_id: appointment.doctor_id,
      p_slot_start: newSlotStart,
      p_slot_end: newSlotEnd,
      p_patient_name: appointment.patient_name,
      p_patient_email: appointment.patient_email,
      p_user_id: user.id,
    },
  );

  if (bookError) {
    return NextResponse.json(
      { error: "BOOKING_FAILED", detail: bookError.message },
      { status: 422 },
    );
  }

  // Notify doctor (fire and forget)
  const doctor = Array.isArray(appointment.doctors)
    ? appointment.doctors[0]
    : appointment.doctors;
  if (doctor?.email) {
    sendNotification("rescheduled", doctor.email, {
      patientName: user.email ?? "Bệnh nhân",
      oldSlot: appointment.slot_start,
      newSlot: newSlotStart,
    }).catch(() => {});
  }

  return NextResponse.json({ data: newAppt });
}
