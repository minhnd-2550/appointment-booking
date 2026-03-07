import { DependentList } from "@/components/patient/DependentList";

export default function MyDependentsPage() {
  return (
    <div className='mx-auto max-w-2xl py-8'>
      <h1 className='mb-6 text-2xl font-bold'>Người phụ thuộc của tôi</h1>
      <DependentList />
    </div>
  );
}
