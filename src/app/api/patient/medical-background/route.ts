import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  entryType: z.enum(["allergy", "chronic_condition"]),
  description: z.string().min(2),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data, error } = await supabase
    .from("patient_medical_backgrounds")
    .select("*")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("patient_medical_backgrounds")
    .insert({
      user_id: user.id,
      entry_type: parsed.data.entryType,
      description: parsed.data.description,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
