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

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("patient_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    console.error("[api/patient/profile] failed to check existing profile", {
      userId: user.id,
      error: existingProfileError,
    });
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  if (!existingProfile) {
    const metadataName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null;
    const emailName = user.email?.split("@")[0] ?? null;
    const fallbackFullName =
      fullName ?? metadataName ?? emailName ?? "Bệnh nhân";

    const { error: insertError } = await supabase
      .from("patient_profiles")
      .insert({
        id: user.id,
        full_name: fallbackFullName,
        date_of_birth: dateOfBirth ?? null,
        gender: gender ?? null,
        address: address ?? null,
        emergency_contact_name: emergencyContactName ?? null,
        emergency_contact_phone: emergencyContactPhone ?? null,
      });

    if (insertError) {
      console.error("[api/patient/profile] failed to create missing profile", {
        userId: user.id,
        error: insertError,
      });
      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }
  }

  if (Object.keys(updates).length === 0) {
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (currentProfileError) {
      console.error("[api/patient/profile] failed to read profile", {
        userId: user.id,
        error: currentProfileError,
      });
      return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    }

    return NextResponse.json({ data: currentProfile });
  }

  const { data, error } = await supabase
    .from("patient_profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/patient/profile] failed to update profile", {
      userId: user.id,
      error,
    });
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
