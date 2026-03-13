import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send";

const CLAIM_TOKEN_TTL_MINUTES = 60;

/**
 * Notify all active waitlist entries for a doctor when a slot is freed.
 * Called after appointment cancellation or reschedule.
 */
export async function notifyWaitlist(
  doctorId: string,
  freedSlotStart: string,
  freedSlotEnd: string,
): Promise<void> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: entries, error } = await serviceClient
    .from("waitlist_entries")
    .select("id, patient_id")
    .eq("doctor_id", doctorId)
    .eq("status", "active");

  if (error || !entries || entries.length === 0) return;

  const expiresAt = new Date(
    Date.now() + CLAIM_TOKEN_TTL_MINUTES * 60 * 1000,
  ).toISOString();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const entry of entries) {
    const token = crypto.randomUUID();

    // Save token to entry
    await serviceClient
      .from("waitlist_entries")
      .update({ claim_token: token, claim_token_expires_at: expiresAt })
      .eq("id", entry.id);

    // Get patient email
    const { data: profile } = await serviceClient
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", entry.patient_id)
      .single();

    if (!profile?.email) continue;

    const claimUrl = `${baseUrl}/waitlist/claim?token=${token}&slotStart=${encodeURIComponent(freedSlotStart)}&slotEnd=${encodeURIComponent(freedSlotEnd)}`;

    sendNotification("waitlist-opportunity", profile.email, {
      name: profile.full_name ?? undefined,
      patientName: profile.full_name ?? undefined,
      claimUrl,
      expiresAt,
    }).catch(console.error);
  }
}
