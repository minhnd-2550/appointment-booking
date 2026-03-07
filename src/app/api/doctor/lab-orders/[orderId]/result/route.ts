import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DEFAULT_MAX_MB = 10;

const bodySchema = z.object({
  resultText: z.string().optional(),
});

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function PUT(request: Request, { params }: Props) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("email", user.email ?? "")
    .single();
  if (!doctor)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // Load order + appointment to verify ownership
  const { data: order } = await supabase
    .from("lab_orders")
    .select("id, appointment_id, appointments(doctor_id)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const apptDoctor = Array.isArray(order.appointments)
    ? order.appointments[0]?.doctor_id
    : (order.appointments as { doctor_id: string } | null)?.doctor_id;

  if (apptDoctor !== doctor.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const contentType = request.headers.get("content-type") ?? "";
  let resultText: string | undefined;
  let filePath: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    // File upload
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const textField = formData.get("resultText");
    resultText = typeof textField === "string" ? textField : undefined;

    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "INVALID_FILE_TYPE" },
          { status: 400 },
        );
      }

      // Check max upload size from system_settings
      const { data: maxUploadSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "max_upload_mb")
        .single();

      const maxMb = maxUploadSetting
        ? Number(maxUploadSetting.value)
        : DEFAULT_MAX_MB;
      if (file.size > maxMb * 1024 * 1024) {
        return NextResponse.json(
          { error: "FILE_TOO_LARGE", maxMb },
          { status: 400 },
        );
      }

      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const ext = file.name.split(".").pop() ?? "bin";
      const storePath = `results/${orderId}-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();

      const { error: uploadError } = await serviceClient.storage
        .from("result-files")
        .upload(storePath, buffer, { contentType: file.type });

      if (uploadError)
        return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });

      filePath = storePath;
    }
  } else {
    // JSON body
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    resultText = parsed.data.resultText;
  }

  if (!resultText && !filePath) {
    return NextResponse.json({ error: "NO_CONTENT" }, { status: 400 });
  }

  // Upsert examination result (one per order)
  const { data: existing } = await supabase
    .from("examination_results")
    .select("id")
    .eq("lab_order_id", orderId)
    .single();

  let result;
  if (existing) {
    const { data } = await supabase
      .from("examination_results")
      .update({
        ...(resultText !== undefined && { result_text: resultText }),
        ...(filePath && { file_path: filePath }),
      })
      .eq("id", existing.id)
      .select()
      .single();
    result = data;
  } else {
    const { data } = await supabase
      .from("examination_results")
      .insert({
        lab_order_id: orderId,
        uploaded_by: user.id,
        result_text: resultText ?? null,
        file_path: filePath,
      })
      .select()
      .single();
    result = data;
  }

  // Update lab order status
  await supabase
    .from("lab_orders")
    .update({ status: "result_available" })
    .eq("id", orderId);

  // Generate signed URL for immediate display
  let signedUrl: string | null = null;
  if (filePath) {
    const { data: signed } = await supabase.storage
      .from("result-files")
      .createSignedUrl(filePath, 3600);
    signedUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ data: result, signedUrl });
}
