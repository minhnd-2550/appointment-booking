import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireReceptionist(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const { data: appt, error: fetchErr } = await adminSupabase
    .from("appointments")
    .select("id, status, checked_in_at")
    .eq("id", id)
    .single();

  if (fetchErr || !appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["confirmed", "pending"].includes(appt.status)) {
    return NextResponse.json(
      { error: `Cannot check-in appointment with status '${appt.status}'` },
      { status: 409 },
    );
  }

  // Idempotent — if already checked in, return current state
  if (appt.checked_in_at) {
    return NextResponse.json({ appointment: appt });
  }

  const { data, error } = await adminSupabase
    .from("appointments")
    .update({ checked_in_at: new Date().toISOString(), status: "confirmed" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminSupabase.from("audit_log_entries").insert({
    actor_id: user.id,
    action: "receptionist.check_in",
    entity_type: "appointment",
    entity_id: id,
    metadata: {},
  });

  return NextResponse.json({ appointment: data });
}
