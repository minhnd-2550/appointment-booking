"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { format, isBefore, parseISO, startOfToday } from "date-fns";
import { vi } from "date-fns/locale";
import { SlotGrid } from "@/components/booking/SlotGrid";
import { Button } from "@/components/ui/button";
import type { SlotDTO } from "@/types/domain";
import "react-day-picker/style.css";

interface RescheduleAppointmentFormProps {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  currentSlotStart: string;
}

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function RescheduleAppointmentForm({
  appointmentId,
  doctorId,
  doctorName,
  currentSlotStart,
}: RescheduleAppointmentFormProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDTO | undefined>(
    undefined,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = useMemo(
    () => (selectedDate ? format(selectedDate, "yyyy-MM-dd") : null),
    [selectedDate],
  );

  async function loadSlots(nextDate: Date | undefined) {
    setSelectedDate(nextDate);
    setSelectedSlot(undefined);
    setError(null);

    if (!nextDate) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const nextDateKey = format(nextDate, "yyyy-MM-dd");
      const res = await fetch(
        `/api/slots?doctorId=${encodeURIComponent(doctorId)}&date=${nextDateKey}&timezone=${encodeURIComponent(TIMEZONE)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setSlots([]);
        setError("Không thể tải danh sách khung giờ. Vui lòng thử lại.");
        return;
      }
      const json = (await res.json()) as { slots: SlotDTO[] };
      setSlots(json.slots ?? []);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleSubmit() {
    if (!selectedSlot) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patient/appointments/${appointmentId}/reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newSlotStart: selectedSlot.start,
            newSlotEnd: selectedSlot.end,
          }),
        },
      );

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          cutoffHours?: number;
        };
        if (json.error === "CUTOFF_WINDOW") {
          setError(
            `Không thể đổi lịch trong vòng ${json.cutoffHours ?? 24} giờ trước giờ hẹn.`,
          );
        } else if (json.error === "BOOKING_FAILED") {
          setError(
            "Khung giờ vừa được đặt bởi người khác. Vui lòng chọn giờ khác.",
          );
        } else {
          setError("Đổi lịch thất bại. Vui lòng thử lại.");
        }
        return;
      }

      router.push(`/my-appointments/${appointmentId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='grid gap-6 lg:grid-cols-2'>
      <section className='surface-card-strong space-y-4 p-5'>
        <h2 className='text-base font-semibold text-slate-800'>
          1. Chọn ngày mới
        </h2>

        <DayPicker
          mode='single'
          selected={selectedDate}
          onSelect={loadSlots}
          locale={vi}
          disabled={(day) => isBefore(day, startOfToday())}
        />

        {dateKey && (
          <p className='text-xs text-slate-500'>
            Đang xem lịch ngày{" "}
            {format(parseISO(`${dateKey}T00:00:00`), "dd/MM/yyyy")}
          </p>
        )}

        {selectedDate && (
          <div className='border-t border-slate-100 pt-4'>
            <h3 className='mb-3 text-sm font-semibold text-slate-700'>
              2. Chọn giờ mới
            </h3>
            <SlotGrid
              slots={slots}
              loading={loadingSlots}
              selectedSlot={selectedSlot}
              onSlotSelect={setSelectedSlot}
            />
          </div>
        )}
      </section>

      <section className='surface-card-strong space-y-4 p-5'>
        <h2 className='text-base font-semibold text-slate-800'>
          Xác nhận đổi lịch
        </h2>

        <div className='space-y-2 text-sm text-slate-600'>
          <p>
            <span className='font-medium text-slate-800'>Bác sĩ:</span>{" "}
            {doctorName}
          </p>
          <p>
            <span className='font-medium text-slate-800'>Lịch hiện tại:</span>{" "}
            {format(
              parseISO(currentSlotStart),
              "EEEE, dd/MM/yyyy 'lúc' HH:mm",
              {
                locale: vi,
              },
            )}
          </p>
          {selectedSlot && (
            <p>
              <span className='font-medium text-slate-800'>Lịch mới:</span>{" "}
              {format(
                parseISO(selectedSlot.start),
                "EEEE, dd/MM/yyyy 'lúc' HH:mm",
                {
                  locale: vi,
                },
              )}
            </p>
          )}
        </div>

        {error && (
          <p className='rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            {error}
          </p>
        )}

        <div className='flex flex-wrap gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.push(`/my-appointments/${appointmentId}`)}>
            Quay lại
          </Button>
          <Button
            type='button'
            disabled={!selectedSlot || submitting}
            onClick={handleSubmit}>
            {submitting ? "Đang đổi lịch…" : "Xác nhận đổi lịch"}
          </Button>
        </div>
      </section>
    </div>
  );
}
