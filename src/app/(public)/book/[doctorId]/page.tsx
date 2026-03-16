import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Doctor } from "@/types/domain";
import { SlotCalendar } from "@/components/booking/SlotCalendar";

interface BookPageProps {
  params: Promise<{ doctorId: string }>;
}

export async function generateMetadata({ params }: BookPageProps) {
  const { doctorId } = await params;
  const supabase = await createClient();
  const { data: doctor } = await supabase
    .from("doctors")
    .select("name, specialty")
    .eq("id", doctorId)
    .eq("is_active", true)
    .single();

  if (!doctor) return { title: "Không tìm thấy bác sĩ" };

  return {
    title: `Đặt lịch với ${doctor.name} – Phòng Khám`,
    description: doctor.specialty
      ? `Đặt lịch khám với ${doctor.name} – Chuyên khoa ${doctor.specialty}`
      : `Đặt lịch khám với ${doctor.name}`,
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { doctorId } = await params;
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", doctorId)
    .eq("is_active", true)
    .single();

  if (!doctor) notFound();

  return (
    <main className='page-shell'>
      <header className='sticky top-0 z-30 border-b border-white/50 bg-white/80 backdrop-blur-md'>
        <div className='section-shell-5 flex items-center gap-4 py-4'>
          <Link
            href='/'
            className='text-sm text-slate-500 transition hover:text-slate-700'
            aria-label='Quay về trang chủ'>
            ← Trang chủ
          </Link>
          <span className='text-slate-300'>|</span>
          <span className='text-sm font-medium text-slate-800'>
            Đặt lịch khám
          </span>
        </div>
      </header>

      <div className='section-shell-5 py-10'>
        {/* Doctor summary */}
        <div className='surface-card-strong mb-8 flex items-center gap-5 p-6'>
          {(doctor as Doctor).avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(doctor as Doctor).avatar_url ?? ""}
              alt={`Ảnh bác sĩ ${(doctor as Doctor).name}`}
              className='h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover'
            />
          ) : (
            <div
              aria-hidden='true'
              className='flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-xl font-semibold text-blue-700'>
              {(doctor as Doctor).name
                .split(" ")
                .map((p) => p[0] ?? "")
                .slice(-2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div>
            <h1 className='text-xl font-bold text-slate-900'>
              {(doctor as Doctor).name}
            </h1>
            {(doctor as Doctor).specialty && (
              <p className='mt-0.5 text-sm text-slate-500'>
                Chuyên khoa: {(doctor as Doctor).specialty}
              </p>
            )}
            <p className='mt-2 text-sm text-slate-600'>
              Chọn ngày và khung giờ phù hợp để hoàn tất yêu cầu đặt lịch.
            </p>
          </div>
        </div>

        {/* Slot calendar + booking form */}
        <SlotCalendar doctor={doctor as Doctor} />
      </div>
    </main>
  );
}
