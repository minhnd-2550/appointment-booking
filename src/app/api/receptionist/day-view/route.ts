import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { startOfDay, endOfDay } from "date-fns";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireReceptionist(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "receptionist") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireReceptionist(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const dayStart = startOfDay(targetDate).toISOString();
  const dayEnd = endOfDay(targetDate).toISOString();

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminSupabase
    .from("appointments")
    .select(
      `id, slot_start, slot_end, status, visit_reason, checked_in_at,
       patient_name, patient_phone, patient_email,
       doctor_id, doctors(id, name, specialty)`,
    )
    .gte("slot_start", dayStart)
    .lte("slot_start", dayEnd)
    .not("status", "in", '("cancelled")')
    .order("slot_start", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by doctor
  const grouped: Record<
    string,
    {
      doctor: { id: string; name: string; specialty: string };
      appointments: unknown[];
    }
  > = {};
  for (const appt of data ?? []) {
    const doc = appt.doctors as unknown as {
      id: string;
      name: string;
      specialty: string;
    } | null;
    const key = appt.doctor_id;
    if (!grouped[key]) {
      grouped[key] = {
        doctor: doc ?? { id: appt.doctor_id, name: "Unknown", specialty: "" },
        appointments: [],
      };
    }
    grouped[key].appointments.push(appt);
  }

  return NextResponse.json({
    date: targetDate.toISOString(),
    doctors: Object.values(grouped),
  });
}
