"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  qualifications: string | null;
  years_of_experience: number | null;
  consultation_fee: number | null;
  accepting_new_patients: boolean;
}

function DoctorProfileForm({ profile }: { profile: DoctorProfile }) {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState(profile.bio ?? "");
  const [qualifications, setQualifications] = useState(
    profile.qualifications ?? "",
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    profile.years_of_experience?.toString() ?? "",
  );
  const [consultationFee, setConsultationFee] = useState(
    profile.consultation_fee?.toString() ?? "",
  );
  const [acceptingNewPatients, setAcceptingNewPatients] = useState(
    profile.accepting_new_patients,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/doctor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio || undefined,
          qualifications: qualifications || undefined,
          yearsOfExperience: yearsOfExperience
            ? parseInt(yearsOfExperience, 10)
            : undefined,
          consultationFee: consultationFee
            ? parseFloat(consultationFee)
            : undefined,
          acceptingNewPatients,
        }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      toast.success("Đã cập nhật hồ sơ");
    },
    onError: () => toast.error("Lưu thất bại. Vui lòng thử lại."),
  });

  return (
    <div className='space-y-6 max-w-xl'>
      <div className='space-y-1'>
        <p className='text-sm text-muted-foreground'>Tên</p>
        <p className='font-semibold'>{profile.name}</p>
      </div>
      <div className='space-y-1'>
        <p className='text-sm text-muted-foreground'>Chuyên khoa</p>
        <p className='font-semibold'>{profile.specialty}</p>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='bio'>Giới thiệu bản thân</Label>
        <textarea
          id='bio'
          rows={4}
          className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder='Giới thiệu kinh nghiệm và phương pháp khám chữa bệnh...'
          maxLength={2000}
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='qualifications'>Bằng cấp / Chứng chỉ</Label>
        <Input
          id='qualifications'
          value={qualifications}
          onChange={(e) => setQualifications(e.target.value)}
          placeholder='VD: Bác sĩ chuyên khoa II, Thạc sĩ Y khoa'
          maxLength={500}
        />
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='exp'>Kinh nghiệm (năm)</Label>
          <Input
            id='exp'
            type='number'
            min={0}
            max={100}
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            placeholder='10'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='fee'>Phí tư vấn (VNĐ)</Label>
          <Input
            id='fee'
            type='number'
            min={0}
            step={1000}
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
            placeholder='200000'
          />
        </div>
      </div>

      <div className='flex items-center justify-between rounded-lg border p-4'>
        <div>
          <Label htmlFor='accepting'>Nhận bệnh nhân mới</Label>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Khi tắt, trang cá nhân của bạn sẽ không cho phép đặt lịch mới
          </p>
        </div>
        <Switch
          id='accepting'
          checked={acceptingNewPatients}
          onCheckedChange={setAcceptingNewPatients}
        />
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}>
        {saveMutation.isPending && (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        )}
        Lưu thay đổi
      </Button>
    </div>
  );
}

export function DoctorProfileEditor() {
  const { data, isLoading } = useQuery<{ profile: DoctorProfile }>({
    queryKey: ["doctor-profile"],
    queryFn: async () => {
      const res = await fetch("/api/doctor/profile");
      if (!res.ok) throw new Error("Không thể tải hồ sơ");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className='flex justify-center py-8'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <p className='text-sm text-muted-foreground'>
        Không thể tải hồ sơ bác sĩ.
      </p>
    );
  }

  return <DoctorProfileForm key={data.profile.id} profile={data.profile} />;
}
