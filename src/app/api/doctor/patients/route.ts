import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json(
      { error: "Doctor profile not found" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)),
  );
  const offset = (page - 1) * pageSize;

  // Find all distinct patients who had appointments with this doctor
  let query = supabase
    .from("appointments")
    .select(`user_id, patient_name, patient_email, slot_start`)
    .eq("doctor_id", doctorId)
    .order("slot_start", { ascending: false });

  if (search) {
    query = query.or(
      `patient_name.ilike.%${search}%,patient_email.ilike.%${search}%`,
    );
  }

  // Get all appointments, then deduplicate by user_id in JS
  const { data: rows, error } = await query;

  if (error) {
    console.error("[GET /api/doctor/patients]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Deduplicate by user_id (keep most-recent appointment data)
  const seen = new Set<string>();
  const patients: {
    patient_key: string;
    user_id: string | null;
    booking_type: "authenticated" | "guest";
    patient_name: string;
    patient_email: string;
    last_appointment: string;
  }[] = [];

  for (const row of rows ?? []) {
    const key =
      row.user_id ??
      `guest:${(row.patient_email ?? "").trim().toLowerCase() || (row.patient_name ?? "").trim().toLowerCase()}`;

    if (!key || seen.has(key)) continue;

    seen.add(key);
    const bookingType = row.user_id ? "authenticated" : "guest";
    patients.push({
      patient_key: key,
      user_id: row.user_id ?? null,
      booking_type: bookingType,
      patient_name: row.patient_name ?? "Bệnh nhân",
      patient_email: row.patient_email ?? "",
      last_appointment: row.slot_start,
    });
  }

  const total = patients.length;
  const paged = patients.slice(offset, offset + pageSize);

  return NextResponse.json({ data: paged, total, page, pageSize });
}
