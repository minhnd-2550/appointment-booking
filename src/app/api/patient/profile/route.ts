import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  fullName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
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
    .from("patient_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    fullName,
    dateOfBirth,
    gender,
    address,
    emergencyContactName,
    emergencyContactPhone,
  } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
  if (gender !== undefined) updates.gender = gender;
  if (address !== undefined) updates.address = address;
  if (emergencyContactName !== undefined)
    updates.emergency_contact_name = emergencyContactName;
  if (emergencyContactPhone !== undefined)
    updates.emergency_contact_phone = emergencyContactPhone;

  const { data, error } = await supabase
    .from("patient_profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  return NextResponse.json({ data });
}
