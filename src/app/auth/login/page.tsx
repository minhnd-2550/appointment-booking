"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
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

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("Email hoặc mật khẩu không đúng.");
      return;
    }

    // Fetch role to determine redirect
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .single();

    const role = profile?.role as string | undefined;
    const next = searchParams.get("next");
    const safeNext =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/api")
        ? next
        : null;

    const fallback =
      role === "admin"
        ? "/admin/schedules"
        : role === "receptionist"
          ? "/receptionist/day-view"
          : role === "patient"
            ? "/my-appointments"
            : "/dashboard";

    router.push(safeNext ?? fallback);
  }

  return (
    <main className='min-h-screen bg-slate-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-sm bg-white rounded-xl border border-slate-200 p-8 shadow-sm'>
        <h1 className='text-xl font-bold text-slate-900 mb-1'>Đăng nhập</h1>
        <p className='text-sm text-slate-500 mb-6'>
          Dành cho bác sĩ và quản trị viên
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
            noValidate>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='email'
                      placeholder='bacsi@phongkham.vn'
                      autoComplete='email'
                      aria-required='true'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='password'
                      autoComplete='current-password'
                      aria-required='true'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p
                role='alert'
                className='text-sm text-red-600 bg-red-50 rounded-md px-3 py-2'>
                {serverError}
              </p>
            )}

            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>
        </Form>

        <p className='text-xs text-slate-400 text-center mt-6'>
          <Link href='/' className='hover:underline'>
            ← Quay về trang đặt lịch
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
