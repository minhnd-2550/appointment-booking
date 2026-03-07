import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

interface Props {
  params: Promise<{ id: string }>;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return { error: "UNAUTHORIZED", status: 401, supabase, user: null };
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { error: "FORBIDDEN", status: 403, supabase, user: null };
  return { error: null, status: 200, supabase, user };
}

const patchSchema = z.object({
  isActive: z.boolean(),
  force: z.boolean().optional().default(false),
});

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { isActive, force } = parsed.data;

  // If deactivating: check for active appointments
  if (!isActive) {
    const { data: profile } = await auth.supabase
      .from("user_profiles")
      .select("doctor_id")
      .eq("id", id)
      .single();

    if (profile?.doctor_id) {
      const { data: conflicts, count } = await auth.supabase
        .from("appointments")
        .select("id, slot_start, patient_name", { count: "exact" })
        .eq("doctor_id", profile.doctor_id)
        .in("status", ["pending", "confirmed"]);

      if ((count ?? 0) > 0 && !force) {
        return NextResponse.json(
          { error: "ACTIVE_APPOINTMENTS", count, conflicts },
          { status: 409 },
        );
      }

      // Force deactivate: also deactivate doctor record
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      await serviceClient
        .from("doctors")
        .update({ is_active: false })
        .eq("id", profile.doctor_id);
    }
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error: updateError } = await serviceClient
    .from("user_profiles")
    .update({ is_active: isActive })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ data: { id, isActive } });
}
