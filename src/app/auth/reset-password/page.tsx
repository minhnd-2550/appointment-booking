"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (updateError) {
        setError(
          updateError.message.includes("expired")
            ? "Link đặt lại mật khẩu đã hết hạn. Vui lòng thử lại."
            : updateError.message,
        );
        return;
      }
      await supabase.auth.signOut();
      router.replace("/auth/login?message=password_updated");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Đặt lại mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            {error && (
              <p className='text-sm text-destructive' role='alert'>
                {error}
              </p>
            )}
            <div className='space-y-2'>
              <Label htmlFor='password'>Mật khẩu mới</Label>
              <Input
                id='password'
                type='password'
                autoComplete='new-password'
                {...register("password")}
              />
              {errors.password && (
                <p className='text-sm text-destructive' role='alert'>
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Xác nhận mật khẩu</Label>
              <Input
                id='confirmPassword'
                type='password'
                autoComplete='new-password'
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className='text-sm text-destructive' role='alert'>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
