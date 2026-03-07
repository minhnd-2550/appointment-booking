import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PatientHistoryView } from "@/components/dashboard/PatientHistoryView";

interface Props {
  params: Promise<{ patientId: string }>;
}

export default async function PatientHistoryPage({ params }: Props) {
  const { patientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Resolve doctor
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, name")
    .eq("email", user.email ?? "")
    .single();

  if (!doctor) notFound();

  // Load appointment history for this patient with this doctor
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `id, slot_start, slot_end, status, visit_reason,
       medical_records(id, diagnosis, examination_notes,
         prescription_items(id, medication_name, dosage, frequency, duration, notes)
       ),
       lab_orders(id, test_name, type, status)`,
    )
    .eq("doctor_id", doctor.id)
    .eq("user_id", patientId)
    .order("slot_start", { ascending: false });

  if (!appointments || appointments.length === 0) notFound();

  // Load patient profile
  const { data: patientProfile } = await supabase
    .from("patient_profiles")
    .select("full_name, date_of_birth, gender")
    .eq("user_id", patientId)
    .single();

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Link
          href='/dashboard/patients'
          className='text-sm text-muted-foreground hover:text-foreground'>
          ← Danh sách bệnh nhân
        </Link>
        <h1 className='text-2xl font-bold'>
          {patientProfile?.full_name ?? "Bệnh nhân"}
        </h1>
      </div>

      <PatientHistoryView
        patientId={patientId}
        patientProfile={patientProfile ?? null}
        appointments={
          (appointments ?? []).map((a) => ({
            ...a,
            medical_records: a.medical_records
              ? Array.isArray(a.medical_records)
                ? a.medical_records
                : [a.medical_records]
              : [],
            lab_orders: a.lab_orders ?? [],
          })) as Parameters<typeof PatientHistoryView>[0]["appointments"]
        }
        doctorId={doctor.id}
      />
    </div>
  );
}
