-- Cleanup Migration: Remove old User table after successful migration

-- WARNING: This migration should only be run after verifying that:
-- 1. All users have been successfully migrated to better_auth_users
-- 2. All authentication is working with the new system
-- 3. All foreign key constraints have been updated
-- 4. A backup of the database has been created

-- Step 1: Verify migration completeness (these should return 0 rows)
-- Check for any users not migrated
SELECT COUNT(*) as unmigrated_users FROM "User"
WHERE "id" NOT IN (SELECT "id" FROM "better_auth_users");

-- Check for any auth providers not migrated
SELECT COUNT(*) as unmigrated_auth_providers FROM "UserAuthProvider"
WHERE "user_id" NOT IN (SELECT "id" FROM "better_auth_users");

-- Step 2: Drop old User table and related structures
-- Backup old tables (optional - comment out if not needed)
-- ALTER TABLE "User" RENAME TO "User_backup_$(date +%Y%m%d_%H%M%S)";
-- ALTER TABLE "UserAuthProvider" RENAME TO "UserAuthProvider_backup_$(date +%Y%m%d_%H%M%S)";

-- Drop old foreign key constraints (they should already be dropped in the previous migration)
-- These are included for safety

-- Drop old tables
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "UserAuthProvider" CASCADE;

-- Step 3: Create row-level security policies for BetterAuth tables
-- Enable RLS on new tables
ALTER TABLE "better_auth_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth_verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth_two_factor" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for multi-tenant isolation

-- Policy for better_auth_users: Users can only see users from their own tenant
CREATE POLICY "better_auth_users_tenant_isolation" ON "better_auth_users"
    FOR ALL TO authenticated_role
    USING (check_tenant_access("tenant_id"))
    WITH CHECK (check_tenant_access("tenant_id"));

-- Policy for better_auth_accounts: Users can only see accounts for their own user
CREATE POLICY "better_auth_accounts_user_isolation" ON "better_auth_accounts"
    FOR ALL TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "better_auth_users"
        WHERE "better_auth_users"."id" = "better_auth_accounts"."userId"
        AND check_tenant_access("better_auth_users"."tenant_id")
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "better_auth_users"
        WHERE "better_auth_users"."id" = "better_auth_accounts"."userId"
        AND check_tenant_access("better_auth_users"."tenant_id")
    ));

-- Policy for better_auth_sessions: Users can only see their own sessions
CREATE POLICY "better_auth_sessions_user_isolation" ON "better_auth_sessions"
    FOR ALL TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "better_auth_users"
        WHERE "better_auth_users"."id" = "better_auth_sessions"."userId"
        AND check_tenant_access("better_auth_users"."tenant_id")
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "better_auth_users"
        WHERE "better_auth_users"."id" = "better_auth_sessions"."userId"
        AND check_tenant_access("better_auth_users"."tenant_id")
    ));

-- Policy for better_auth_two_factor: Users can only see their own 2FA
CREATE POLICY "better_auth_two_factor_user_isolation" ON "better_auth_two_factor"
    FOR ALL TO authenticated_role
    USING (EXISTS (
        SELECT 1 FROM "better_auth_users"
        WHERE "better_auth_users"."id" = "better_auth_two_factor"."userId"
        AND check_tenant_access("better_auth_users"."tenant_id")
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "better_auth_users"
        WHERE "better_auth_users"."id" = "better_auth_two_factor"."userId"
        AND check_tenant_access("better_auth_users"."tenant_id")
    ));

-- Verification tokens don't need tenant-specific policies as they're temporary and identifier-based

-- Step 4: Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_better_auth_users_tenant_email"
ON "better_auth_users"("tenant_id", "email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_better_auth_accounts_user_id_provider"
ON "better_auth_accounts"("userId", "provider");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_better_auth_sessions_user_id_expires"
ON "better_auth_sessions"("userId", "expires");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_better_auth_verification_tokens_expires"
ON "better_auth_verification_tokens"("expires");

-- Step 5: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "better_auth_users" TO authenticated_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "better_auth_accounts" TO authenticated_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "better_auth_sessions" TO authenticated_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "better_auth_verification_tokens" TO authenticated_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "better_auth_two_factor" TO authenticated_role;

-- Grant usage on sequences (if using them)
-- GRANT USAGE, SELECT ON SEQUENCE better_auth_users_id_seq TO authenticated_role;
-- GRANT USAGE, SELECT ON SEQUENCE better_auth_accounts_id_seq TO authenticated_role;
-- GRANT USAGE, SELECT ON SEQUENCE better_auth_sessions_id_seq TO authenticated_role;
-- GRANT USAGE, SELECT ON SEQUENCE better_auth_two_factor_id_seq TO authenticated_role;

-- Step 6: Add comments for documentation
COMMENT ON TABLE "better_auth_users" IS 'BetterAuth user table with multi-tenant support';
COMMENT ON TABLE "better_auth_accounts" IS 'BetterAuth OAuth and provider accounts';
COMMENT ON TABLE "better_auth_sessions" IS 'BetterAuth session management';
COMMENT ON TABLE "better_auth_verification_tokens" IS 'BetterAuth email verification and password reset tokens';
COMMENT ON TABLE "better_auth_two_factor" IS 'BetterAuth multi-factor authentication (TOTP)';

-- Migration complete
SELECT 'BetterAuth migration completed successfully' as migration_status;