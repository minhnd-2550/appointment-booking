import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications/send";

const joinSchema = z.object({
  doctorId: z.string().uuid(),
  preferredDateFrom: z.string().optional(),
  preferredDateTo: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "INVALID_BODY", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { doctorId, preferredDateFrom, preferredDateTo } = parsed.data;

  // Block if already on waitlist for this doctor
  const { data: existing } = await supabase
    .from("waitlist_entries")
    .select("id")
    .eq("patient_id", user.id)
    .eq("doctor_id", doctorId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "ALREADY_ON_WAITLIST" }, { status: 409 });
  }

  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .insert({
      patient_id: user.id,
      doctor_id: doctorId,
      preferred_date_from: preferredDateFrom ?? null,
      preferred_date_to: preferredDateTo ?? null,
      status: "active",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });

  // Fire confirmation email async
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.email) {
    sendNotification("waitlist-joined", profile.email, {
      name: profile.full_name ?? undefined,
      patientName: profile.full_name ?? undefined,
    }).catch(console.error);
  }

  return NextResponse.json({ data: entry }, { status: 201 });
}
