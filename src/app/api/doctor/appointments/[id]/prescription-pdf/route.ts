import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePrescriptionPdf } from "@/lib/invoicing/prescription";

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

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, name, specialty")
    .eq("user_id", user.id)
    .single();

  if (!doctor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      `
      id, slot_start, visit_reason, patient_name,
      internal_notes(content)
    `,
    )
    .eq("id", id)
    .eq("doctor_id", doctor.id)
    .single();

  if (apptErr || !appt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const internalNote = (
    appt.internal_notes as Array<{ content: string }> | null
  )?.[0];

  const htmlBuffer = generatePrescriptionPdf({
    appointmentId: appt.id,
    patientName: appt.patient_name ?? "Bệnh nhân",
    patientDob: null,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    clinicName: process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Phòng khám",
    date: appt.slot_start,
    visitReason: appt.visit_reason ?? null,
    prescriptionNote: internalNote?.content ?? null,
  });

  return new NextResponse(htmlBuffer.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="prescription-${id.slice(0, 8)}.html"`,
    },
  });
}
