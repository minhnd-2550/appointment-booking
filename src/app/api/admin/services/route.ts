import { NextResponse } from "next/server";
import { z } from "zod";
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

const createServiceSchema = z.object({
  name: z.string().min(1),
  defaultDurationMinutes: z.number().int().positive(),
  defaultFee: z.number().positive(),
  currency: z.string().length(3).default("VND"),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("services")
    .select("*")
    .order("name");

  if (error)
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "INVALID_BODY", details: parsed.error.flatten() },
      { status: 400 },
    );

  const { data, error } = await auth.supabase
    .from("services")
    .insert({
      name: parsed.data.name,
      default_duration_minutes: parsed.data.defaultDurationMinutes,
      default_fee: parsed.data.defaultFee,
      currency: parsed.data.currency,
      is_active: true,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
