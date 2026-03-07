"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export function WalkInBookingForm() {
  const [doctorId, setDoctorId] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [visitReason, setVisitReason] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: doctorsData, isLoading: loadingDoctors } = useQuery<{
    doctors: Doctor[];
  }>({
    queryKey: ["all-doctors-receptionist"],
    queryFn: async () => {
      const res = await fetch("/api/admin/doctors?pageSize=200");
      if (!res.ok) throw new Error("Cannot load doctors");
      return res.json();
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/receptionist/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          slotStart: new Date(slotStart).toISOString(),
          slotEnd: new Date(slotEnd).toISOString(),
          patientName,
          patientPhone: patientPhone || undefined,
          patientEmail: patientEmail || undefined,
          visitReason: visitReason || undefined,
        }),
      });
      if (res.status === 409) throw new Error("Khung giờ này đã có người đặt");
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Đặt lịch thất bại");
      }
    },
    onSuccess: () => {
      setSuccess(true);
      toast.success("Đặt lịch trực tiếp thành công");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (success) {
    return (
      <div className='flex flex-col items-center gap-3 py-12 text-center'>
        <CheckCircle className='h-12 w-12 text-green-500' />
        <p className='text-lg font-semibold'>Đặt lịch thành công!</p>
        <Button
          variant='outline'
          onClick={() => {
            setSuccess(false);
            setPatientName("");
            setPatientPhone("");
            setPatientEmail("");
            setVisitReason("");
            setSlotStart("");
            setSlotEnd("");
          }}>
          Đặt lịch mới
        </Button>
      </div>
    );
  }

  const doctors = doctorsData?.doctors ?? [];
  const isValid = doctorId && slotStart && slotEnd && patientName;

  return (
    <Card className='max-w-lg'>
      <CardHeader>
        <CardTitle>Đặt lịch trực tiếp (Walk-in)</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-1.5'>
          <Label>Bác sĩ *</Label>
          {loadingDoctors ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder='Chọn bác sĩ' />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='slotStart'>Giờ bắt đầu *</Label>
            <Input
              id='slotStart'
              type='datetime-local'
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='slotEnd'>Giờ kết thúc *</Label>
            <Input
              id='slotEnd'
              type='datetime-local'
              value={slotEnd}
              onChange={(e) => setSlotEnd(e.target.value)}
            />
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='patientName'>Tên bệnh nhân *</Label>
          <Input
            id='patientName'
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder='Nguyễn Văn A'
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='phone'>Số điện thoại</Label>
            <Input
              id='phone'
              type='tel'
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder='0912 345 678'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder='email@example.com'
            />
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label htmlFor='reason'>Lý do khám</Label>
          <textarea
            id='reason'
            rows={2}
            className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            value={visitReason}
            onChange={(e) => setVisitReason(e.target.value)}
            placeholder='Mô tả triệu chứng...'
            maxLength={500}
          />
        </div>

        <Button
          className='w-full'
          onClick={() => bookMutation.mutate()}
          disabled={!isValid || bookMutation.isPending}>
          {bookMutation.isPending && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          )}
          Xác nhận đặt lịch
        </Button>
      </CardContent>
    </Card>
  );
}
