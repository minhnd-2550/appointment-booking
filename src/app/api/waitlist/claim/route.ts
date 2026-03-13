import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const claimSchema = z.object({
  token: z.string().trim().uuid(),
  slotStart: z.string(),
  slotEnd: z.string(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "INVALID_BODY", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { token, slotStart, slotEnd } = parsed.data;

  // Verify token is valid + not expired
  const { data: entry, error: entryError } = await supabase
    .from("waitlist_entries")
    .select("id, patient_id, doctor_id, claim_token_expires_at, status")
    .eq("claim_token", token)
    .eq("status", "active")
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: "CLAIM_EXPIRED" }, { status: 410 });
  }

  if (
    entry.claim_token_expires_at &&
    new Date(entry.claim_token_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: "CLAIM_EXPIRED" }, { status: 410 });
  }

  // Get patient info for appointment creation
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, email")
    .eq("id", entry.patient_id)
    .single();

  // Try to book the slot via the book_appointment RPC
  const { data: appointment, error: bookError } = await supabase.rpc(
    "book_appointment",
    {
      p_doctor_id: entry.doctor_id,
      p_slot_start: slotStart,
      p_slot_end: slotEnd,
      p_patient_name: profile?.full_name ?? "Patient",
      p_patient_email: profile?.email ?? "",
      p_patient_phone: undefined,
      p_visit_reason: "Waitlist claim",
      p_user_id: entry.patient_id,
      p_dependent_id: undefined,
    },
  );

  if (bookError) {
    // Slot taken — re-activate entry so they can try another slot
    await supabase
      .from("waitlist_entries")
      .update({ claim_token: null, claim_token_expires_at: null })
      .eq("id", entry.id);

    return NextResponse.json({ error: "SLOT_ALREADY_TAKEN" }, { status: 409 });
  }

  // Mark waitlist entry fulfilled
  await supabase
    .from("waitlist_entries")
    .update({
      status: "fulfilled",
      claim_token: null,
      claim_token_expires_at: null,
    })
    .eq("id", entry.id);

  return NextResponse.json({ data: appointment }, { status: 201 });
}
