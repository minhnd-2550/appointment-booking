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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("doctor_id", doctorId)
    .single();

  if (!appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("internal_notes")
    .select("id, content, created_at, updated_at")
    .eq("appointment_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("doctor_id", doctorId)
    .single();

  if (!appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const note: string =
    typeof body.note === "string" ? body.note.slice(0, 5000) : "";

  const { data, error } = await supabase
    .from("internal_notes")
    .upsert(
      { appointment_id: id, authored_by: user.id, content: note },
      { onConflict: "appointment_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}
