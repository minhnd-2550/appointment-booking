import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().trim().uuid() });

const clinicalBodySchema = z.object({
  diagnosis: z.string().optional(),
  examinationNotes: z.string().optional(),
  prescriptionItems: z
    .array(
      z.object({
        medicationName: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration: z.string().min(1),
        notes: z.string().optional(),
      }),
    )
    .default([]),
});

async function resolveDoctorId(
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
    return profile.doctor_id;
  }

  if (!userEmail) {
    return null;
  }

  const { data } = await supabase
    .from("doctors")
    .select("id")
    .eq("email", userEmail)
    .single();

  return data?.id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctorId = await resolveDoctorId(
    supabase,
    user.id,
    user.email ?? undefined,
  );
  if (!doctorId)
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  // Verify appointment belongs to this doctor
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", parsed.data.id)
    .eq("doctor_id", doctorId)
    .single();

  if (!appt)
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 },
    );

  const { data: record } = await supabase
    .from("medical_records")
    .select("*, prescription_items(*)")
    .eq("appointment_id", parsed.data.id)
    .maybeSingle();

  return NextResponse.json({ record: record ?? null });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctorId = await resolveDoctorId(
    supabase,
    user.id,
    user.email ?? undefined,
  );
  if (!doctorId)
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  // Verify appointment and check status
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", parsed.data.id)
    .eq("doctor_id", doctorId)
    .single();

  if (!appt)
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 },
    );
  if (appt.status === "cancelled") {
    return NextResponse.json(
      {
        error: "INVALID_STATUS",
        message: "Cannot edit notes for cancelled appointment",
      },
      { status: 422 },
    );
  }

  const body = clinicalBodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid body", details: body.error.flatten() },
      { status: 400 },
    );
  }

  const { diagnosis, examinationNotes, prescriptionItems } = body.data;

  // Upsert medical_records
  const { data: record, error: recordError } = await supabase
    .from("medical_records")
    .upsert(
      {
        appointment_id: parsed.data.id,
        diagnosis: diagnosis ?? null,
        examination_notes: examinationNotes ?? null,
        recorded_by: user.id,
      },
      { onConflict: "appointment_id" },
    )
    .select("id")
    .single();

  if (recordError || !record) {
    console.error("[PUT /api/doctor/appointments/[id]/clinical]", recordError);
    return NextResponse.json(
      { error: "Failed to save medical record" },
      { status: 500 },
    );
  }

  // Replace prescription items (delete + re-insert)
  await supabase
    .from("prescription_items")
    .delete()
    .eq("medical_record_id", record.id);

  if (prescriptionItems.length > 0) {
    const items = prescriptionItems.map((item) => ({
      medical_record_id: record.id,
      medication_name: item.medicationName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      notes: item.notes ?? null,
    }));
    const { error: itemsError } = await supabase
      .from("prescription_items")
      .insert(items);
    if (itemsError) {
      console.error(
        "[PUT clinical] prescription_items insert error",
        itemsError,
      );
    }
  }

  // Return updated record with items
  const { data: fullRecord } = await supabase
    .from("medical_records")
    .select("*, prescription_items(*)")
    .eq("id", record.id)
    .single();

  return NextResponse.json({ record: fullRecord });
}
