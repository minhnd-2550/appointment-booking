"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

interface DoctorData {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  avatar_url: string | null;
}

interface ProfileData {
  biography: string | null;
  qualifications: string | null;
  languages: string[];
  fee_override: number | null;
  photo_url: string | null;
}

interface RatingsData {
  avg: number | null;
  count: number;
  distribution: Record<string, number>;
  topReviews: {
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewerName: string;
  }[];
}

interface Props {
  doctor: DoctorData;
  profile: ProfileData | null;
  ratings: RatingsData;
  nextAvailableDate: string | null;
}

function StarBar({
  rating,
  count,
  total,
}: {
  rating: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className='flex items-center gap-2 text-sm'>
      <span className='w-4 text-slate-600'>{rating}</span>
      <div className='flex-1 bg-slate-200 rounded-full h-2'>
        <div
          className='bg-yellow-400 h-2 rounded-full'
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className='w-6 text-right text-slate-500'>{count}</span>
    </div>
  );
}

export function DoctorProfilePage({
  doctor,
  profile,
  ratings,
  nextAvailableDate,
}: Props) {
  const photo = profile?.photo_url ?? doctor.avatar_url;
  const initials = doctor.name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(-2)
    .join("")
    .toUpperCase();
  const fee = profile?.fee_override ?? null;

  return (
    <main className='page-shell'>
      <header className='sticky top-0 z-30 border-b border-white/50 bg-white/80 backdrop-blur-md'>
        <div className='section-shell flex max-w-5xl items-center gap-3 py-4'>
          <Link
            href='/'
            className='text-sm text-slate-500 transition hover:text-slate-700'>
            ← Danh sách bác sĩ
          </Link>
        </div>
      </header>

      <div className='section-shell max-w-5xl space-y-8 py-8'>
        {/* Top card */}
        <div className='surface-card-strong flex gap-6 p-6'>
          {/* Avatar */}
          <div className='shrink-0'>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={`Ảnh ${doctor.name}`}
                className='h-24 w-24 rounded-full object-cover border border-slate-200'
              />
            ) : (
              <div className='flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-2xl font-bold text-blue-700'>
                {initials}
              </div>
            )}
          </div>

          <div className='flex-1 space-y-2'>
            <h1 className='text-2xl font-bold text-slate-900'>{doctor.name}</h1>
            <Badge variant='secondary'>{doctor.specialty}</Badge>

            {nextAvailableDate && (
              <p className='text-sm text-green-600 font-medium'>
                Lịch gần nhất:{" "}
                {format(parseISO(nextAvailableDate), "EEE, dd/MM/yyyy", {
                  locale: vi,
                })}
              </p>
            )}
            {!nextAvailableDate && (
              <p className='text-sm text-orange-500 font-medium'>
                Không có lịch trống trong 30 ngày tới
              </p>
            )}

            {fee !== null && (
              <p className='text-sm text-slate-700'>
                Phí khám:{" "}
                <span className='font-semibold'>
                  {fee.toLocaleString("vi-VN")} VND
                </span>
              </p>
            )}

            {ratings.avg !== null && (
              <div className='flex items-center gap-1 text-sm'>
                <span className='text-yellow-500'>★</span>
                <span className='font-semibold text-slate-900'>
                  {ratings.avg.toFixed(1)}
                </span>
                <span className='text-slate-500'>
                  ({ratings.count} đánh giá)
                </span>
              </div>
            )}

            <div className='flex flex-wrap gap-3 pt-2'>
              <Button asChild className='rounded-xl'>
                <Link href={`/book/${doctor.id}`}>Đặt lịch khám</Link>
              </Button>
              {!nextAvailableDate && (
                <Button asChild variant='outline' className='rounded-xl'>
                  <Link href={`/book/${doctor.id}/waitlist`}>Đăng ký chờ</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bio & Qualifications */}
        {(profile?.biography || doctor.bio || profile?.qualifications) && (
          <div className='surface-card-strong space-y-4 p-6'>
            {(profile?.biography || doctor.bio) && (
              <div>
                <h2 className='text-base font-semibold text-slate-800 mb-2'>
                  Giới thiệu
                </h2>
                <p className='text-sm text-slate-600 leading-relaxed'>
                  {profile?.biography ?? doctor.bio}
                </p>
              </div>
            )}
            {profile?.qualifications && (
              <div>
                <h2 className='text-base font-semibold text-slate-800 mb-2'>
                  Bằng cấp & Chứng chỉ
                </h2>
                <p className='text-sm text-slate-600 leading-relaxed whitespace-pre-line'>
                  {profile.qualifications}
                </p>
              </div>
            )}
            {profile?.languages && profile.languages.length > 0 && (
              <div>
                <h2 className='text-base font-semibold text-slate-800 mb-2'>
                  Ngôn ngữ
                </h2>
                <div className='flex gap-2 flex-wrap'>
                  {profile.languages.map((lang) => (
                    <Badge key={lang} variant='outline'>
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ratings */}
        {ratings.count > 0 && (
          <div className='surface-card-strong space-y-4 p-6'>
            <h2 className='text-base font-semibold text-slate-800'>
              Đánh giá từ bệnh nhân
            </h2>

            <div className='flex gap-8 items-center'>
              <div className='text-center'>
                <p className='text-4xl font-bold text-slate-900'>
                  {ratings.avg?.toFixed(1)}
                </p>
                <p className='text-sm text-slate-500 mt-1'>
                  {ratings.count} đánh giá
                </p>
              </div>
              <div className='flex-1 space-y-1'>
                {[5, 4, 3, 2, 1].map((n) => (
                  <StarBar
                    key={n}
                    rating={n}
                    count={ratings.distribution[String(n)] ?? 0}
                    total={ratings.count}
                  />
                ))}
              </div>
            </div>

            <div className='space-y-3 border-t border-slate-100 pt-4'>
              {ratings.topReviews.map((r, i) => (
                <div
                  key={i}
                  className='text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='font-medium text-slate-700'>
                      {r.reviewerName}
                    </span>
                    <span className='text-yellow-500'>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    <span className='text-slate-400 text-xs ml-auto'>
                      {format(parseISO(r.createdAt), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </span>
                  </div>
                  {r.comment && <p className='text-slate-600'>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
