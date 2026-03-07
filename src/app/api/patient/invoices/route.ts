import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // Fetch all non-voided payments for this patient's appointments
  const { data: payments, error } = await supabase
    .from("payments")
    .select(
      `id, appointment_id, amount, currency, status, invoice_number, invoice_path, paid_at, created_at,
      appointments!inner(id, slot_start, slot_end, user_id, doctor_id,
        doctors(id, name, specialty))`,
    )
    .neq("status", "voided")
    .eq("appointments.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[invoices] query error", error);
    return NextResponse.json({ error: "QUERY_FAILED" }, { status: 500 });
  }

  if (!payments || payments.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // Generate signed URLs for all paid invoices
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const results = await Promise.all(
    payments.map(async (p) => {
      let signedInvoiceUrl: string | null = null;
      if (p.invoice_path && p.status === "paid") {
        const { data: signed } = await serviceClient.storage
          .from("invoice-files")
          .createSignedUrl(p.invoice_path, 3600);
        signedInvoiceUrl = signed?.signedUrl ?? null;
      }
      return { ...p, signedInvoiceUrl };
    }),
  );

  return NextResponse.json({ data: results });
}
