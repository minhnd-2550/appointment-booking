import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public endpoint — returns the cancellation cutoff hours setting
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "cancellation_cutoff_hours")
    .single();

  return NextResponse.json({ cutoffHours: data ? Number(data.value) : 24 });
}
