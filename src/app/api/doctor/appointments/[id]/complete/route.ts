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

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("email", user.email ?? "")
    .single();
  if (!doctor)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // Verify appointment belongs to this doctor
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, doctor_id, slot_start, patient_email")
    .eq("id", id)
    .single();
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (appt.doctor_id !== doctor.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // Call complete_appointment RPC
  const { error: rpcError } = await supabase.rpc("complete_appointment", {
    p_appointment_id: id,
    p_actor_id: user.id,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 422 });
  }

  // Notify patient (fire and forget)
  if (appt.patient_email) {
    sendNotification("post-visit-summary", appt.patient_email, {
      slotStart: appt.slot_start,
    }).catch(() => {});
  }

  return NextResponse.json({ data: { id, status: "completed" } });
}
