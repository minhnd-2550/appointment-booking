import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;

  // Only cancel entries belonging to this patient
  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("patient_id", user.id)
    .eq("status", "active");

  if (error)
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  return NextResponse.json({ success: true });
}
