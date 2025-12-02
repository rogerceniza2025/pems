-- Rollback Script: Restore original User table structure
-- This script reverses the BetterAuth migration if needed

-- WARNING: This should only be used for disaster recovery
-- It will lose all BetterAuth-specific data (sessions, verification tokens, etc.)

-- Step 1: Drop BetterAuth tables
DROP TABLE IF EXISTS "better_auth_two_factor" CASCADE;
DROP TABLE IF EXISTS "better_auth_verification_tokens" CASCADE;
DROP TABLE IF EXISTS "better_auth_sessions" CASCADE;
DROP TABLE IF EXISTS "better_auth_accounts" CASCADE;
DROP TABLE IF EXISTS "better_auth_users" CASCADE;

-- Step 2: Restore original User table
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Step 3: Restore original UserAuthProvider table
CREATE TABLE "UserAuthProvider" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT,
    "password_hash" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAuthProvider_pkey" PRIMARY KEY ("id")
);

-- Step 4: Restore indexes and constraints
CREATE INDEX "User_tenant_id_idx" ON "User"("tenant_id");
CREATE UNIQUE INDEX "User_tenant_id_email_key" ON "User"("tenant_id", "email");

-- Step 5: Restore foreign key relationships
ALTER TABLE "UserProfile" DROP CONSTRAINT IF EXISTS "UserProfile_user_id_fkey";
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserAuthProvider" DROP CONSTRAINT IF EXISTS "UserAuthProvider_user_id_fkey";
ALTER TABLE "UserAuthProvider" ADD CONSTRAINT "UserAuthProvider_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_user_id_fkey";
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RFIDScan" DROP CONSTRAINT IF EXISTS "RFIDScan_user_id_fkey";
ALTER TABLE "RFIDScan" ADD CONSTRAINT "RFIDScan_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_users_fkey";
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_users_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Restore data from backup if available
-- Uncomment if backup tables exist
/*
INSERT INTO "User" (
    "id", "tenant_id", "email", "phone", "is_active",
    "is_system_admin", "metadata", "created_at", "updated_at"
)
SELECT
    "id", "tenant_id", "email", "phone", "is_active",
    "is_system_admin", "metadata", "created_at", "updated_at"
FROM "User_backup_YYYYMMDD_HHMMSS";

INSERT INTO "UserAuthProvider" (
    "id", "user_id", "provider", "provider_id", "password_hash",
    "mfa_enabled", "created_at"
)
SELECT
    "id", "user_id", "provider", "provider_id", "password_hash",
    "mfa_enabled", "created_at"
FROM "UserAuthProvider_backup_YYYYMMDD_HHMMSS";
*/

-- Step 7: Restore RLS policies on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User_tenant_isolation" ON "User"
    FOR ALL TO authenticated_role
    USING (check_tenant_access("tenant_id"))
    WITH CHECK (check_tenant_access("tenant_id"));

-- Step 8: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON "User" TO authenticated_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON "UserAuthProvider" TO authenticated_role;

-- Rollback complete
SELECT 'BetterAuth rollback completed successfully' as rollback_status;