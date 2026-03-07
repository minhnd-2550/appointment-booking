"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const schema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const supabase = createClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role: "patient" },
      },
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Kiểm tra email của bạn</CardTitle>
            <CardDescription>
              Chúng tôi đã gửi link xác minh tới email của bạn. Vui lòng kiểm
              tra hộp thư và nhấp vào link để kích hoạt tài khoản.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href='/auth/login' className='text-sm text-primary underline'>
              Quay lại đăng nhập
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Đăng ký tài khoản</CardTitle>
          <CardDescription>
            Tạo tài khoản bệnh nhân để theo dõi lịch hẹn của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
              aria-label='Đăng ký tài khoản'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor='register-email'>Email</FormLabel>
                    <FormControl>
                      <Input
                        id='register-email'
                        type='email'
                        placeholder='ban@example.com'
                        autoComplete='email'
                        aria-describedby='register-email-error'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id='register-email-error' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor='register-password'>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input
                        id='register-password'
                        type='password'
                        placeholder='Tối thiểu 8 ký tự'
                        autoComplete='new-password'
                        aria-describedby='register-password-error'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id='register-password-error' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor='register-confirm'>
                      Xác nhận mật khẩu
                    </FormLabel>
                    <FormControl>
                      <Input
                        id='register-confirm'
                        type='password'
                        placeholder='Nhập lại mật khẩu'
                        autoComplete='new-password'
                        aria-describedby='register-confirm-error'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage id='register-confirm-error' />
                  </FormItem>
                )}
              />
              {serverError && (
                <p role='alert' className='text-sm text-destructive'>
                  {serverError}
                </p>
              )}
              <Button
                type='submit'
                className='w-full'
                disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang đăng ký…" : "Đăng ký"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className='text-sm text-muted-foreground'>
          Đã có tài khoản?{" "}
          <Link href='/auth/login' className='ml-1 text-primary underline'>
            Đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
