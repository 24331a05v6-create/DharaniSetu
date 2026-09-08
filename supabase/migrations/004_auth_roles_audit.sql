-- 004_auth_roles_audit.sql
-- User profiles, audit logs, and government role support

-- ============================================================
-- USER PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'citizen'
    CHECK (role IN ('citizen','revenue_officer','registration_officer','planning_officer','municipal_officer','administrator')),
  department TEXT,
  state_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- NOTE: Do NOT write an admin policy with EXISTS (SELECT ... FROM user_profiles ...)
-- on this same table — a self-referencing policy causes
-- "infinite recursion detected in policy for relation user_profiles".
-- Admin checks must go through the SECURITY DEFINER helper below,
-- which runs as the table owner and bypasses RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'administrator' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

CREATE POLICY "Admins can manage all profiles" ON user_profiles
  FOR ALL USING (public.is_admin());

CREATE POLICY "Public read for active profiles" ON user_profiles
  FOR SELECT USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'administrator')
  );

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- RLS POLICY UPDATES FOR GOVERNMENT ACCESS
-- ============================================================

-- Parcels: government users can manage
DROP POLICY IF EXISTS "Authenticated users can manage parcels" ON parcels;
CREATE POLICY "Government users can manage parcels" ON parcels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','revenue_officer','registration_officer','planning_officer','municipal_officer')
      AND is_active = true
    )
  );

-- Rights records: government users can manage
DROP POLICY IF EXISTS "Authenticated users can manage rights_records" ON rights_records;
CREATE POLICY "Government users can manage rights_records" ON rights_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','revenue_officer')
      AND is_active = true
    )
  );

-- Registration records: registration officers can manage
DROP POLICY IF EXISTS "Authenticated users can manage registration_records" ON registration_records;
CREATE POLICY "Registration officers can manage registration_records" ON registration_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','registration_officer')
      AND is_active = true
    )
  );

-- Planning records: planning officers can manage
DROP POLICY IF EXISTS "Authenticated users can manage planning_records" ON planning_records;
CREATE POLICY "Planning officers can manage planning_records" ON planning_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','planning_officer')
      AND is_active = true
    )
  );

-- Property tax records: municipal officers can manage
DROP POLICY IF EXISTS "Authenticated users can manage property_tax_records" ON property_tax_records;
CREATE POLICY "Municipal officers can manage property_tax_records" ON property_tax_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','municipal_officer')
      AND is_active = true
    )
  );

-- Utility records: municipal officers can manage
DROP POLICY IF EXISTS "Authenticated users can manage utility_records" ON utility_records;
CREATE POLICY "Municipal officers can manage utility_records" ON utility_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','municipal_officer')
      AND is_active = true
    )
  );

-- Encumbrances: revenue and registration officers
DROP POLICY IF EXISTS "Authenticated users can manage encumbrances" ON encumbrances;
CREATE POLICY "Revenue/Registration officers can manage encumbrances" ON encumbrances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','revenue_officer','registration_officer')
      AND is_active = true
    )
  );

-- Building permissions: planning officers
DROP POLICY IF EXISTS "Authenticated users can manage building_permissions" ON building_permissions;
CREATE POLICY "Planning officers can manage building_permissions" ON building_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','planning_officer')
      AND is_active = true
    )
  );

-- Restrictions: government users
DROP POLICY IF EXISTS "Authenticated users can manage restrictions" ON restrictions;
CREATE POLICY "Government users can manage restrictions" ON restrictions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('administrator','revenue_officer','planning_officer')
      AND is_active = true
    )
  );

-- Parcel documents: government users
DROP POLICY IF EXISTS "Authenticated users can manage parcel_documents" ON parcel_documents;
CREATE POLICY "Government users can manage parcel_documents" ON parcel_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
      AND role != 'citizen'
    )
  );

-- Parcel history: government users
DROP POLICY IF EXISTS "Authenticated users can manage parcel_history" ON parcel_history;
CREATE POLICY "Government users can manage parcel_history" ON parcel_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_active = true
      AND role != 'citizen'
    )
  );

-- ============================================================
-- DEMO USER PROFILES (for demonstration)
-- ============================================================

-- These are placeholder records. In production, users would be created via Supabase Auth.
-- For demo, we insert profiles that match the auth.users that would exist after sign-up.

-- Note: In actual deployment, the UUIDs would come from auth.users
-- For demonstration purposes, we provide a function to create demo profiles
CREATE OR REPLACE FUNCTION create_demo_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_department TEXT DEFAULT NULL,
  p_state_code TEXT DEFAULT 'AP'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role, department, state_code)
  VALUES (p_user_id, p_email, p_full_name, p_role, p_department, p_state_code)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
