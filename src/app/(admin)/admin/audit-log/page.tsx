import { AuditLogTable } from "@/components/admin/AuditLogTable";

export default function AdminAuditLogPage() {
  return (
    <div className='max-w-6xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>Nhật ký hoạt động</h1>
      <AuditLogTable />
    </div>
  );
}
