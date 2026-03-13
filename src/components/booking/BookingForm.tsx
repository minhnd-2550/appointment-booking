"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SlotDTO } from "@/types/domain";

interface Dependent {
  id: string;
  full_name: string;
  relationship: string;
}

const bookingSchema = z.object({
  patientName: z.string().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
  patientEmail: z.string().email("Email không hợp lệ"),
  patientPhone: z
    .string()
    .regex(/^[+\d\s\-()]{7,20}$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
  visitReason: z.string().max(500).optional(),
});

const doctorIdSchema = z.string().uuid();

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  doctorId: string;
  doctorName: string;
  selectedSlot: SlotDTO;
  onSuccess: () => void;
  onSlotTaken: () => void;
  isAuthenticated?: boolean;
  userId?: string;
}

export function BookingForm({
  doctorId,
  selectedSlot,
  onSuccess,
  onSlotTaken,
  isAuthenticated,
  userId,
}: BookingFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [bookingFor, setBookingFor] = useState<"self" | "dependent">("self");
  const [selectedDependentId, setSelectedDependentId] = useState<string>("");

  const { data: dependentsData } = useQuery<{ dependents: Dependent[] }>({
    queryKey: ["patient-dependents"],
    queryFn: async () => {
      const res = await fetch("/api/patient/dependents");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!isAuthenticated,
  });

  const dependents = dependentsData?.dependents ?? [];

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      patientName: "",
      patientEmail: "",
      patientPhone: "",
      visitReason: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: BookingFormValues) {
    setServerError(null);

    const doctorIdCheck = doctorIdSchema.safeParse(doctorId);
    if (!doctorIdCheck.success) {
      setServerError(
        "ID bác sĩ không hợp lệ. Vui lòng tải lại trang và chọn bác sĩ lại.",
      );
      console.error("[BookingForm] invalid doctorId", { doctorId });
      return;
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctorId.trim(),
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          patientName: values.patientName,
          patientEmail: values.patientEmail,
          patientPhone: values.patientPhone || undefined,
          visitReason: values.visitReason || undefined,
          userId: userId && bookingFor === "self" ? userId : undefined,
          dependentId:
            userId && bookingFor === "dependent" && selectedDependentId
              ? selectedDependentId
              : undefined,
        }),
      });

      if (res.status === 409) {
        setServerError(
          "Khung giờ này vừa được đặt bởi người khác. Vui lòng chọn giờ khác.",
        );
        onSlotTaken();
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as {
          error?: string;
          details?: { fieldErrors?: Record<string, string[]> };
          doctorIdReceived?: unknown;
        };

        if (data?.details?.fieldErrors?.doctorId?.length) {
          setServerError(
            `ID bác sĩ gửi lên không hợp lệ (${String(data.doctorIdReceived ?? "unknown")}). Vui lòng tải lại trang và thử lại.`,
          );
        } else {
          setServerError(data.error ?? "Đặt lịch thất bại. Vui lòng thử lại.");
        }
        return;
      }

      onSuccess();
    } catch {
      setServerError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    }
  }

  const slotLabel = format(
    parseISO(selectedSlot.start),
    "EEEE, dd/MM/yyyy 'lúc' HH:mm",
    {
      locale: vi,
    },
  );

  return (
    <Form {...form}>
      {/* Selected slot display */}
      <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-800'>
        <span className='font-medium'>Khung giờ đã chọn:</span> {slotLabel}
      </div>

      {/* Booking for — only shown if authenticated with dependents */}
      {isAuthenticated && dependents.length > 0 && (
        <div className='mb-4 space-y-2'>
          <p className='text-sm font-medium'>Đặt lịch cho</p>
          <RadioGroup
            value={bookingFor}
            onValueChange={(v) => setBookingFor(v as "self" | "dependent")}
            className='flex gap-4'>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='self' id='bookFor-self' />
              <Label htmlFor='bookFor-self'>Bản thân</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='dependent' id='bookFor-dependent' />
              <Label htmlFor='bookFor-dependent'>Người phụ thuộc</Label>
            </div>
          </RadioGroup>

          {bookingFor === "dependent" && (
            <Select
              value={selectedDependentId}
              onValueChange={setSelectedDependentId}>
              <SelectTrigger>
                <SelectValue placeholder='Chọn người phụ thuộc' />
              </SelectTrigger>
              <SelectContent>
                {dependents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name} ({d.relationship})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4'
        noValidate>
        {/* Patient Name */}
        <FormField
          control={form.control}
          name='patientName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Họ và tên{" "}
                <span aria-hidden='true' className='text-red-500'>
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder='Nguyễn Văn A'
                  autoComplete='name'
                  aria-required='true'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name='patientEmail'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Email{" "}
                <span aria-hidden='true' className='text-red-500'>
                  *
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type='email'
                  placeholder='email@example.com'
                  autoComplete='email'
                  aria-required='true'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name='patientPhone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Số điện thoại</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type='tel'
                  placeholder='0912 345 678'
                  autoComplete='tel'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Visit reason */}
        <FormField
          control={form.control}
          name='visitReason'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lý do khám</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={3}
                  placeholder='Mô tả triệu chứng hoặc vấn đề sức khỏe...'
                  className='flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  id='visitReason'
                  aria-describedby={
                    form.formState.errors.visitReason
                      ? "visitReason-error"
                      : undefined
                  }
                />
              </FormControl>
              <FormMessage id='visitReason-error' />
            </FormItem>
          )}
        />

        {/* Server-level error */}
        {serverError && (
          <p
            role='alert'
            className='text-sm text-red-600 bg-red-50 rounded-md px-3 py-2'>
            {serverError}
          </p>
        )}

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting ? "Đang đặt lịch…" : "Xác nhận đặt lịch"}
        </Button>
      </form>
    </Form>
  );
}
