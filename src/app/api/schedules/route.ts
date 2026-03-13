import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const ScheduleBodySchema = z.object({
  doctorId: z.string().trim().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:mm"),
  slotDurationMinutes: z.number().int().min(15).max(120),
});

const SchedulesQuerySchema = z.object({
  doctorId: z.string().trim().uuid(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? serviceClient : null;
}

/**
 * GET /api/schedules?doctorId=<uuid>
 */
export async function GET(request: NextRequest) {
  const queryParsed = SchedulesQuerySchema.safeParse({
    doctorId: request.nextUrl.searchParams.get("doctorId") ?? "",
  });

  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid doctorId" },
      { status: 400 },
    );
  }

  const { doctorId } = queryParsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("working_schedules")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("day_of_week");

  if (error)
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ schedules: data });
}

/**
 * POST /api/schedules — Requires admin role; upserts a schedule row.
 */
export async function POST(request: NextRequest) {
  const serviceClient = await requireAdmin();
  if (!serviceClient) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ScheduleBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { doctorId, dayOfWeek, startTime, endTime, slotDurationMinutes } =
    parsed.data;

  if (startTime >= endTime) {
    return NextResponse.json(
      { error: "startTime must be before endTime" },
      { status: 422 },
    );
  }

  const { data, error } = await serviceClient
    .from("working_schedules")
    .upsert(
      {
        doctor_id: doctorId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: slotDurationMinutes,
        is_active: true,
      },
      { onConflict: "doctor_id,day_of_week" },
    )
    .select()
    .single();

  if (error) {
    console.error("[POST /api/schedules]", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 },
    );
  }

  return NextResponse.json({ schedule: data }, { status: 201 });
}
