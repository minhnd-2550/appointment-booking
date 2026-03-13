import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const EVENT_TYPES = [
  "appointment_confirmed",
  "appointment_cancelled",
  "appointment_rescheduled",
  "appointment_reminder",
  "waitlist_joined",
  "waitlist_opportunity",
  "document_uploaded",
] as const;

const PreferenceSchema = z.object({
  eventType: z.enum(EVENT_TYPES),
  emailEnabled: z.boolean(),
});

const PutBodySchema = z.object({
  preferences: z.array(PreferenceSchema).min(1),
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
    .from("notification_preferences")
    .select("event_type, email_enabled")
    .eq("patient_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build defaults map, override with saved preferences
  const defaults: Record<string, boolean> = Object.fromEntries(
    EVENT_TYPES.map((t) => [t, true]),
  );
  for (const pref of data ?? []) {
    if (pref.event_type in defaults) {
      defaults[pref.event_type] = pref.email_enabled;
    }
  }

  const preferences = Object.entries(defaults).map(
    ([eventType, emailEnabled]) => ({
      eventType,
      emailEnabled,
    }),
  );

  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rows = parsed.data.preferences.map((p) => ({
    patient_id: user.id,
    event_type: p.eventType,
    email_enabled: p.emailEnabled,
  }));

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(rows, { onConflict: "patient_id,event_type" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
