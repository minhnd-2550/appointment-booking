import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Appointment } from "@/types/domain";

const BlockedPeriodBodySchema = z.object({
  doctorId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  reason: z.string().max(200).optional(),
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
 * GET /api/blocked-periods?doctorId=<uuid>
 */
export async function GET(request: NextRequest) {
  const doctorId = request.nextUrl.searchParams.get("doctorId");
  if (!doctorId || !/^[0-9a-f-]{36}$/i.test(doctorId)) {
    return NextResponse.json(
      { error: "Missing or invalid doctorId" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocked_periods")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("start_at");

  if (error)
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json({ blockedPeriods: data });
}

/**
 * POST /api/blocked-periods — Requires admin; checks for appointment conflicts first.
 */
export async function POST(request: NextRequest) {
  const serviceClient = await requireAdmin();
  if (!serviceClient)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BlockedPeriodBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { doctorId, startAt, endAt, reason } = parsed.data;
  if (startAt >= endAt) {
    return NextResponse.json(
      { error: "startAt must be before endAt" },
      { status: 422 },
    );
  }

  // Conflict check: any pending/confirmed appointments that overlap
  const { data: conflicts } = await serviceClient
    .from("appointments")
    .select("*")
    .eq("doctor_id", doctorId)
    .in("status", ["pending", "confirmed"])
    .lt("slot_start", endAt)
    .gt("slot_end", startAt);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: "APPOINTMENT_CONFLICT", conflicts: conflicts as Appointment[] },
      { status: 409 },
    );
  }

  const { data, error } = await serviceClient
    .from("blocked_periods")
    .insert({
      doctor_id: doctorId,
      start_at: startAt,
      end_at: endAt,
      reason: reason ?? null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json(
      { error: "Failed to create blocked period" },
      { status: 500 },
    );
  return NextResponse.json({ blockedPeriod: data }, { status: 201 });
}
