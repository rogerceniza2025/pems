-- CreateTable: BetterAuth Users (replacing existing User table)
CREATE TABLE "better_auth_users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "image" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "better_auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BetterAuth Accounts for OAuth providers
CREATE TABLE "better_auth_accounts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "better_auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BetterAuth Sessions
CREATE TABLE "better_auth_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "better_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BetterAuth Verification Tokens
CREATE TABLE "better_auth_verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable: BetterAuth 2FA for multi-factor authentication
CREATE TABLE "better_auth_two_factor" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "better_auth_two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "better_auth_users_tenant_id_idx" ON "better_auth_users"("tenant_id");
CREATE UNIQUE INDEX "better_auth_users_tenant_id_email_key" ON "better_auth_users"("tenant_id", "email");
CREATE UNIQUE INDEX "better_auth_accounts_provider_providerAccountId_key" ON "better_auth_accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "better_auth_sessions_sessionToken_key" ON "better_auth_sessions"("sessionToken");
CREATE UNIQUE INDEX "better_auth_verification_tokens_token_key" ON "better_auth_verification_tokens"("token");
CREATE UNIQUE INDEX "better_auth_verification_tokens_identifier_token_key" ON "better_auth_verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "better_auth_two_factor_userId_key" ON "better_auth_two_factor"("userId");
CREATE UNIQUE INDEX "better_auth_two_factor_secret_key" ON "better_auth_two_factor"("secret");

-- AddForeignKey
ALTER TABLE "better_auth_users" ADD CONSTRAINT "better_auth_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "better_auth_accounts" ADD CONSTRAINT "better_auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "better_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "better_auth_sessions" ADD CONSTRAINT "better_auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "better_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "better_auth_two_factor" ADD CONSTRAINT "better_auth_two_factor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "better_auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update existing UserProfile foreign key to point to new user table
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_user_id_fkey";
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing UserAuthProvider foreign key to point to new user table
ALTER TABLE "UserAuthProvider" DROP CONSTRAINT "UserAuthProvider_user_id_fkey";
ALTER TABLE "UserAuthProvider" ADD CONSTRAINT "UserAuthProvider_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing UserRole foreign key to point to new user table
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_user_id_fkey";
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update existing RFIDScan foreign key to point to new user table
ALTER TABLE "RFIDScan" DROP CONSTRAINT "RFIDScan_user_id_fkey";
ALTER TABLE "RFIDScan" ADD CONSTRAINT "RFIDScan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing Receipt foreign key to point to new user table
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_created_by_fkey";
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "better_auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;