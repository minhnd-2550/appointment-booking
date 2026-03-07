import { AdminAppointmentSearch } from "@/components/admin/AdminAppointmentSearch";

export default function AdminAppointmentsPage() {
  return (
    <div className='max-w-6xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>Quản lý lịch hẹn</h1>
      <AdminAppointmentSearch />
    </div>
  );
}
