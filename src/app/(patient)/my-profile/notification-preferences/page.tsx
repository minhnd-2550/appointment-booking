import { NotificationPreferencesForm } from "@/components/patient/NotificationPreferencesForm";

export default function NotificationPreferencesPage() {
  return (
    <div className='mx-auto w-full max-w-lg py-6'>
      <h1 className='mb-6 text-2xl font-bold'>Cài đặt thông báo</h1>
      <NotificationPreferencesForm />
    </div>
  );
}
