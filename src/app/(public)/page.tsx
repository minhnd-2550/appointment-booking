import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DoctorCard } from "@/components/booking/DoctorCard";
import type { Doctor } from "@/types/domain";
import { addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Đặt lịch khám – Phòng Khám",
  description: "Chọn bác sĩ và đặt lịch khám trực tuyến nhanh chóng, tiện lợi.",
};

/** Find the next calendar date (within 28 days) that matches a set of day-of-week values (0=Sun). */
function getNextAvailableDate(activeDays: Set<number>): string | null {
  if (activeDays.size === 0) return null;
  const today = new Date();
  for (let i = 1; i <= 28; i++) {
    const candidate = addDays(today, i);
    if (activeDays.has(candidate.getDay())) {
      return format(candidate, "yyyy-MM-dd");
    }
  }
  return null;
}

export default async function HomePage() {
  const supabase = await createClient();
  const containerClass = "mx-auto w-full max-w-5xl px-4";

  const [
    { data: doctors, error },
    {
      data: { user },
    },
    { data: schedules },
  ] = await Promise.all([
    supabase.from("doctors").select("*").eq("is_active", true).order("name"),
    supabase.auth.getUser(),
    supabase
      .from("working_schedules")
      .select("doctor_id, day_of_week")
      .eq("is_active", true),
  ]);

  const [
    { count: doctorCount },
    { count: scheduleCount },
    { count: visitCount },
  ] = await Promise.all([
    supabase
      .from("doctors")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("working_schedules")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "completed"]),
  ]);

  // Build map: doctor_id → Set of active day_of_week values
  const scheduleDays = new Map<string, Set<number>>();
  for (const s of schedules ?? []) {
    if (!scheduleDays.has(s.doctor_id))
      scheduleDays.set(s.doctor_id, new Set());
    scheduleDays.get(s.doctor_id)!.add(s.day_of_week);
  }

  // Get role for dashboard link
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  const dashboardHref =
    role === "admin"
      ? "/admin/schedules"
      : role === "provider"
        ? "/dashboard"
        : role === "receptionist"
          ? "/receptionist/day-view"
          : role === "patient"
            ? "/my-appointments"
            : "/dashboard";

  return (
    <main className='page-shell'>
      {/* Header */}
      <header className='sticky top-0 z-30 border-b border-white/50 bg-white/80 backdrop-blur-md'>
        <div
          className={`${containerClass} flex items-center justify-between py-4`}>
          <div>
            <h1 className='text-2xl font-bold heading-gradient'>Phòng Khám</h1>
            <p className='text-sm text-slate-500'>
              Hệ thống đặt lịch trực tuyến
            </p>
          </div>
          {user ? (
            <div className='flex items-center gap-3'>
              <span className='hidden text-sm text-slate-600 md:block'>
                {user.email}
              </span>
              <Link
                href={dashboardHref}
                className='rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100'>
                Vào trang quản lý
              </Link>
              <form action='/auth/signout' method='POST'>
                <button
                  type='submit'
                  className='text-sm text-slate-500 transition hover:text-slate-700'>
                  Đăng xuất
                </button>
              </form>
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <Button asChild variant='ghost'>
                <Link href='/auth/login'>Đăng nhập</Link>
              </Button>
              <Button asChild className='rounded-xl'>
                <Link href='/auth/login'>Đăng ký / Bắt đầu</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className={`${containerClass} py-12 md:py-16`}>
        <div className='surface-card-strong relative grid gap-10 overflow-hidden p-8 md:grid-cols-[1.1fr_.9fr] md:p-10'>
          <div className='absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-200/30 blur-3xl' />
          <div className='absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-violet-200/25 blur-3xl' />

          <div>
            <Badge className='mb-4 rounded-full bg-blue-100 px-3 py-1 text-blue-700 hover:bg-blue-100'>
              Trải nghiệm khám bệnh số hóa
            </Badge>
            <h2 className='text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl'>
              Đặt lịch khám <span className='heading-gradient'>nhanh hơn</span>,
              minh bạch hơn
            </h2>
            <p className='mt-4 max-w-xl text-base text-slate-600 md:text-lg'>
              Chọn bác sĩ phù hợp, theo dõi thời gian trống, quản lý hồ sơ khám,
              hóa đơn và kết quả cận lâm sàng ngay trên một nền tảng duy nhất.
            </p>

            <div className='mt-6 flex flex-wrap gap-3'>
              <Button asChild size='lg' className='rounded-xl'>
                <Link href='#doctors'>Xem bác sĩ và đặt lịch</Link>
              </Button>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='rounded-xl'>
                <Link href='/my-appointments'>Tra cứu lịch hẹn của tôi</Link>
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='rounded-2xl border border-blue-200 bg-blue-50/90 p-5 shadow-sm'>
              <p className='text-sm text-blue-700/80'>Bác sĩ đang hoạt động</p>
              <p className='mt-2 text-3xl font-bold text-blue-900'>
                {doctorCount ?? 0}
              </p>
            </div>
            <div className='rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 shadow-sm'>
              <p className='text-sm text-emerald-700/80'>Ca khám đã phục vụ</p>
              <p className='mt-2 text-3xl font-bold text-emerald-900'>
                {(visitCount ?? 0).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className='rounded-2xl border border-violet-200 bg-violet-50/90 p-5 shadow-sm sm:col-span-2'>
              <p className='text-sm text-violet-700/80'>
                Khung lịch đang cấu hình
              </p>
              <p className='mt-2 text-3xl font-bold text-violet-900'>
                {scheduleCount ?? 0}
              </p>
              <p className='mt-2 text-xs text-violet-700/80'>
                Cập nhật theo thời gian thực để tránh trùng lịch.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${containerClass} pb-6`}>
        <div className='grid gap-4 md:grid-cols-3'>
          {[
            {
              title: "Đặt lịch không chờ đợi",
              desc: "Xem lịch trống theo ngày, chốt lịch chỉ với vài thao tác.",
              style:
                "border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-700",
            },
            {
              title: "Theo dõi hồ sơ điều trị",
              desc: "Xem chẩn đoán, toa thuốc, kết quả cận lâm sàng tập trung.",
              style:
                "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-700",
            },
            {
              title: "Quản trị vận hành tập trung",
              desc: "Báo cáo, cấu hình hệ thống, và kiểm soát theo phân quyền.",
              style:
                "border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-700",
            },
          ].map((item) => (
            <article
              key={item.title}
              className={`rounded-2xl border p-5 shadow-sm ${item.style}`}>
              <h3 className='text-base font-semibold text-slate-900'>
                {item.title}
              </h3>
              <p className='mt-2 text-sm text-slate-600'>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Doctor grid */}
      <section id='doctors' className={`${containerClass} pb-16`}>
        <div className='mb-6 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h3 className='text-2xl font-bold text-slate-900'>
              Đội ngũ bác sĩ
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              Chọn bác sĩ phù hợp chuyên khoa và lịch trống gần nhất.
            </p>
          </div>
          <Button asChild variant='outline' className='rounded-xl'>
            <Link href='/auth/login'>Đăng nhập để quản lý lịch hẹn</Link>
          </Button>
        </div>

        {error && (
          <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600'>
            Không thể tải danh sách bác sĩ. Vui lòng thử lại sau.
          </p>
        )}

        {!error && (!doctors || doctors.length === 0) && (
          <p className='rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500'>
            Hiện chưa có bác sĩ nào hoạt động.
          </p>
        )}

        {!error && doctors && doctors.length > 0 && (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {(doctors as Doctor[]).map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={{
                  ...doctor,
                  nextAvailableDate: getNextAvailableDate(
                    scheduleDays.get(doctor.id) ?? new Set(),
                  ),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
