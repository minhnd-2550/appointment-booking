"use client";

import { Suspense, useState, useEffect } from "react";
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
import {
  getAuthErrorMessage,
  sanitizeRedirectPath,
  resolveRoleDestination,
} from "@/lib/auth";
import type { UserRole } from "@/types/domain";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // T012: Redirect already-authenticated users away from login page
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const next = searchParams.get("next");
      const destination = resolveRoleDestination(
        profile?.role as UserRole | undefined,
      );
      router.replace(sanitizeRedirectPath(next, destination));
    });
  }, [router, searchParams]);

  // T009: Map auth error code from query param to user-facing message
  const errorCode = searchParams.get("error");
  const authError =
    getAuthErrorMessage(errorCode) ??
    (errorCode ? "Đã có lỗi xảy ra. Vui lòng thử lại." : null);

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

    const next = searchParams.get("next");
    const destination = resolveRoleDestination(
      profile?.role as UserRole | undefined,
    );
    router.push(sanitizeRedirectPath(next, destination));
  }

  // T010: Initiate Google OAuth with preserved safe `next` param
  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    const supabase = createClient();
    const next = searchParams.get("next");
    const safeNext = sanitizeRedirectPath(next, "");
    const callbackUrl = `${window.location.origin}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });

    if (error) {
      setServerError("Không thể kết nối Google. Vui lòng thử lại.");
      setIsGoogleLoading(false);
    }
    // On success the browser is redirected — loading state intentionally kept
  }

  return (
    <main className='min-h-screen bg-slate-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-sm bg-white rounded-xl border border-slate-200 p-8 shadow-sm'>
        <h1 className='text-xl font-bold text-slate-900 mb-1'>Đăng nhập</h1>
        <p className='text-sm text-slate-500 mb-6'>
          Dành cho bệnh nhân và nhân viên y tế
        </p>

        {/* T009: Auth error banner from OAuth redirect */}
        {authError && (
          <p
            role='alert'
            className='text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mb-4'>
            {authError}
          </p>
        )}

        {/* T009/T010: Google login CTA */}
        <Button
          type='button'
          variant='outline'
          className='w-full mb-4'
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isSubmitting}>
          {isGoogleLoading ? (
            "Đang chuyển hướng…"
          ) : (
            <>
              <svg
                className='mr-2 h-4 w-4 shrink-0'
                aria-hidden='true'
                viewBox='0 0 24 24'>
                <path
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                  fill='#4285F4'
                />
                <path
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                  fill='#34A853'
                />
                <path
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
                  fill='#FBBC05'
                />
                <path
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                  fill='#EA4335'
                />
              </svg>
              Tiếp tục với Google
            </>
          )}
        </Button>

        <div className='relative mb-4'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t border-slate-200' />
          </div>
          <div className='relative flex justify-center text-xs text-slate-400'>
            <span className='bg-white px-2'>hoặc</span>
          </div>
        </div>

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

            <Button
              type='submit'
              className='w-full'
              disabled={isSubmitting || isGoogleLoading}>
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
