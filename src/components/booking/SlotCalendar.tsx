"use client";

import { useState, useCallback, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, isBefore, startOfToday } from "date-fns";
import { vi } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Doctor, SlotDTO } from "@/types/domain";
import { SlotGrid } from "@/components/booking/SlotGrid";
import { BookingForm } from "@/components/booking/BookingForm";
import "react-day-picker/style.css";

interface SlotCalendarProps {
  doctor: Doctor;
}

const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SlotCalendar({ doctor }: SlotCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<SlotDTO | undefined>(
    undefined,
  );
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch current user (if authenticated)
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: Infinity,
  });

  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const { data: slotsData, isFetching: loadingSlots } = useQuery({
    queryKey: ["slots", doctor.id, dateKey, TIMEZONE],
    queryFn: async () => {
      if (!dateKey) return { slots: [] as SlotDTO[] };
      const res = await fetch(
        `/api/slots?doctorId=${encodeURIComponent(doctor.id)}&date=${dateKey}&timezone=${encodeURIComponent(TIMEZONE)}`,
      );
      if (!res.ok) return { slots: [] as SlotDTO[] };
      return res.json() as Promise<{ slots: SlotDTO[] }>;
    },
    enabled: !!dateKey,
    staleTime: 30_000,
  });

  useEffect(() => {
    // Supabase Realtime — invalidate slot cache when an appointment changes
    const channel = supabase
      .channel(`appointments:doctor:${doctor.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${doctor.id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["slots", doctor.id],
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [doctor.id, queryClient, supabase]);

  const handleDateSelect = useCallback((day: Date | undefined) => {
    setSelectedDate(day);
    setSelectedSlot(undefined);
  }, []);

  const handleSlotSelect = useCallback((slot: SlotDTO) => {
    setSelectedSlot(slot);
  }, []);

  const handleBookingSuccess = useCallback(() => {
    setBookingSuccess(true);
  }, []);

  if (bookingSuccess) {
    return (
      <div className='rounded-2xl border border-green-200 bg-green-50/90 p-8 text-center shadow-sm'>
        <div className='text-3xl mb-3'>✓</div>
        <h2 className='text-xl font-semibold text-green-800 mb-2'>
          Đặt lịch thành công!
        </h2>
        <p className='text-green-700 text-sm'>
          Chúng tôi đã nhận được yêu cầu của bạn. Vui lòng kiểm tra email để xem
          thông tin chi tiết.
        </p>
        <button
          onClick={() => {
            setBookingSuccess(false);
            setSelectedDate(undefined);
            setSelectedSlot(undefined);
          }}
          className='mt-5 text-sm text-green-600 underline hover:no-underline'>
          Đặt lịch khác
        </button>
      </div>
    );
  }

  return (
    <div className='grid gap-8 lg:grid-cols-2'>
      {/* Left: Date picker */}
      <div className='surface-card-strong p-5'>
        <h2 className='text-base font-semibold text-slate-800 mb-4'>
          1. Chọn ngày khám
        </h2>
        <DayPicker
          mode='single'
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={vi}
          disabled={(day) => isBefore(day, startOfToday())}
          footer={
            selectedDate ? (
              <p className='text-xs text-slate-500 mt-2'>
                Đã chọn:{" "}
                {format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi })}
              </p>
            ) : (
              <p className='text-xs text-slate-400 mt-2'>Vui lòng chọn ngày</p>
            )
          }
          classNames={{
            today: "font-bold text-blue-600",
            selected: "bg-blue-600 text-white rounded-md",
          }}
        />

        {/* Slot grid */}
        {selectedDate && (
          <div className='mt-4 border-t border-slate-100 pt-4'>
            <h2 className='text-base font-semibold text-slate-800 mb-3'>
              2. Chọn giờ khám
            </h2>
            <SlotGrid
              slots={slotsData?.slots ?? []}
              loading={loadingSlots}
              selectedSlot={selectedSlot}
              onSlotSelect={handleSlotSelect}
            />
          </div>
        )}
      </div>

      {/* Right: Booking form */}
      <div className='surface-card-strong p-5'>
        <h2 className='text-base font-semibold text-slate-800 mb-4'>
          3. Thông tin bệnh nhân
        </h2>

        {!selectedSlot && (
          <p className='text-sm text-slate-400 italic'>
            Vui lòng chọn ngày và giờ khám trước.
          </p>
        )}

        {selectedSlot && (
          <BookingForm
            doctorId={doctor.id}
            doctorName={doctor.name}
            selectedSlot={selectedSlot}
            onSuccess={handleBookingSuccess}
            onSlotTaken={() => setSelectedSlot(undefined)}
            userId={currentUser?.id}
            isAuthenticated={!!currentUser}
          />
        )}
      </div>
    </div>
  );
}
