import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // RLS enforces ownership; a mismatch will result in 0 rows deleted
  const { error, count } = await supabase
    .from("patient_medical_backgrounds")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  if (count === 0)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
