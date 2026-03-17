"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doctor } from "@/types/domain";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

interface DoctorCardProps {
  doctor: Doctor & { nextAvailableDate?: string | null };
}

export function DoctorCard({ doctor }: DoctorCardProps) {
  const initials = doctor.name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(-2)
    .join("")
    .toUpperCase();

  return (
    <Card className='group overflow-hidden rounded-2xl border-white/70 bg-white/85 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10 flex justify-between'>
      <CardHeader className='flex flex-row items-center gap-4 pb-2'>
        {/* Avatar */}
        {doctor.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctor.avatar_url}
            alt={`Ảnh bác sĩ ${doctor.name}`}
            className='h-14 w-14 rounded-full border border-slate-200 object-cover'
          />
        ) : (
          <div
            aria-hidden='true'
            className='flex h-14 w-14 select-none items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-lg font-semibold text-blue-700'>
            {initials}
          </div>
        )}

        <div className='flex-1 min-w-0'>
          <h4 className='truncate text-base font-semibold text-slate-900'>
            {doctor.name}
          </h4>
          {doctor.specialty && (
            <Badge variant='secondary' className='mt-1 rounded-full text-xs'>
              {doctor.specialty}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        {doctor.bio && (
          <p className='mb-3 line-clamp-3 text-sm leading-relaxed text-slate-600'>
            {doctor.bio}
          </p>
        )}

        {doctor.nextAvailableDate ? (
          <p className='mb-3 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700'>
            Gần nhất:{" "}
            {format(parseISO(doctor.nextAvailableDate), "EEE, dd/MM", {
              locale: vi,
            })}
          </p>
        ) : (
          <p className='mb-3 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs text-orange-600'>
            Không có lịch trống
          </p>
        )}

        <div className='flex gap-2'>
          <Button asChild className='flex-1 rounded-xl' size='sm'>
            <Link href={`/book/${doctor.id}`}>Đặt lịch</Link>
          </Button>
          <Button asChild variant='outline' size='sm' className='rounded-xl'>
            <Link href={`/doctors/${doctor.id}`}>Xem hồ sơ</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
