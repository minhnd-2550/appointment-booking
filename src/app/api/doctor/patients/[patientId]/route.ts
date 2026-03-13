import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const paramsSchema = z.object({ patientId: z.string().trim().uuid() });

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patientId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // Load appointment history for this patient with this doctor
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `id, slot_start, slot_end, patient_name, patient_email,
       visit_reason, status, checked_in_at, created_at,
       medical_records ( id, diagnosis, examination_notes, created_at ),
       lab_orders ( id, test_name, type, status )`,
    )
    .eq("doctor_id", doctorId)
    .eq("user_id", parsed.data.patientId)
    .order("slot_start", { ascending: false });

  if (error) {
    console.error("[GET /api/doctor/patients/[patientId]]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  return NextResponse.json({ appointments: appointments ?? [] });
}
