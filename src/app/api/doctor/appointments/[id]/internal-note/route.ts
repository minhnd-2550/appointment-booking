import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!doctor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("doctor_id", doctor.id)
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

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!doctor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("doctor_id", doctor.id)
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
