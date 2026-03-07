import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  testName: z.string().min(1),
  type: z.enum(["lab", "imaging", "other"]),
  instructions: z.string().optional(),
});

interface Props {
  params: Promise<{ id: string }>;
}

async function getDoctor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userEmail: string,
) {
  return supabase.from("doctors").select("id").eq("email", userEmail).single();
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: doctor } = await getDoctor(supabase, user.email ?? "");
  if (!doctor)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { data: appt } = await supabase
    .from("appointments")
    .select("doctor_id")
    .eq("id", id)
    .single();
  if (!appt || appt.doctor_id !== doctor.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { data: orders } = await supabase
    .from("lab_orders")
    .select("*, examination_results(*)")
    .eq("appointment_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ data: orders ?? [] });
}

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: doctor } = await getDoctor(supabase, user.email ?? "");
  if (!doctor)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { data: appt } = await supabase
    .from("appointments")
    .select("doctor_id, status")
    .eq("id", id)
    .single();
  if (!appt || appt.doctor_id !== doctor.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (["cancelled", "no-show"].includes(appt.status)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 422 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("lab_orders")
    .insert({
      appointment_id: id,
      ordered_by: doctor.id,
      test_name: parsed.data.testName,
      type: parsed.data.type,
      instructions: parsed.data.instructions ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
