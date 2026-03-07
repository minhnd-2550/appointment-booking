import { WalkInBookingForm } from "@/components/receptionist/WalkInBookingForm";

export default function WalkInPage() {
  return (
    <div className='py-4'>
      <h1 className='mb-6 text-2xl font-bold'>Đặt lịch trực tiếp</h1>
      <WalkInBookingForm />
    </div>
  );
}
