"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import type { Appointment, AppointmentStatus } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AppointmentRowProps {
  appointment: Appointment;
  onStatusChange: (id: string, newStatus: AppointmentStatus) => void;
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

export function AppointmentRow({
  appointment,
  onStatusChange,
}: AppointmentRowProps) {
  const [loading, setLoading] = useState<
    "confirm" | "cancel" | "complete" | null
  >(null);

  const slotLabel = format(
    parseISO(appointment.slot_start),
    "EEEE, dd/MM/yyyy 'lúc' HH:mm",
    { locale: vi },
  );

  async function handleAction(newStatus: "confirmed" | "cancelled") {
    setLoading(newStatus === "confirmed" ? "confirm" : "cancel");
    // Optimistic update
    onStatusChange(appointment.id, newStatus);

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Revert on error
        onStatusChange(appointment.id, appointment.status);
        console.error(
          "[AppointmentRow] status update failed",
          await res.json(),
        );
      }
    } catch (err) {
      onStatusChange(appointment.id, appointment.status);
      console.error("[AppointmentRow] network error", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleComplete() {
    setLoading("complete");
    onStatusChange(appointment.id, "completed"); // optimistic
    try {
      const res = await fetch(
        `/api/doctor/appointments/${appointment.id}/complete`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        onStatusChange(appointment.id, appointment.status);
        console.error("[AppointmentRow] complete failed", await res.json());
      }
    } catch (err) {
      onStatusChange(appointment.id, appointment.status);
      console.error("[AppointmentRow] network error on complete", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <CardContent className='flex flex-col sm:flex-row sm:items-center gap-4 py-4'>
        {/* Left: info */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <span className='font-medium text-slate-900 truncate'>
              {appointment.patient_name}
            </span>
            <Badge variant={STATUS_VARIANTS[appointment.status]}>
              {STATUS_LABELS[appointment.status]}
            </Badge>
          </div>
          <p className='text-sm text-slate-500'>{slotLabel}</p>
          {appointment.patient_email && (
            <p className='text-xs text-slate-400 mt-0.5'>
              {appointment.patient_email}
            </p>
          )}
          {appointment.visit_reason && (
            <p className='text-xs text-slate-500 mt-1 italic'>
              {appointment.visit_reason}
            </p>
          )}
        </div>

        {/* Right: actions */}
        <div className='flex gap-2 shrink-0'>
          {appointment.status === "pending" && (
            <Button
              size='sm'
              onClick={() => handleAction("confirmed")}
              disabled={!!loading}
              aria-label={`Xác nhận lịch hẹn của ${appointment.patient_name}`}>
              {loading === "confirm" ? "Đang xử lý…" : "Xác nhận"}
            </Button>
          )}

          {(appointment.status === "pending" ||
            appointment.status === "confirmed") && (
            <Button
              size='sm'
              variant='destructive'
              onClick={() => handleAction("cancelled")}
              disabled={!!loading}
              aria-label={`Huỷ lịch hẹn của ${appointment.patient_name}`}>
              {loading === "cancel" ? "Đang xử lý…" : "Huỷ"}
            </Button>
          )}

          {appointment.status === "confirmed" && (
            <Button
              size='sm'
              variant='outline'
              onClick={handleComplete}
              disabled={!!loading}
              aria-label={`Đánh dấu hoàn thành lịch hẹn của ${appointment.patient_name}`}>
              {loading === "complete" ? "Đang xử lý…" : "Hoàn thành"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
