import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [notificationsResult, unreadResult] = await Promise.all([
    supabase
      .from("in_app_notifications")
      .select("*", { count: "exact" })
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("in_app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", user.id)
      .eq("is_read", false),
  ]);

  if (notificationsResult.error) {
    return NextResponse.json(
      { error: notificationsResult.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    notifications: notificationsResult.data,
    total: notificationsResult.count ?? 0,
    unreadCount: unreadResult.count ?? 0,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, markAll } = body as { ids?: string[]; markAll?: boolean };

  let query = supabase
    .from("in_app_notifications")
    .update({ is_read: true })
    .eq("patient_id", user.id);

  if (!markAll && ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
