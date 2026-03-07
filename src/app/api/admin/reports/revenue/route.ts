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

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  appointments: {
    doctor_id: string;
    doctors: {
      name: string;
      specialty: string;
    } | null;
  } | null;
};

function toCSV(rows: PaymentRow[]): string {
  const headers = [
    "id",
    "amount",
    "currency",
    "paid_at",
    "doctor_name",
    "specialty",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.amount,
      r.currency,
      r.paid_at ?? "",
      r.appointments?.doctors?.name ?? "",
      r.appointments?.doctors?.specialty ?? "",
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
    .from("payments")
    .select(
      "id, amount, currency, paid_at, appointments(doctor_id, doctors(name, specialty))",
    )
    .eq("status", "paid")
    .order("paid_at");

  if (from) query = query.gte("paid_at", from);
  if (to) query = query.lte("paid_at", to);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });

  const rows = (data ?? []) as PaymentRow[];

  if (format === "csv") {
    const date = new Date().toISOString().slice(0, 10);
    return new Response(toCSV(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=revenue-${date}.csv`,
      },
    });
  }

  // Aggregate for JSON
  let totalCollected = 0;
  const byDoctor: Record<string, number> = {};
  const bySpecialty: Record<string, number> = {};

  for (const r of rows) {
    totalCollected += r.amount;
    const doctorName =
      r.appointments?.doctors?.name ?? r.appointments?.doctor_id ?? "Unknown";
    byDoctor[doctorName] = (byDoctor[doctorName] ?? 0) + r.amount;
    const specialty = r.appointments?.doctors?.specialty ?? "Unknown";
    bySpecialty[specialty] = (bySpecialty[specialty] ?? 0) + r.amount;
  }

  return NextResponse.json({
    totalCollected,
    byDoctor,
    bySpecialty,
    count: rows.length,
  });
}
