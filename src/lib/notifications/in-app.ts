import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send";
import type { NotificationPayload, NotificationType } from "@/types/domain";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type InAppEventType =
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "appointment_rescheduled"
  | "appointment_reminder"
  | "waitlist_joined"
  | "waitlist_opportunity"
  | "document_uploaded";

export async function createInAppNotification(
  patientId: string,
  eventType: InAppEventType,
  message: string,
  relatedEntityType?: string,
  relatedEntityId?: string,
): Promise<void> {
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  await supabase.from("in_app_notifications").insert({
    patient_id: patientId,
    event_type: eventType,
    message,
    is_read: false,
    related_entity_type: relatedEntityType ?? null,
    related_entity_id: relatedEntityId ?? null,
  });
}

/**
 * Check whether the patient has email notifications enabled for this event type,
 * then conditionally fire the email notification.
 */
export async function sendConditionalNotification(
  patientId: string,
  patientEmail: string,
  eventType: InAppEventType,
  templateType: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("email_enabled")
    .eq("patient_id", patientId)
    .eq("event_type", eventType)
    .maybeSingle();

  // Default is enabled if no preference row exists
  const emailEnabled = pref === null ? true : pref.email_enabled;

  if (emailEnabled) {
    await sendNotification(templateType, patientEmail, payload);
  }
}
