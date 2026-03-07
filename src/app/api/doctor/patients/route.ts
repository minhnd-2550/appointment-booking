import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify provider role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "provider" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get doctor_id for this provider
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("email", user.email ?? "")
    .single();

  if (!doctor) {
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
    .select(
      `user_id,
       patient_name, patient_email,
       slot_start`,
      { count: "exact" },
    )
    .eq("doctor_id", doctor.id)
    .not("user_id", "is", null)
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
    user_id: string;
    patient_name: string;
    patient_email: string;
    last_appointment: string;
  }[] = [];
  for (const row of rows ?? []) {
    if (row.user_id && !seen.has(row.user_id)) {
      seen.add(row.user_id);
      patients.push({
        user_id: row.user_id,
        patient_name: row.patient_name,
        patient_email: row.patient_email,
        last_appointment: row.slot_start,
      });
    }
  }

  const total = patients.length;
  const paged = patients.slice(offset, offset + pageSize);

  return NextResponse.json({ data: paged, total, page, pageSize });
}
