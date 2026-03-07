"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WaitlistButtonProps {
  doctorId: string;
  isAuthenticated: boolean;
  returnUrl?: string;
}

export function WaitlistButton({
  doctorId,
  isAuthenticated,
  returnUrl,
}: WaitlistButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  async function handleJoin() {
    if (!isAuthenticated) {
      const loginUrl = `/auth/login${returnUrl ? `?next=${encodeURIComponent(returnUrl)}` : ""}`;
      router.push(loginUrl);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
      });

      if (res.status === 409) {
        toast.info("Bạn đã đăng ký danh sách chờ cho bác sĩ này rồi");
        setJoined(true);
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Đăng ký thất bại");
      }

      setJoined(true);
      toast.success(
        "Đã đăng ký danh sách chờ thành công! Chúng tôi sẽ thông báo khi có lịch trống.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return (
      <div className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium'>
        ✓ Đã đăng ký danh sách chờ
      </div>
    );
  }

  return (
    <Button variant='outline' onClick={handleJoin} disabled={loading}>
      {loading ? "Đang xử lý..." : "Đăng ký danh sách chờ"}
    </Button>
  );
}
