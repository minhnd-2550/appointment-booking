"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    } finally {
      setIsLoading(false);
      // Always show confirmation to prevent email enumeration
      setSubmitted(true);
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Quên mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className='text-sm text-muted-foreground'>
              Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi link
              đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  autoComplete='email'
                  placeholder='you@example.com'
                  {...register("email")}
                />
                {errors.email && (
                  <p className='text-sm text-destructive' role='alert'>
                    {errors.email.message}
                  </p>
                )}
              </div>
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
