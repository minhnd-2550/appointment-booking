import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay } from "date-fns";

async function resolveDoctorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail?: string,
) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, doctor_id")
    .eq("id", userId)
    .single();

  if (!profile || (profile.role !== "provider" && profile.role !== "admin")) {
    return null;
  }

  if (profile.doctor_id) {
    return profile.doctor_id;
  }

  if (!userEmail) {
    return null;
  }

  const { data: doctorByEmail } = await supabase
    .from("doctors")
    .select("id")
    .eq("email", userEmail)
    .single();

  return doctorByEmail?.id ?? null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctorId = await resolveDoctorId(
    supabase,
    user.id,
    user.email ?? undefined,
  );
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const dayStart = startOfDay(targetDate).toISOString();
  const dayEnd = endOfDay(targetDate).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `id, slot_start, slot_end, status, visit_reason, patient_name, user_id, dependent_id`,
    )
    .eq("doctor_id", doctorId)
    .gte("slot_start", dayStart)
    .lte("slot_start", dayEnd)
    .neq("status", "cancelled")
    .order("slot_start", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dependentIds = Array.from(
    new Set(
      (data ?? []).map((a) => a.dependent_id).filter((v): v is string => !!v),
    ),
  );

  let dependentsMap = new Map<string, string>();
  if (dependentIds.length > 0) {
    const { data: dependents } = await supabase
      .from("dependents")
      .select("id, full_name")
      .in("id", dependentIds);

    dependentsMap = new Map((dependents ?? []).map((d) => [d.id, d.full_name]));
  }

  const appointments = (data ?? []).map((appt) => ({
    id: appt.id,
    slot_start: appt.slot_start,
    slot_end: appt.slot_end,
    status: appt.status,
    visit_reason: appt.visit_reason,
    user_id: appt.user_id,
    patients: appt.patient_name ? { full_name: appt.patient_name } : null,
    patient_dependents: appt.dependent_id
      ? { full_name: dependentsMap.get(appt.dependent_id) ?? "" }
      : null,
  }));

  return NextResponse.json({ appointments });
}
