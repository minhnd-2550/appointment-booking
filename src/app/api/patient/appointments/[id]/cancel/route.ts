import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications/send";

interface Props {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, { params }: Props) {
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
    .select("id, user_id, doctor_id, slot_start, status, doctors(email, name)")
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
  const diffHours = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

  if (diffHours < cutoffHours) {
    return NextResponse.json(
      { error: "CUTOFF_WINDOW", cutoffHours },
      { status: 422 },
    );
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  // Notify doctor (fire and forget)
  const doctor = Array.isArray(appointment.doctors)
    ? appointment.doctors[0]
    : appointment.doctors;
  if (doctor?.email) {
    sendNotification("cancelled-by-patient", doctor.email, {
      patientName: user.email ?? "Bệnh nhân",
      slotStart: appointment.slot_start,
    }).catch(() => {});
  }

  return NextResponse.json({ data: { id, status: "cancelled" } });
}
