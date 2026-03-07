"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

interface TodayAppointment {
  id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  visit_reason: string | null;
  patients: { full_name: string; phone?: string } | null;
  patient_dependents: { full_name: string } | null;
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

function AppointmentRow({ appt }: { appt: TodayAppointment }) {
  const queryClient = useQueryClient();

  const changeMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await fetch(`/api/doctor/appointments/${appt.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-today"] });
      toast.success("Cập nhật trạng thái thành công");
    },
    onError: () => toast.error("Cập nhật thất bại"),
  });

  const start = format(parseISO(appt.slot_start), "HH:mm", { locale: vi });
  const end = format(parseISO(appt.slot_end), "HH:mm", { locale: vi });
  const patientName =
    appt.patient_dependents?.full_name ??
    appt.patients?.full_name ??
    "Bệnh nhân";

  return (
    <Card>
      <CardContent className='flex flex-col sm:flex-row sm:items-center gap-3 py-4'>
        <div className='min-w-24 text-sm font-mono font-medium text-muted-foreground'>
          {start} – {end}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-0.5'>
            <span className='font-medium'>{patientName}</span>
            <Badge variant={STATUS_VARIANTS[appt.status] ?? "outline"}>
              {STATUS_LABELS[appt.status] ?? appt.status}
            </Badge>
          </div>
          {appt.visit_reason && (
            <p className='text-xs text-muted-foreground truncate'>
              {appt.visit_reason}
            </p>
          )}
        </div>
        <div className='flex gap-2 flex-wrap'>
          {appt.status === "confirmed" && (
            <>
              <Button
                size='sm'
                variant='outline'
                onClick={() => changeMutation.mutate("completed")}
                disabled={changeMutation.isPending}>
                Hoàn thành
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='text-destructive hover:bg-destructive/10'
                onClick={() => changeMutation.mutate("no-show")}
                disabled={changeMutation.isPending}>
                Không đến
              </Button>
            </>
          )}
          <Button size='sm' variant='ghost' asChild>
            <a
              href={`/api/doctor/appointments/${appt.id}/prescription-pdf`}
              target='_blank'
              rel='noreferrer'>
              Toa thuốc
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TodaySchedule() {
  const [date] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery<{ appointments: TodayAppointment[] }>({
    queryKey: ["doctor-today", date],
    queryFn: async () => {
      const res = await fetch(`/api/doctor/schedule/today?date=${date}`);
      if (!res.ok) throw new Error("Không thể tải lịch hẹn");
      return res.json();
    },
    refetchInterval: 60_000, // refresh every minute
  });

  const appointments = data?.appointments ?? [];

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>
          Lịch hẹn hôm nay —{" "}
          {format(new Date(date), "EEEE, dd/MM/yyyy", { locale: vi })}
        </h2>
        <Badge variant='secondary'>{appointments.length} lịch hẹn</Badge>
      </div>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : appointments.length === 0 ? (
        <p className='py-8 text-center text-muted-foreground'>
          Không có lịch hẹn hôm nay
        </p>
      ) : (
        <div className='space-y-3'>
          {appointments.map((a) => (
            <AppointmentRow key={a.id} appt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
