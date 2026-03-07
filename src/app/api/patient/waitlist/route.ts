import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("*, doctors(name, specialty)")
    .eq("patient_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });
  return NextResponse.json({ data });
}
