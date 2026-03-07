import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ContactSchema = z.object({
  patientName: z.string().min(1).max(100).optional(),
  patientPhone: z.string().optional(),
  patientEmail: z.string().email().optional(),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireReceptionist(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const updates: Record<string, unknown> = {};
  if (parsed.data.patientName !== undefined)
    updates.patient_name = parsed.data.patientName;
  if (parsed.data.patientPhone !== undefined)
    updates.patient_phone = parsed.data.patientPhone;
  if (parsed.data.patientEmail !== undefined)
    updates.patient_email = parsed.data.patientEmail;

  const { data, error } = await adminSupabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointment: data });
}
