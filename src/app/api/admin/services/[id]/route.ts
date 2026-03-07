import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  name: z.string().min(1).optional(),
  defaultDurationMinutes: z.number().int().positive().optional(),
  defaultFee: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "INVALID_BODY", details: parsed.error.flatten() },
      { status: 400 },
    );

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.defaultDurationMinutes !== undefined)
    updates.default_duration_minutes = parsed.data.defaultDurationMinutes;
  if (parsed.data.defaultFee !== undefined)
    updates.default_fee = parsed.data.defaultFee;
  if (parsed.data.isActive !== undefined)
    updates.is_active = parsed.data.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "NO_FIELDS_TO_UPDATE" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("services")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  return NextResponse.json({ data });
}
