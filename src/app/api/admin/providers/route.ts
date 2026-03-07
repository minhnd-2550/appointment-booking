import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send";

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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("user_profiles")
    .select(
      "id, full_name, email, is_active, doctor_id, doctors(id, name, specialty)",
    )
    .eq("role", "provider")
    .order("full_name");

  if (error)
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });
  return NextResponse.json({ data });
}

const postSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  specialty: z.string().min(2),
  doctorId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { email, fullName, specialty, doctorId } = parsed.data;

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Create auth user with random temp password (they'll use set-password link)
  const tempPassword = crypto.randomUUID();
  const { data: newUser, error: createError } =
    await serviceClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
  if (createError || !newUser.user) {
    console.error("[admin/providers] createUser failed", createError);
    return NextResponse.json(
      { error: "USER_CREATION_FAILED", detail: createError?.message },
      { status: 500 },
    );
  }

  // Upsert user_profiles as provider
  await serviceClient.from("user_profiles").upsert(
    {
      id: newUser.user.id,
      role: "provider",
      full_name: fullName,
      email,
      is_active: true,
      doctor_id: doctorId ?? null,
    },
    { onConflict: "id" },
  );

  // Generate password reset link
  const { data: linkData } = await serviceClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/reset-password`,
    },
  });
  const setPasswordUrl = linkData?.properties?.action_link ?? "";

  void sendNotification("provider-invite", email, {
    patientName: fullName,
    name: fullName,
    setPasswordUrl,
    specialty,
  });

  return NextResponse.json({ data: { id: newUser.user.id } }, { status: 201 });
}
