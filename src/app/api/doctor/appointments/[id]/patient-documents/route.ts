import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSignedUrls } from "@/lib/storage/signed-urls";

const BUCKET = "patient-documents";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify doctor owns this appointment
  const { data: profile } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("doctor_id", profile.id)
    .single();

  if (apptErr || !appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const { data: docs, error: docsErr } = await adminSupabase
    .from("patient_documents")
    .select("id, file_name, file_type, storage_path, file_size, created_at")
    .eq("appointment_id", id)
    .order("created_at", { ascending: false });

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  const paths = docs.map((d) => d.storage_path as string);
  const signedItems = await getSignedUrls(BUCKET, paths);
  const urlMap = Object.fromEntries(
    signedItems.map((s) => [s.path, s.signedUrl]),
  );

  const documents = docs.map((d) => ({
    ...d,
    signedUrl: urlMap[d.storage_path as string] ?? null,
  }));

  return NextResponse.json({ documents });
}
