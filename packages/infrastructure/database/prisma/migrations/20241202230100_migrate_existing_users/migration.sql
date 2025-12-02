-- Data Migration: Migrate existing users to BetterAuth format

-- Step 1: Migrate existing users to better_auth_users table
INSERT INTO "better_auth_users" (
    "id",
    "tenant_id",
    "email",
    "emailVerified",
    "name",
    "phone",
    "is_active",
    "is_system_admin",
    "metadata",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "tenant_id",
    "email",
    CASE
        WHEN "created_at" < INTERVAL '30 days' THEN "created_at"  -- Assume verified if created recently
        ELSE NULL  -- Otherwise, require verification
    END as "emailVerified",
    NULL as "name",  -- Will be populated from UserProfile
    "phone",
    "is_active",
    "is_system_admin",
    "metadata",
    "created_at",
    "updated_at"
FROM "User"
WHERE "id" NOT IN (SELECT "id" FROM "better_auth_users");

-- Step 2: Update user names from UserProfile
UPDATE "better_auth_users"
SET "name" = (
    SELECT COALESCE("full_name", "preferred_name")
    FROM "UserProfile"
    WHERE "UserProfile"."user_id" = "better_auth_users"."id"
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM "UserProfile"
    WHERE "UserProfile"."user_id" = "better_auth_users"."id"
);

-- Step 3: Migrate email/password auth providers to BetterAuth Accounts
INSERT INTO "better_auth_accounts" (
    "id",
    "userId",
    "type",
    "provider",
    "providerAccountId",
    "created_at"
)
SELECT
    gen_random_uuid() as "id",
    u."id" as "userId",
    'email' as "type",
    'credential' as "provider",
    u."email" as "providerAccountId",
    NOW() as "created_at"
FROM "better_auth_users" u
JOIN "UserAuthProvider" auth ON auth."user_id" = u."id"
WHERE auth."provider" = 'email'
AND auth."password_hash" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "better_auth_accounts" a
    WHERE a."userId" = u."id" AND a."provider" = 'credential'
);

-- Step 4: Migrate OAuth providers to BetterAuth Accounts (Google, GitHub, etc.)
INSERT INTO "better_auth_accounts" (
    "id",
    "userId",
    "type",
    "provider",
    "providerAccountId",
    "access_token",
    "refresh_token",
    "token_type",
    "scope",
    "expires_at",
    "created_at"
)
SELECT
    gen_random_uuid() as "id",
    u."id" as "userId",
    'oauth' as "type",
    auth."provider" as "provider",
    COALESCE(auth."provider_id", u."email") as "providerAccountId",
    NULL as "access_token",  -- OAuth tokens would need to be refreshed
    NULL as "refresh_token",
    NULL as "token_type",
    NULL as "scope",
    NULL as "expires_at",
    NOW() as "created_at"
FROM "better_auth_users" u
JOIN "UserAuthProvider" auth ON auth."user_id" = u."id"
WHERE auth."provider" IN ('google', 'github', 'microsoft')
AND auth."provider_id" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "better_auth_accounts" a
    WHERE a."userId" = u."id" AND a."provider" = auth."provider"
);

-- Step 5: Migrate MFA settings to BetterAuth TwoFactor table
INSERT INTO "better_auth_two_factor" (
    "id",
    "userId",
    "secret",
    "backupCodes",
    "enabled",
    "createdAt"
)
SELECT
    gen_random_uuid() as "id",
    u."id" as "userId",
    'TEMP_MFA_SECRET_' || substring(md5(u."id" || u."email"), 1, 16) as "secret",  -- Temporary secret, users will need to re-setup MFA
    ARRAY['BACKUP1', 'BACKUP2', 'BACKUP3'] as "backupCodes",  -- Temporary backup codes
    auth."mfa_enabled" as "enabled",
    auth."created_at" as "createdAt"
FROM "better_auth_users" u
JOIN "UserAuthProvider" auth ON auth."user_id" = u."id"
WHERE auth."provider" = 'email'
AND auth."mfa_enabled" = true
AND NOT EXISTS (
    SELECT 1 FROM "better_auth_two_factor" tf
    WHERE tf."userId" = u."id"
);

-- Step 6: Update sequences for PostgreSQL (if needed)
-- Note: UUIDv7 doesn't use sequences, but keeping this for reference
-- SELECT setval('better_auth_users_id_seq', (SELECT MAX(id) FROM "better_auth_users"));
-- SELECT setval('better_auth_accounts_id_seq', (SELECT MAX(id) FROM "better_auth_accounts"));
-- SELECT setval('better_auth_sessions_id_seq', 1);
-- SELECT setval('better_auth_two_factor_id_seq', 1);

-- Step 7: Create verification tokens for users that need email verification
INSERT INTO "better_auth_verification_tokens" (
    "identifier",
    "token",
    "expires"
)
SELECT
    u."email" as "identifier",
    'VERIFY_' || substring(md5(u."id" || u."email" || 'verify'), 1, 32) as "token",
    NOW() + INTERVAL '24 hours' as "expires"
FROM "better_auth_users" u
WHERE u."emailVerified" IS NULL
AND NOT EXISTS (
    SELECT 1 FROM "better_auth_verification_tokens" vt
    WHERE vt."identifier" = u."email"
    AND vt."expires" > NOW()
);

-- Step 8: Rename old User table to User_old (backup before deletion)
-- This will be done in a separate migration after verification