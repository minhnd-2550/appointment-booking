import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveRoleDestination, sanitizeRedirectPath } from "@/lib/auth";
import type { UserRole } from "@/types/domain";

/**
 * GET /auth/callback
 *
 * This Route Handler is called by Supabase after OAuth or magic-link authentication.
 * It exchanges the one-time `code` for a session, then redirects the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? null;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] error exchanging code", error.message);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  // Fetch role for redirect decision
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  // T011/T013: Use canonical role resolver — patient → /my-appointments
  const role = profile?.role as UserRole | undefined;
  const roleDestination = resolveRoleDestination(role);
  const destination = sanitizeRedirectPath(next, roleDestination);

  return NextResponse.redirect(`${origin}${destination}`);
}
