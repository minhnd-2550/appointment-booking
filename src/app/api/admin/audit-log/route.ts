import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const actorId = searchParams.get("actorId");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const exportCsv = searchParams.get("export") === "csv";

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);

  let query = adminSupabase
    .from("audit_log_entries")
    .select("*, profiles!actor_id(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (actorId) query = query.eq("actor_id", actorId);
  if (action) query = query.ilike("action", `%${action}%`);
  if (entityType) query = query.eq("entity_type", entityType);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  if (exportCsv) {
    const { data, error } = await query;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const headers = [
      "id",
      "actor",
      "action",
      "entity_type",
      "entity_id",
      "created_at",
    ];
    const rows = (data ?? []).map((e) => {
      const actor = e.profiles as { full_name?: string; email?: string } | null;
      return [
        e.id,
        actor?.full_name ?? actor?.email ?? e.actor_id,
        e.action,
        e.entity_type,
        e.entity_id ?? "",
        e.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${Date.now()}.csv"`,
      },
    });
  }

  const offset = (page - 1) * pageSize;
  const { data, count, error } = await query.range(
    offset,
    offset + pageSize - 1,
  );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ entries: data, total: count ?? 0 });
}
