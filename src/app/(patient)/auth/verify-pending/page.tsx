"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

function VerifyPendingContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function resend() {
    if (!email) return;
    setStatus("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Xác minh email của bạn</CardTitle>
          <CardDescription>
            Tài khoản của bạn chưa được xác minh. Vui lòng kiểm tra hộp thư
            {email && (
              <>
                {" "}
                tại <strong>{email}</strong>
              </>
            )}{" "}
            và nhấp vào link xác minh.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Không nhận được email? Kiểm tra thư mục spam hoặc gửi lại.
          </p>
          {email && (
            <Button
              variant='outline'
              onClick={resend}
              disabled={status === "sending" || status === "sent"}
              className='w-full'>
              {status === "sending"
                ? "Đang gửi…"
                : status === "sent"
                  ? "Đã gửi lại!"
                  : "Gửi lại email xác minh"}
            </Button>
          )}
          {status === "error" && (
            <p role='alert' className='text-sm text-destructive'>
              Gửi lại thất bại. Vui lòng thử lại sau.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Link href='/auth/login' className='text-sm text-primary underline'>
            Quay lại đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyPendingPage() {
  return (
    <Suspense>
      <VerifyPendingContent />
    </Suspense>
  );
}
