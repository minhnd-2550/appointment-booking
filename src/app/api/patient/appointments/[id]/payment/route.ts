import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateInvoicePdf } from "@/lib/invoicing/generate";
import { sendNotification } from "@/lib/notifications/send";

interface Props {
  params: Promise<{ id: string }>;
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

  // Verify ownership
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, user_id")
    .eq("id", id)
    .single();
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (appt.user_id !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("appointment_id", id)
    .single();
  if (!payment)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let signedInvoiceUrl: string | null = null;
  if (payment.invoice_path && payment.status === "paid") {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: signed } = await serviceClient.storage
      .from("invoice-files")
      .createSignedUrl(payment.invoice_path, 3600);
    signedInvoiceUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ data: { ...payment, signedInvoiceUrl } });
}

const postSchema = z.object({
  gatewayToken: z.string().min(1),
});

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // Verify ownership + appointment context
  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, user_id, status, slot_start, doctor_id, doctors(name, specialty, doctor_profiles(fee_override))",
    )
    .eq("id", id)
    .single();
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (appt.user_id !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (appt.status !== "completed") {
    return NextResponse.json(
      { error: "APPOINTMENT_NOT_COMPLETED" },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { gatewayToken } = parsed.data;

  // Mock failure
  if (gatewayToken === "fail") {
    return NextResponse.json({ error: "PAYMENT_FAILED" }, { status: 402 });
  }

  // Load existing payment
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("appointment_id", id)
    .single();
  if (!payment)
    return NextResponse.json(
      { error: "PAYMENT_RECORD_NOT_FOUND" },
      { status: 404 },
    );
  if (payment.status === "paid") {
    return NextResponse.json({ error: "ALREADY_PAID" }, { status: 409 });
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Generate invoice number: INV-YYYYMM-{sequence}
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { count: existingCount } = await serviceClient
    .from("payments")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `INV-${yearMonth}-%`);
  const seq = (existingCount ?? 0) + 1;
  const invoiceNumber = `INV-${yearMonth}-${String(seq).padStart(4, "0")}`;

  // Gather patient profile for invoice
  const { data: patientProfile } = await serviceClient
    .from("patient_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const patientName = patientProfile?.full_name ?? user.email ?? "Bệnh nhân";

  const doctor = Array.isArray(appt.doctors)
    ? appt.doctors[0]
    : (appt.doctors as { name: string; specialty: string } | null);
  const doctorName = doctor?.name ?? "Bác sĩ";
  const doctorSpecialty = doctor?.specialty ?? "";

  // Generate PDF
  const invoiceDate = now.toISOString().slice(0, 10);
  const pdfBuffer = generateInvoicePdf({
    invoiceNumber,
    invoiceDate,
    patientName,
    patientEmail: user.email ?? "",
    doctorName,
    doctorSpecialty,
    serviceDescription: "Phí tư vấn khám bệnh",
    amount: Number(payment.amount),
    currency: payment.currency,
  });

  // Upload PDF to invoice-files bucket
  const storePath = `invoices/${payment.id}-${Date.now()}.pdf`;
  const { error: uploadError } = await serviceClient.storage
    .from("invoice-files")
    .upload(storePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) {
    console.error("[payment] PDF upload failed", uploadError);
    return NextResponse.json(
      { error: "INVOICE_UPLOAD_FAILED" },
      { status: 500 },
    );
  }

  // Update payment record
  const { data: updatedPayment, error: updateError } = await serviceClient
    .from("payments")
    .update({
      status: "paid",
      paid_at: now.toISOString(),
      invoice_number: invoiceNumber,
      invoice_path: storePath,
    })
    .eq("id", payment.id)
    .select()
    .single();

  if (updateError || !updatedPayment) {
    console.error("[payment] update failed", updateError);
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  // Generate signed URL for immediate download
  const { data: signed } = await serviceClient.storage
    .from("invoice-files")
    .createSignedUrl(storePath, 3600);

  // Fire invoice email async
  void sendNotification("invoice", user.email ?? "", {
    patientName,
    invoiceNumber,
    amount: Number(payment.amount),
    currency: payment.currency,
    appointmentDate: appt.slot_start,
    doctorName,
    invoiceUrl: signed?.signedUrl ?? "",
  });

  return NextResponse.json({
    data: {
      ...updatedPayment,
      signedInvoiceUrl: signed?.signedUrl ?? null,
    },
  });
}
