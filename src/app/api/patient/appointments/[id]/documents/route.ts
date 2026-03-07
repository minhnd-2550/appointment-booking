import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSignedUrls } from "@/lib/storage/signed-urls";

const BUCKET = "patient-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

  // Verify appointment belongs to user
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("patient_id", user.id)
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

export async function POST(
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

  // Verify appointment belongs to user
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", id)
    .eq("patient_id", user.id)
    .single();

  if (apptErr || !appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Tệp tin không được cung cấp" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Tệp tin quá lớn. Tối đa 10 MB." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: "Định dạng tệp không hỗ trợ. Chỉ cho phép PDF, JPG, PNG, WEBP.",
      },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const storagePath = `${user.id}/${id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const adminSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await adminSupabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: doc, error: insertErr } = await adminSupabase
    .from("patient_documents")
    .insert({
      appointment_id: id,
      patient_id: user.id,
      file_name: file.name,
      file_type: file.type,
      storage_path: storagePath,
      file_size: file.size,
    })
    .select()
    .single();

  if (insertErr) {
    // Rollback the upload
    await adminSupabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: doc }, { status: 201 });
}
