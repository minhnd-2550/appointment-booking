import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doctor, error: doctorErr } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (doctorErr || !doctor) {
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
      `id, slot_start, slot_end, status, visit_reason,
       patient_id, patients:profiles!patient_id(full_name, phone),
       patient_dependents(full_name)`,
    )
    .eq("doctor_id", doctor.id)
    .gte("slot_start", dayStart)
    .lte("slot_start", dayEnd)
    .not("status", "in", '("cancelled")')
    .order("slot_start", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: data });
}
