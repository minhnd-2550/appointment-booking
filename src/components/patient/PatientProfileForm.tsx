"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({
  fullName: z.string().min(1, "Vui lòng nhập họ tên"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PatientProfile {
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface Props {
  initialProfile: PatientProfile | null;
}

export function PatientProfileForm({ initialProfile }: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialProfile?.full_name ?? "",
      dateOfBirth: initialProfile?.date_of_birth ?? "",
      gender: initialProfile?.gender ?? "",
      address: initialProfile?.address ?? "",
      emergencyContactName: initialProfile?.emergency_contact_name ?? "",
      emergencyContactPhone: initialProfile?.emergency_contact_phone ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      toast.success("Hồ sơ đã được cập nhật");
    } catch {
      toast.error("Không thể lưu hồ sơ. Thử lại sau.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='fullName'>Họ tên *</Label>
            <Input id='fullName' {...register("fullName")} />
            {errors.fullName && (
              <p className='text-sm text-destructive'>
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='dateOfBirth'>Ngày sinh</Label>
              <Input
                id='dateOfBirth'
                type='date'
                {...register("dateOfBirth")}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='gender'>Giới tính</Label>
              <Input
                id='gender'
                placeholder='Nam / Nữ / Khác'
                {...register("gender")}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='address'>Địa chỉ</Label>
            <Input id='address' {...register("address")} />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='emergencyContactName'>Liên hệ khẩn cấp</Label>
              <Input
                id='emergencyContactName'
                {...register("emergencyContactName")}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='emergencyContactPhone'>
                Số điện thoại khẩn cấp
              </Label>
              <Input
                id='emergencyContactPhone'
                type='tel'
                {...register("emergencyContactPhone")}
              />
            </div>
          </div>

          <Button type='submit' disabled={isSaving}>
            {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
