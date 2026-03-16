import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session (required for Server Components to get latest session)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users away from protected routes
  const isProviderRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isPatientRoute =
    pathname.startsWith("/my-appointments") ||
    pathname.startsWith("/my-profile") ||
    pathname.startsWith("/my-invoices") ||
    pathname.startsWith("/my-dependents");
  const isReceptionistRoute = pathname.startsWith("/receptionist");

  if (
    (isProviderRoute ||
      isAdminRoute ||
      isPatientRoute ||
      isReceptionistRoute) &&
    !user
  ) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For authenticated users on protected routes, verify role
  if (
    user &&
    (isProviderRoute || isAdminRoute || isPatientRoute || isReceptionistRoute)
  ) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    // Deactivated accounts cannot access any protected route
    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/auth/login?error=account_deactivated", request.url),
      );
    }

    // Admin route requires admin role
    if (isAdminRoute && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Provider route requires provider or admin role
    if (
      isProviderRoute &&
      profile?.role !== "provider" &&
      profile?.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Receptionist route requires receptionist role (or admin)
    if (
      isReceptionistRoute &&
      profile?.role !== "receptionist" &&
      profile?.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Patient routes require patient role; redirect others to role-appropriate home
    if (isPatientRoute && profile?.role !== "patient") {
      if (profile?.role === "admin") {
        return NextResponse.redirect(new URL("/admin/schedules", request.url));
      }
      if (profile?.role === "provider") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (profile?.role === "receptionist") {
        return NextResponse.redirect(
          new URL("/receptionist/day-view", request.url),
        );
      }
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Redirect unverified patient accounts to verification pending page
    if (isPatientRoute && profile?.role === "patient") {
      if (!user.email_confirmed_at) {
        const verifyUrl = new URL("/auth/verify-pending", request.url);
        if (user.email) verifyUrl.searchParams.set("email", user.email);
        return NextResponse.redirect(verifyUrl);
      }
    }
  }

  // Add security headers
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options", "DENY");

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     * - API routes (handled inside route handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
