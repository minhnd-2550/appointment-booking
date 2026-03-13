import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const GENDER = ["male", "female", "other"] as const;
const RELATIONSHIP = ["child", "parent", "spouse", "sibling", "other"] as const;

const CreateDependentSchema = z.object({
  fullName: z.string().min(1).max(100),
  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER).optional(),
  relationship: z.enum(RELATIONSHIP),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dependents")
    .select("*")
    .eq("account_holder_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dependents: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateDependentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("dependents")
    .insert({
      account_holder_id: user.id,
      full_name: parsed.data.fullName,
      date_of_birth: parsed.data.dateOfBirth ?? null,
      gender: parsed.data.gender ?? null,
      relationship: parsed.data.relationship,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dependent: data }, { status: 201 });
}
