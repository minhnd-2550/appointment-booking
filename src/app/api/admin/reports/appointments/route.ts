import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return { error: "UNAUTHORIZED", status: 401, supabase, user: null };
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { error: "FORBIDDEN", status: 403, supabase, user: null };
  return { error: null, status: 200, supabase, user };
}

type AppointmentRow = {
  id: string;
  slot_start: string;
  status: string;
  doctor_id: string;
  doctors: {
    name: string;
    specialty: string;
  } | null;
};

function toCSV(rows: AppointmentRow[]): string {
  const headers = [
    "id",
    "slot_start",
    "status",
    "doctor_id",
    "doctor_name",
    "specialty",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.slot_start,
      r.status,
      r.doctor_id,
      r.doctors?.name ?? "",
      r.doctors?.specialty ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format") ?? "json";

  let query = auth.supabase
    .from("appointments")
    .select("id, slot_start, status, doctor_id, doctors(name, specialty)")
    .order("slot_start");

  if (from) query = query.gte("slot_start", from);
  if (to) query = query.lte("slot_start", to);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });

  const rows = (data ?? []) as AppointmentRow[];

  if (format === "csv") {
    const date = new Date().toISOString().slice(0, 10);
    return new Response(toCSV(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=appointments-${date}.csv`,
      },
    });
  }

  // Aggregate for JSON
  const byStatus: Record<string, number> = {};
  const byDoctor: Record<string, number> = {};
  const bySpecialty: Record<string, number> = {};

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const doctorName = r.doctors?.name ?? r.doctor_id;
    byDoctor[doctorName] = (byDoctor[doctorName] ?? 0) + 1;
    const specialty = r.doctors?.specialty ?? "Unknown";
    bySpecialty[specialty] = (bySpecialty[specialty] ?? 0) + 1;
  }

  return NextResponse.json({
    total: rows.length,
    byStatus,
    byDoctor,
    bySpecialty,
    data: rows,
  });
}
