import { createClient } from "@/lib/supabase/server";
import { PatientProfileForm } from "@/components/patient/PatientProfileForm";
import { MedicalBackgroundList } from "@/components/patient/MedicalBackgroundList";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: medicalBg }] = await Promise.all([
    supabase
      .from("patient_profiles")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .single(),
    supabase
      .from("patient_medical_backgrounds")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .order("added_at", { ascending: false }),
  ]);

  return (
    <div className='mx-auto w-full max-w-2xl space-y-8 py-6'>
      <h1 className='text-2xl font-bold'>Hồ sơ của tôi</h1>
      <PatientProfileForm initialProfile={profile ?? null} />
      <MedicalBackgroundList
        initialEntries={
          (medicalBg ?? []) as Array<{
            id: string;
            entry_type: "allergy" | "chronic_condition";
            description: string;
          }>
        }
      />
    </div>
  );
}
