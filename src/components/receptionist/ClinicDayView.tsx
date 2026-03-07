"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

interface DayAppointment {
  id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  visit_reason: string | null;
  checked_in_at: string | null;
  patient_name: string | null;
  patient_phone: string | null;
}

interface DoctorGroup {
  doctor: { id: string; name: string; specialty: string };
  appointments: DayAppointment[];
}

interface DayViewResponse {
  date: string;
  doctors: DoctorGroup[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
  "no-show": "Không đến",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  "no-show": "outline",
};

function AppointmentCard({ appt }: { appt: DayAppointment }) {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/receptionist/appointments/${appt.id}/check-in`,
        {
          method: "POST",
        },
      );
      if (!res.ok) throw new Error("Check-in thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-day-view"] });
      toast.success("Đã check-in bệnh nhân");
    },
    onError: () => toast.error("Check-in thất bại"),
  });

  const start = format(parseISO(appt.slot_start), "HH:mm", { locale: vi });
  const end = format(parseISO(appt.slot_end), "HH:mm", { locale: vi });

  return (
    <div className='flex items-center gap-3 rounded-md border px-3 py-2'>
      <div className='min-w-20 text-xs font-mono text-muted-foreground'>
        {start}–{end}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='truncate text-sm font-medium'>
          {appt.patient_name ?? "Bệnh nhân"}
        </p>
        {appt.patient_phone && (
          <p className='text-xs text-muted-foreground'>{appt.patient_phone}</p>
        )}
      </div>
      <div className='flex items-center gap-2'>
        {appt.checked_in_at && (
          <Badge
            variant='outline'
            className='text-xs text-green-600 border-green-300'>
            Đã check-in
          </Badge>
        )}
        <Badge variant={STATUS_VARIANTS[appt.status] ?? "outline"}>
          {STATUS_LABELS[appt.status] ?? appt.status}
        </Badge>
        {!appt.checked_in_at && appt.status === "confirmed" && (
          <Button
            size='sm'
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}>
            {checkInMutation.isPending ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              "Check-in"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ClinicDayView() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const queryClient = useQueryClient();
  const supabase = createClient();

  const { data, isLoading } = useQuery<DayViewResponse>({
    queryKey: ["clinic-day-view", date],
    queryFn: async () => {
      const res = await fetch(`/api/receptionist/day-view?date=${date}`);
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      return res.json();
    },
  });

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel("receptionist-day-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["clinic-day-view", date],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, queryClient, supabase]);

  const doctors = data?.doctors ?? [];
  const totalCount = doctors.reduce((s, d) => s + d.appointments.length, 0);

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-4'>
        <h2 className='text-lg font-semibold'>Lịch của phòng khám</h2>
        <Input
          type='date'
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className='w-40'
        />
        <Badge variant='secondary'>{totalCount} lịch hẹn</Badge>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : doctors.length === 0 ? (
        <p className='py-8 text-center text-muted-foreground'>
          Không có lịch hẹn ngày {format(new Date(date), "dd/MM/yyyy")}
        </p>
      ) : (
        <div className='space-y-4'>
          {doctors.map((group) => (
            <Card key={group.doctor.id}>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  {group.doctor.name}
                  <Badge variant='secondary'>{group.doctor.specialty}</Badge>
                  <span className='ml-auto text-sm font-normal text-muted-foreground'>
                    {group.appointments.length} lịch hẹn
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 pt-0'>
                {group.appointments.map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
