import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications/send";
import { z } from "zod";

const BookingSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.string().datetime({ offset: true }),
  slotEnd: z.string().datetime({ offset: true }),
  patientName: z.string().min(2).max(100),
  patientEmail: z.string().email(),
  patientPhone: z.string().regex(/^[+\d\s\-()]{7,20}$/),
  visitReason: z.string().max(500).optional(),
});

/**
 * POST /api/appointments
 *
 * Books an appointment using the atomic book_appointment() Postgres function.
 * Returns 201 on success, 409 on double-booking, 422 on validation failure.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const {
    doctorId,
    slotStart,
    slotEnd,
    patientName,
    patientEmail,
    patientPhone,
    visitReason,
  } = parsed.data;

  const supabase = await createServiceClient();

  // Fetch doctor name for the notification
  const { data: doctor } = await supabase
    .from("doctors")
    .select("name")
    .eq("id", doctorId)
    .single();

  // Call atomic booking function
  const { data, error } = await supabase.rpc("book_appointment", {
    p_doctor_id: doctorId,
    p_slot_start: slotStart,
    p_slot_end: slotEnd,
    p_patient_name: patientName,
    p_patient_email: patientEmail,
    p_patient_phone: patientPhone,
    p_visit_reason: visitReason ?? undefined,
  });

  if (error) {
    // Unique violation → slot taken
    if (error.code === "23505" || error.message?.includes("already booked")) {
      return NextResponse.json(
        { error: "This time slot is no longer available." },
        { status: 409 },
      );
    }
    console.error("[POST /api/appointments] rpc error", error);
    return NextResponse.json(
      { error: "Failed to book appointment" },
      { status: 500 },
    );
  }

  const appointmentId = (data as { id?: string } | null)?.id ?? "";

  // Fire-and-forget notification (does not block response)
  sendNotification(
    "booking-received",
    patientEmail,
    {
      patientName,
      doctorName: doctor?.name ?? "Bác sĩ",
      slotStart,
      slotEnd,
      visitReason: visitReason ?? undefined,
    },
    { appointmentId, supabaseServiceClient: supabase },
  ).catch((err) =>
    console.error("[POST /api/appointments] notification error", err),
  );

  return NextResponse.json({ id: appointmentId }, { status: 201 });
}
