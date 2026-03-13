import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

export async function GET() {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await adminSupabase
    .from("system_settings")
    .select("*")
    .order("key", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { key, value } = body as { key?: string; value?: unknown };

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminSupabase
    .from("system_settings")
    .upsert({ key, value, updated_by: user.id }, { onConflict: "key" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await adminSupabase.from("audit_log_entries").insert({
    actor_id: user.id,
    action: "admin.update_system_setting",
    entity_type: "system_settings",
    entity_id: key,
    metadata: { value },
  });

  return NextResponse.json({ setting: data });
}
