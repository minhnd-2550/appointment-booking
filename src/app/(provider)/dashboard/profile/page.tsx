import { DoctorProfileEditor } from "@/components/dashboard/DoctorProfileEditor";

export default function DoctorProfilePage() {
  return (
    <div className='mx-auto max-w-2xl py-8'>
      <h1 className='mb-6 text-2xl font-bold'>Hồ sơ bác sĩ</h1>
      <DoctorProfileEditor />
    </div>
  );
}
