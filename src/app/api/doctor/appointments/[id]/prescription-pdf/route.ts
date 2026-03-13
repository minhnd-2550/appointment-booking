import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePrescriptionPdf } from "@/lib/invoicing/prescription";

type PrescriptionItemRow = {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
};

type MedicalRecordRow = {
  diagnosis: string | null;
  examination_notes: string | null;
  prescription_items: PrescriptionItemRow[] | null;
};

async function resolveDoctor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail?: string,
) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, doctor_id")
    .eq("id", userId)
    .single();

  if (!profile || (profile.role !== "provider" && profile.role !== "admin")) {
    return null;
  }

  if (profile.doctor_id) {
    const { data: doctorById } = await supabase
      .from("doctors")
      .select("id, name, specialty")
      .eq("id", profile.doctor_id)
      .single();
    if (doctorById) return doctorById;
  }

  if (!userEmail) {
    return null;
  }

  const { data: doctorByEmail } = await supabase
    .from("doctors")
    .select("id, name, specialty")
    .eq("email", userEmail)
    .single();

  return doctorByEmail ?? null;
}

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

  const doctor = await resolveDoctor(
    supabase,
    user.id,
    user.email ?? undefined,
  );

  if (!doctor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select(
      `
      id, slot_start, visit_reason, patient_name,
      internal_notes(content),
      medical_records(
        diagnosis,
        examination_notes,
        prescription_items(
          medication_name,
          dosage,
          frequency,
          duration,
          notes
        )
      )
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

  const medicalRecord: MedicalRecordRow | null = Array.isArray(
    appt.medical_records,
  )
    ? appt.medical_records[0]
    : (appt.medical_records as MedicalRecordRow | null);

  const medications =
    medicalRecord?.prescription_items?.map((item: PrescriptionItemRow) => ({
      name: item.medication_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      notes: item.notes ?? "",
    })) ?? [];

  const prescriptionNote = [
    medicalRecord?.diagnosis ? `Chẩn đoán: ${medicalRecord.diagnosis}` : null,
    medicalRecord?.examination_notes
      ? `Ghi chú khám: ${medicalRecord.examination_notes}`
      : null,
    internalNote?.content ? `Ghi chú nội bộ: ${internalNote.content}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const pdfBuffer = generatePrescriptionPdf({
    appointmentId: appt.id,
    patientName: appt.patient_name ?? "Bệnh nhân",
    patientDob: null,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    clinicName: process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Phòng khám",
    date: appt.slot_start,
    visitReason: appt.visit_reason ?? null,
    prescriptionNote: prescriptionNote || null,
    medications,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prescription-${id.slice(0, 8)}.pdf"`,
    },
  });
}
