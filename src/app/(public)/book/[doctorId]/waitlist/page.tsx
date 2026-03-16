import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WaitlistButton } from "@/components/booking/WaitlistButton";

interface WaitlistPageProps {
  params: Promise<{ doctorId: string }>;
}

export default async function WaitlistPage({ params }: WaitlistPageProps) {
  const { doctorId } = await params;
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, name, specialty, is_active")
    .eq("id", doctorId)
    .eq("is_active", true)
    .single();

  if (!doctor) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  const isPatient = role === "patient";

  return (
    <main className='page-shell'>
      <div className='section-shell-5 py-10'>
        <div className='mx-auto w-full max-w-2xl space-y-6'>
          <Link
            href={`/doctors/${doctor.id}`}
            className='inline-block text-sm text-slate-500 transition hover:text-slate-700'>
            ← Quay về hồ sơ bác sĩ
          </Link>

          <section className='surface-card-strong space-y-4 p-6'>
            <h1 className='text-2xl font-bold text-slate-900'>
              Danh sách chờ bác sĩ {doctor.name}
            </h1>
            <p className='text-sm text-slate-600'>
              Chuyên khoa:{" "}
              <span className='font-medium'>{doctor.specialty}</span>
            </p>
            <p className='text-sm text-slate-600'>
              Nếu chưa có lịch trống phù hợp, bạn có thể đăng ký danh sách chờ
              để nhận thông báo ngay khi có suất khám mới.
            </p>

            {!user && (
              <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
                Vui lòng đăng nhập tài khoản bệnh nhân để đăng ký danh sách chờ.
              </p>
            )}

            {user && !isPatient && (
              <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
                Chức năng này chỉ dành cho tài khoản bệnh nhân.
              </p>
            )}

            {(isPatient || !user) && (
              <WaitlistButton
                doctorId={doctor.id}
                isAuthenticated={!!user}
                returnUrl={`/book/${doctor.id}/waitlist`}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
