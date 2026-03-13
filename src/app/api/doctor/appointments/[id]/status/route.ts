import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no-show"],
  completed: [],
  cancelled: [],
  "no-show": [],
};

const BodySchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no-show"]),
});

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

export async function PATCH(
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

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .eq("doctor_id", doctorId)
    .single();

  if (!appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = ALLOWED_TRANSITIONS[appt.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from '${appt.status}' to '${parsed.data.status}'`,
      },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointment: data });
}
