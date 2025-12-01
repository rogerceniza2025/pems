-- Enable Row Level Security (RLS) for all tenant-aware tables
-- This ensures complete tenant isolation at the database level per ADR-004

-- Create authenticated_role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated_role') THEN
        CREATE ROLE authenticated_role;
    END IF;
END $$;

-- Function to check tenant access
CREATE OR REPLACE FUNCTION check_tenant_access(table_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow access if tenant_id matches the current session's tenant
    -- System admins can access all tenants (handled in application layer)
    RETURN table_tenant_id = current_setting('app.current_tenant_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tenant-aware tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserAuthProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NavigationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RFIDTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RFIDAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RFIDDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RFIDScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashTill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TillSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenantSetting" ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
-- Only allow access to tenant's own data

-- Tenant table - System level access
CREATE POLICY "tenant_system_access" ON "Tenant"
    FOR ALL
    TO authenticated_role
    USING (id = current_setting('app.current_tenant_id', true)::UUID OR current_setting('app.is_system_admin', true)::BOOLEAN = true)
    WITH CHECK (id = current_setting('app.current_tenant_id', true)::UUID OR current_setting('app.is_system_admin', true)::BOOLEAN = true);

-- User and related tables
CREATE POLICY "user_tenant_isolation" ON "User"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "user_profile_tenant_isolation" ON "UserProfile"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = user_id AND check_tenant_access(u.tenant_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = user_id AND check_tenant_access(u.tenant_id)
    ));

CREATE POLICY "user_auth_provider_tenant_isolation" ON "UserAuthProvider"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = user_id AND check_tenant_access(u.tenant_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = user_id AND check_tenant_access(u.tenant_id)
    ));

-- Role and Permission tables
CREATE POLICY "role_tenant_isolation" ON "Role"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id) OR tenant_id IS NULL) -- Allow access to global/system roles
    WITH CHECK (check_tenant_access(tenant_id) OR tenant_id IS NULL);

CREATE POLICY "user_role_tenant_isolation" ON "UserRole"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = user_id AND check_tenant_access(u.tenant_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = user_id AND check_tenant_access(u.tenant_id)
    ));

-- Navigation items
CREATE POLICY "navigation_tenant_isolation" ON "NavigationItem"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id) OR tenant_id IS NULL) -- Allow global navigation items
    WITH CHECK (check_tenant_access(tenant_id) OR tenant_id IS NULL);

-- RFID System tables
CREATE POLICY "rfid_tag_tenant_isolation" ON "RFIDTag"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "rfid_device_tenant_isolation" ON "RFIDDevice"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "rfid_scan_tenant_isolation" ON "RFIDScan"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "rfid_assignment_tenant_isolation" ON "RFIDAssignment"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "RFIDTag" t
        WHERE t.id = tag_id AND check_tenant_access(t.tenant_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "RFIDTag" t
        WHERE t.id = tag_id AND check_tenant_access(t.tenant_id)
    ));

-- Accounting and Financial tables
CREATE POLICY "account_tenant_isolation" ON "Account"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "transaction_tenant_isolation" ON "Transaction"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "cash_till_tenant_isolation" ON "CashTill"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "till_session_tenant_isolation" ON "TillSession"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "CashTill" t
        WHERE t.id = till_id AND check_tenant_access(t.tenant_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "CashTill" t
        WHERE t.id = till_id AND check_tenant_access(t.tenant_id)
    ));

CREATE POLICY "receipt_tenant_isolation" ON "Receipt"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

-- Academic tables
CREATE POLICY "student_tenant_isolation" ON "Student"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "course_tenant_isolation" ON "Course"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "enrollment_tenant_isolation" ON "Enrollment"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

-- Tenant Settings
CREATE POLICY "tenant_setting_tenant_isolation" ON "TenantSetting"
    FOR ALL
    TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));

-- Permission table (Global, no tenant filtering)
-- This table contains system-wide permissions that apply across all tenants
CREATE POLICY "permission_global_access" ON "Permission"
    FOR ALL
    TO authenticated_role
    USING (true)
    WITH CHECK (true);

-- RolePermission table access based on role's tenant
CREATE POLICY "role_permission_tenant_isolation" ON "RolePermission"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "Role" r
        WHERE r.id = role_id AND (check_tenant_access(r.tenant_id) OR r.tenant_id IS NULL)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "Role" r
        WHERE r.id = role_id AND (check_tenant_access(r.tenant_id) OR r.tenant_id IS NULL)
    ));

-- CourseSection inherits tenant from Course
CREATE POLICY "course_section_tenant_isolation" ON "CourseSection"
    FOR ALL
    TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "Course" c
        WHERE c.id = course_id AND check_tenant_access(c.tenant_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "Course" c
        WHERE c.id = course_id AND check_tenant_access(c.tenant_id)
    ));

-- Comment to document the RLS implementation
COMMENT ON FUNCTION check_tenant_access IS 'Core tenant isolation function that checks if the user can access data from a specific tenant';
COMMENT ON ROLE authenticated_role IS 'Role for authenticated users with tenant-scoped access';

-- Grant necessary permissions to authenticated_role
GRANT USAGE ON SCHEMA public TO authenticated_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated_role;

-- Ensure future tables also have correct permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated_role;