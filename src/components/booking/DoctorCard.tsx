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
    <Card className='hover:shadow-md transition-shadow'>
      <CardHeader className='flex flex-row items-center gap-4 pb-2'>
        {/* Avatar */}
        {doctor.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctor.avatar_url}
            alt={`Ảnh bác sĩ ${doctor.name}`}
            className='h-14 w-14 rounded-full object-cover border border-slate-200'
          />
        ) : (
          <div
            aria-hidden='true'
            className='h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-lg select-none'>
            {initials}
          </div>
        )}

        <div className='flex-1 min-w-0'>
          <h4 className='font-semibold text-slate-900 truncate'>
            {doctor.name}
          </h4>
          {doctor.specialty && (
            <Badge variant='secondary' className='mt-1 text-xs'>
              {doctor.specialty}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        {doctor.bio && (
          <p className='text-sm text-slate-600 line-clamp-3 mb-3'>
            {doctor.bio}
          </p>
        )}

        {doctor.nextAvailableDate ? (
          <p className='text-xs text-green-600 font-medium mb-3'>
            Gần nhất:{" "}
            {format(parseISO(doctor.nextAvailableDate), "EEE, dd/MM", {
              locale: vi,
            })}
          </p>
        ) : (
          <p className='text-xs text-orange-500 mb-3'>Không có lịch trống</p>
        )}

        <div className='flex gap-2'>
          <Button asChild className='flex-1' size='sm'>
            <Link href={`/book/${doctor.id}`}>Đặt lịch</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={`/doctors/${doctor.id}`}>Xem hồ sơ</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
