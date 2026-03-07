import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CancelSchema = z.object({
  reason: z.string().min(5, "Lý do phải ít nhất 5 ký tự").max(500),
});

async function requireAdmin(
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

  if (!profile || profile.role !== "admin") return null;
  return user;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const { data: appt, error: fetchErr } = await adminSupabase
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (appt.status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  if (["completed", "no-show"].includes(appt.status)) {
    return NextResponse.json(
      { error: `Cannot cancel appointment with status '${appt.status}'` },
      { status: 409 },
    );
  }

  const { data, error } = await adminSupabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: parsed.data.reason,
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminSupabase.from("audit_log_entries").insert({
    actor_id: user.id,
    action: "admin.cancel_appointment",
    entity_type: "appointment",
    entity_id: id,
    metadata: { reason: parsed.data.reason, previous_status: appt.status },
  });

  return NextResponse.json({ appointment: data });
}
