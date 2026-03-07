import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  qualifications: z.string().max(500).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional(),
  consultationFee: z.number().min(0).optional(),
  languages: z.array(z.string()).optional(),
  acceptingNewPatients: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Doctor profile not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ profile: data });
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
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
  if (parsed.data.qualifications !== undefined)
    updates.qualifications = parsed.data.qualifications;
  if (parsed.data.yearsOfExperience !== undefined)
    updates.years_of_experience = parsed.data.yearsOfExperience;
  if (parsed.data.consultationFee !== undefined)
    updates.consultation_fee = parsed.data.consultationFee;
  if (parsed.data.languages !== undefined)
    updates.languages = parsed.data.languages;
  if (parsed.data.acceptingNewPatients !== undefined)
    updates.accepting_new_patients = parsed.data.acceptingNewPatients;

  const { data, error } = await supabase
    .from("doctors")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: data });
}
