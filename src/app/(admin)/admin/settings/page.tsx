import { SystemSettingsPanel } from "@/components/admin/SystemSettingsPanel";

export default function AdminSettingsPage() {
  return (
    <div className='max-w-3xl mx-auto p-6'>
      <h1 className='text-2xl font-bold mb-6'>Cài đặt hệ thống</h1>
      <SystemSettingsPanel />
    </div>
  );
}
