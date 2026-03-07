"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isPast } from "date-fns";
import { vi } from "date-fns/locale";
import type { Appointment, AppointmentStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AppointmentWithDoctor = Appointment & {
  doctors: { name: string; specialty: string } | null;
  patient_dependents?: { full_name: string } | null;
};

interface WaitlistEntry {
  id: string;
  doctor_id: string;
  created_at: string;
  status: string;
  doctors: { name: string; specialty: string } | null;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ",
  completed: "Hoàn thành",
  "no-show": "Không đến",
};

const STATUS_VARIANTS: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
  "no-show": "outline",
};

type TabFilter = "all" | "upcoming" | "past" | "waitlist";

interface Props {
  appointments: AppointmentWithDoctor[];
}

export function PatientAppointmentList({ appointments }: Props) {
  const [tab, setTab] = useState<TabFilter>("all");

  const { data: waitlistData } = useQuery({
    queryKey: ["patient-waitlist"],
    queryFn: async () => {
      const res = await fetch("/api/patient/waitlist");
      if (!res.ok) return [];
      const json = (await res.json()) as { data: WaitlistEntry[] };
      return json.data ?? [];
    },
  });

  const waitlistEntries = waitlistData ?? [];

  const filtered = appointments.filter((a) => {
    if (tab === "all") return true;
    const past = isPast(parseISO(a.slot_start));
    return tab === "past" ? past : !past;
  });

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "upcoming", label: "Sắp tới" },
    { key: "past", label: "Đã qua" },
    {
      key: "waitlist",
      label: `Danh sách chờ${waitlistEntries.length > 0 ? ` (${waitlistEntries.length})` : ""}`,
    },
  ];

  return (
    <div>
      {/* Filter tabs */}
      <div className='flex gap-2 mb-4' role='tablist'>
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size='sm'
            role='tab'
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "waitlist" ? (
        waitlistEntries.length === 0 ? (
          <div className='text-center py-16 text-muted-foreground'>
            <p>Bạn chưa đăng ký danh sách chờ nào.</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {waitlistEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4 py-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <span className='font-medium'>
                        {entry.doctors?.name ?? "Bác sĩ"}
                      </span>
                      <Badge variant='secondary'>
                        {entry.doctors?.specialty ?? ""}
                      </Badge>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Đăng ký:{" "}
                      {format(parseISO(entry.created_at), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className='text-center py-16 text-muted-foreground'>
          <p className='mb-4'>Bạn chưa có lịch hẹn nào.</p>
          <Button asChild>
            <Link href='/'>Đặt lịch hẹn đầu tiên</Link>
          </Button>
        </div>
      ) : (
        <div className='space-y-3'>
          {filtered.map((appt) => (
            <Card key={appt.id}>
              <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4 py-4'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='font-medium truncate'>
                      {appt.doctors?.name ?? "Bác sĩ"}
                    </span>
                    <Badge variant={STATUS_VARIANTS[appt.status]}>
                      {STATUS_LABELS[appt.status]}
                    </Badge>
                    {appt.patient_dependents?.full_name && (
                      <Badge variant='outline' className='text-xs'>
                        cho {appt.patient_dependents.full_name}
                      </Badge>
                    )}
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {appt.doctors?.specialty ?? ""}
                  </p>
                  <p className='text-sm mt-1'>
                    {format(
                      parseISO(appt.slot_start),
                      "EEEE, dd/MM/yyyy 'lúc' HH:mm",
                      { locale: vi },
                    )}
                  </p>
                </div>
                <Button variant='outline' size='sm' asChild>
                  <Link href={`/my-appointments/${appt.id}`}>Xem chi tiết</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
