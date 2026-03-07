-- Fix: infinite recursion in user_profiles RLS policies
--
-- Root cause: policies on user_profiles used
--   EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = '...')
-- which re-triggers the same SELECT policy → infinite recursion.
--
-- Solution: a SECURITY DEFINER helper function that reads user_profiles
-- as the function owner (postgres), bypassing RLS entirely.

-- ============================================================
-- 1. Helper: get_my_claim(role_name) — SECURITY DEFINER
--    Returns true when the current JWT user has the given role.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_profiles
  WHERE id = auth.uid()
$$;

-- Convenience shortcuts
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = 'provider', false)
$$;

CREATE OR REPLACE FUNCTION public.is_receptionist()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() = 'receptionist', false)
$$;

-- ============================================================
-- 2. Fix user_profiles policies (the recursive ones)
-- ============================================================
DROP POLICY IF EXISTS "user_profiles_select_own"   ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_admin"  ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_admin"  ON user_profiles;

-- SELECT: own row OR admin (via SECURITY DEFINER — no recursion)
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: only admin (via service role in practice; guard here for completeness)
CREATE POLICY "user_profiles_insert_admin"
  ON user_profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: admin only
CREATE POLICY "user_profiles_update_admin"
  ON user_profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- 3. Fix doctors policies  (also referenced user_profiles directly)
-- ============================================================
DROP POLICY IF EXISTS "doctors_insert_admin"  ON doctors;
DROP POLICY IF EXISTS "doctors_update_admin"  ON doctors;
DROP POLICY IF EXISTS "doctors_delete_admin"  ON doctors;

CREATE POLICY "doctors_insert_admin"
  ON doctors FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "doctors_update_admin"
  ON doctors FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "doctors_delete_admin"
  ON doctors FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- 4. Fix working_schedules policies
-- ============================================================
DROP POLICY IF EXISTS "working_schedules_insert_admin" ON working_schedules;
DROP POLICY IF EXISTS "working_schedules_update_admin" ON working_schedules;
DROP POLICY IF EXISTS "working_schedules_delete_admin" ON working_schedules;

CREATE POLICY "working_schedules_insert_admin"
  ON working_schedules FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "working_schedules_update_admin"
  ON working_schedules FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "working_schedules_delete_admin"
  ON working_schedules FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- 5. Fix blocked_periods policies
-- ============================================================
DROP POLICY IF EXISTS "blocked_periods_insert_admin" ON blocked_periods;
DROP POLICY IF EXISTS "blocked_periods_update_admin" ON blocked_periods;
DROP POLICY IF EXISTS "blocked_periods_delete_admin" ON blocked_periods;

CREATE POLICY "blocked_periods_insert_admin"
  ON blocked_periods FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "blocked_periods_update_admin"
  ON blocked_periods FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "blocked_periods_delete_admin"
  ON blocked_periods FOR DELETE
  USING (public.is_admin());
