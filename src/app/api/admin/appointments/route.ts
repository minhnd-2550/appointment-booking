import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const doctorId = searchParams.get("doctorId");
  const status = searchParams.get("status");
  const patientName = searchParams.get("patientName");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const offset = (page - 1) * pageSize;

  let query = adminSupabase
    .from("appointments")
    .select("*, doctors(name, specialty)", { count: "exact" })
    .order("slot_start", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (doctorId) query = query.eq("doctor_id", doctorId);
  if (status) query = query.eq("status", status);
  if (patientName) query = query.ilike("patient_name", `%${patientName}%`);
  if (from) query = query.gte("slot_start", from);
  if (to) query = query.lte("slot_start", to);

  const { data, count, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ appointments: data, total: count ?? 0 });
}
