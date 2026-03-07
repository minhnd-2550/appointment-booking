import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  format,
  getDay,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch doctor base + profile
  const [doctorRes, profileRes, ratingsRes, schedulesRes] = await Promise.all([
    supabase
      .from("doctors")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .single(),
    supabase.from("doctor_profiles").select("*").eq("id", id).single(),
    supabase
      .from("doctor_ratings")
      .select("rating, comment, is_hidden, created_at, patient_id")
      .eq("doctor_id", id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("working_schedules")
      .select("day_of_week, start_time, end_time, slot_duration_minutes")
      .eq("doctor_id", id),
  ]);

  if (doctorRes.error || !doctorRes.data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const doctor = doctorRes.data;
  const profile = profileRes.data ?? null;
  const ratings = ratingsRes.data ?? [];

  // Aggregate ratings
  const count = ratings.length;
  const avg =
    count > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / count : null;
  const distribution: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };
  for (const r of ratings) {
    distribution[String(r.rating)] = (distribution[String(r.rating)] ?? 0) + 1;
  }

  const topReviews = ratings.slice(0, 5).map((r) => ({
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    // Only return first name initial for privacy
    reviewerName: "Bệnh nhân ẩn danh",
  }));

  // Compute next available slot in next 30 days
  let nextAvailableDate: string | null = null;
  const schedules = schedulesRes.data ?? [];

  if (schedules.length > 0) {
    const now = new Date();

    // Fetch blocked periods and existing appointments in next 30 days
    const rangeEnd = addDays(now, 30);
    const [blockedRes, apptRes] = await Promise.all([
      supabase
        .from("blocked_periods")
        .select("start_at, end_at")
        .eq("doctor_id", id)
        .gte("end_at", now.toISOString())
        .lte("start_at", rangeEnd.toISOString()),
      supabase
        .from("appointments")
        .select("slot_start, slot_end")
        .eq("doctor_id", id)
        .in("status", ["pending", "confirmed"])
        .gte("slot_start", now.toISOString())
        .lte("slot_start", rangeEnd.toISOString()),
    ]);

    const blocked = blockedRes.data ?? [];
    const bookedSlots = new Set((apptRes.data ?? []).map((a) => a.slot_start));

    for (let d = 0; d < 30; d++) {
      const date = addDays(now, d);
      const dow = getDay(date); // 0=Sun
      const schedule = schedules.find((s) => s.day_of_week === dow);
      if (!schedule) continue;

      const [startH = 0, startM = 0] = schedule.start_time
        .split(":")
        .map(Number);
      const [endH = 0, endM = 0] = schedule.end_time.split(":").map(Number);
      const step = schedule.slot_duration_minutes;

      const dayStart = setMinutes(setHours(date, startH), startM);
      const dayEnd = setMinutes(setHours(date, endH), endM);

      // Check if entire day is blocked
      const dayBlocked = blocked.some((b) => {
        const bs = parseISO(b.start_at);
        const be = parseISO(b.end_at);
        return bs <= dayStart && be >= dayEnd;
      });
      if (dayBlocked) continue;

      let slotStart = dayStart;
      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + step * 60000);
        if (slotStart > now && !bookedSlots.has(slotStart.toISOString())) {
          nextAvailableDate = format(slotStart, "yyyy-MM-dd");
          break;
        }
        slotStart = slotEnd;
      }
      if (nextAvailableDate) break;
    }
  }

  return NextResponse.json({
    doctor,
    profile,
    ratings: {
      avg,
      count,
      distribution,
      topReviews,
    },
    nextAvailableDate,
  });
}
