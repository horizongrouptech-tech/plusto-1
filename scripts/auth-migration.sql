-- ============================================================================
-- Auth Migration: 5-Role System + New Tables
-- Run this manually in Supabase SQL Editor
-- ============================================================================

-- 1. Drop old constraint on role (if exists) and add new 5-value constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Allow the 5 new roles + legacy 'user' value (for backward compat during migration)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'department_manager', 'financial_manager', 'client', 'user'));

-- 2. Migrate existing data: map user_type → role
-- FMs with role='user' → role='financial_manager'
UPDATE profiles
  SET role = 'financial_manager'
  WHERE user_type = 'financial_manager' AND (role = 'user' OR role IS NULL);

-- Regular users → client
UPDATE profiles
  SET role = 'client'
  WHERE user_type = 'regular' AND (role = 'user' OR role IS NULL);

-- Any remaining 'user' role without user_type → client
UPDATE profiles
  SET role = 'client'
  WHERE role = 'user';

-- 3. Set default for new profiles
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'client';

-- 4. Now remove legacy 'user' from constraint (all migrated)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'department_manager', 'financial_manager', 'client'));


-- ============================================================================
-- New Tables
-- ============================================================================

-- pending_approvals — tracks new user approval requests
CREATE TABLE IF NOT EXISTS pending_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  requested_role TEXT DEFAULT 'financial_manager',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- client_assignments — FM ↔ Client mapping
CREATE TABLE IF NOT EXISTS client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  fm_email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_email, fm_email)
);

-- department_assignments — User ↔ Department mapping
CREATE TABLE IF NOT EXISTS department_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  department_id UUID,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_assignments ENABLE ROW LEVEL SECURITY;

-- Admin/super_admin: full access to pending_approvals
CREATE POLICY "admin_manages_approvals" ON pending_approvals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Users see their own pending approval
CREATE POLICY "user_sees_own_approval" ON pending_approvals
  FOR SELECT USING (user_id = auth.uid());

-- Admin manages all client_assignments
CREATE POLICY "admin_manages_client_assignments" ON client_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- FM sees own assignments
CREATE POLICY "fm_sees_own_assignments" ON client_assignments
  FOR SELECT USING (
    fm_email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Admin manages department_assignments
CREATE POLICY "admin_manages_department_assignments" ON department_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Users see own department assignment
CREATE POLICY "user_sees_own_department" ON department_assignments
  FOR SELECT USING (user_id = auth.uid());
