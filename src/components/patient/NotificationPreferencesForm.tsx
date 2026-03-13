"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Preference {
  eventType: string;
  emailEnabled: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  appointment_confirmed: "Xác nhận lịch hẹn",
  appointment_cancelled: "Hủy lịch hẹn",
  appointment_rescheduled: "Đổi lịch hẹn",
  appointment_reminder: "Nhắc lịch hẹn",
  waitlist_joined: "Đăng ký danh sách chờ",
  waitlist_opportunity: "Có chỗ trống trong danh sách chờ",
  document_uploaded: "Tài liệu mới được tải lên",
};

function NotificationPreferencesInner({ initial }: { initial: Preference[] }) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<Preference[]>(initial);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/patient/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: local }),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Đã lưu cài đặt thông báo");
    },
    onError: () => {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    },
  });

  const toggle = (eventType: string) => {
    setLocal((prev) =>
      prev.map((p) =>
        p.eventType === eventType ? { ...p, emailEnabled: !p.emailEnabled } : p,
      ),
    );
  };

  return (
    <div className='space-y-6'>
      <p className='text-sm text-muted-foreground'>
        Chọn loại thông báo bạn muốn nhận qua email.
      </p>

      <div className='space-y-4 rounded-lg border p-4'>
        {local.map((pref) => (
          <div
            key={pref.eventType}
            className='flex items-center justify-between gap-4'>
            <Label htmlFor={pref.eventType} className='flex-1 cursor-pointer'>
              {EVENT_LABELS[pref.eventType] ?? pref.eventType}
            </Label>
            <Switch
              id={pref.eventType}
              checked={pref.emailEnabled}
              onCheckedChange={() => toggle(pref.eventType)}
            />
          </div>
        ))}
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}>
        {saveMutation.isPending && (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        )}
        Lưu cài đặt
      </Button>
    </div>
  );
}

export function NotificationPreferencesForm() {
  const { data, isLoading } = useQuery<{ preferences: Preference[] }>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/patient/notification-preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
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

  if (!data?.preferences) {
    return (
      <p className='text-sm text-muted-foreground'>
        Không thể tải cài đặt thông báo.
      </p>
    );
  }

  return (
    <NotificationPreferencesInner
      key={JSON.stringify(data.preferences)}
      initial={data.preferences}
    />
  );
}
