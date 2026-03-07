import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  let query = auth.supabase
    .from("user_profiles")
    .select("id, full_name, email, is_active, created_at", { count: "exact" })
    .eq("role", "patient")
    .order("full_name")
    .range(from, from + pageSize - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error)
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });
  return NextResponse.json({ data, total: count });
}
