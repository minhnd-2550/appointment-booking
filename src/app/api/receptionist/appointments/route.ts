import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const WalkInSchema = z.object({
  doctorId: z.string().trim().uuid(),
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime(),
  patientName: z.string().min(1).max(100),
  patientPhone: z.string().optional(),
  patientEmail: z.string().email().optional(),
  visitReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireReceptionist(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = WalkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

  // Check slot availability
  const { count } = await adminSupabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", d.doctorId)
    .eq("slot_start", d.slotStart)
    .not("status", "in", '("cancelled")');

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Slot not available", code: "SLOT_TAKEN" },
      { status: 409 },
    );
  }

  const { data: appt, error: insertErr } = await adminSupabase
    .from("appointments")
    .insert({
      doctor_id: d.doctorId,
      slot_start: d.slotStart,
      slot_end: d.slotEnd,
      patient_name: d.patientName,
      patient_phone: d.patientPhone ?? null,
      patient_email: d.patientEmail ?? null,
      visit_reason: d.visitReason ?? null,
      status: "confirmed",
      booked_by: user.id,
      is_walk_in: true,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Write audit log
  await adminSupabase.from("audit_log_entries").insert({
    actor_id: user.id,
    action: "receptionist.walk_in_booking",
    entity_type: "appointment",
    entity_id: appt.id,
    metadata: {
      doctor_id: d.doctorId,
      slot_start: d.slotStart,
      patient_name: d.patientName,
      notes: d.notes ?? null,
    },
  });

  return NextResponse.json({ appointment: appt }, { status: 201 });
}
