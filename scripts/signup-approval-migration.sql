-- ============================================================================
-- Signup Approval Migration
-- Run this in Supabase SQL Editor
--
-- Purpose: Change signup flow so ALL new users go to PendingApproval
-- instead of InitialSetup. Admin/dept_manager approves and assigns role.
-- ============================================================================

-- 0. Fix role CHECK constraint to include all valid roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'department_manager', 'financial_manager', 'client', 'supplier_user'));

-- 1. Mark all existing active users as approved (backward compat)
-- This prevents existing users from being locked out
UPDATE profiles
SET is_approved_by_admin = true
WHERE is_active = true AND is_approved_by_admin IS NOT TRUE;

-- Also mark all admins/super_admins as approved regardless
UPDATE profiles
SET is_approved_by_admin = true
WHERE role IN ('admin', 'super_admin') AND is_approved_by_admin IS NOT TRUE;

-- 2. Extend handle_new_user trigger to create pending_approvals record
-- NOTE: This replaces the existing trigger function — make sure the current
-- version only does INSERT into profiles. If it does more, merge carefully.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile (existing behavior)
  INSERT INTO public.profiles (id, email, full_name, role, is_approved_by_admin, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client',   -- default role, admin will change on approval
    false,      -- not approved yet
    true        -- skip onboarding since admin handles setup
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create pending_approvals record
  INSERT INTO public.pending_approvals (user_id, email, full_name, requested_role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client',   -- default, admin picks actual role
    'pending'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Add department_manager to pending_approvals RLS policy
-- Drop and recreate the admin policy to include department_manager
DROP POLICY IF EXISTS "admin_manages_approvals" ON pending_approvals;
CREATE POLICY "admin_manages_approvals" ON pending_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'department_manager')
    )
  );

-- 5. Allow admin/super_admin/department_manager to UPDATE other users' profiles
-- This is needed for the UserApproval page to work (direct Supabase update)
DROP POLICY IF EXISTS "admin_updates_profiles" ON profiles;
CREATE POLICY "admin_updates_profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles AS p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'department_manager')
    )
  );

-- 6. Add department_manager to client_assignments RLS policy
DROP POLICY IF EXISTS "admin_manages_client_assignments" ON client_assignments;
CREATE POLICY "admin_manages_client_assignments" ON client_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'department_manager')
    )
  );
