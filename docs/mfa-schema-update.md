# Database Schema Update for MFA Support

## Overview

This document outlines the database schema changes required to support Multi-Factor Authentication (MFA) in the PEMS system.

## Changes Required

### 1. Update UserAuthProvider Model

The current `UserAuthProvider` model needs to be enhanced to support MFA functionality:

```prisma
model UserAuthProvider {
  id           String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id      String   @db.Uuid
  provider     String
  provider_id  String?
  password_hash String?
  mfa_enabled  Boolean  @default(false)
  mfa_secret   String?  // TOTP secret for MFA
  backup_codes Json?    // Array of backup codes as JSON
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  user         User   @relation(fields: [user_id], references: [id])
}
```

### 2. Add Password Reset Tokens Table

```prisma
model PasswordResetToken {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id   String   @db.Uuid
  token     String   @unique
  expires_at DateTime
  created_at DateTime @default(now())
  used_at   DateTime?

  user User @relation(fields: [user_id], references: [id])

  @@index([token])
  @@index([expires_at])
}
```

### 3. Add Magic Link Tokens Table

```prisma
model MagicLinkToken {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id   String   @db.Uuid
  token     String   @unique
  expires_at DateTime
  created_at DateTime @default(now())
  used_at   DateTime?

  user User @relation(fields: [user_id], references: [id])

  @@index([token])
  @@index([expires_at])
}
```

### 4. Add User Sessions Table (for BetterAuth integration)

```prisma
model UserSession {
  id          String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id     String   @db.Uuid
  token       String   @unique
  expires_at  DateTime
  created_at  DateTime @default(now())
  last_used_at DateTime @default(now())
  ip_address  String?
  user_agent  String?

  user User @relation(fields: [user_id], references: [id])

  @@index([token])
  @@index([expires_at])
  @@index([user_id])
}
```

## Migration Strategy

### Step 1: Create Migration File

```bash
npx prisma migrate dev --name add-mfa-support
```

### Step 2: Update User Model Relations

Add the new relationships to the User model:

```prisma
model User {
  // ... existing fields ...

  // New relationships
  password_reset_tokens PasswordResetToken[]
  magic_link_tokens   MagicLinkToken[]
  user_sessions       UserSession[]
}
```

## Security Considerations

### 1. MFA Secret Storage

- Store TOTP secrets encrypted at rest
- Use application-level encryption before storing in database
- Consider using PostgreSQL's pgcrypto extension

### 2. Backup Codes

- Store backup codes as hashed values, not plaintext
- Use bcrypt with high salt rounds for backup code hashing
- Mark backup codes as used when consumed

### 3. Token Security

- Use cryptographically secure random tokens
- Set appropriate expiration times (15 minutes for password reset, 1 hour for magic links)
- Implement one-time use tokens

## Implementation Notes

### 1. Backward Compatibility

- All new fields are optional or have defaults
- Existing users will have mfa_enabled = false by default
- Migration will not affect existing functionality

### 2. Performance

- Added indexes on token fields for fast lookups
- JSON field for backup codes allows efficient storage and querying
- Session table includes indexes for cleanup operations

### 3. Data Validation

- MFA secrets should be base32 encoded
- Backup codes should be alphanumeric with consistent formatting
- Tokens should be URL-safe random strings

## Testing Strategy

### 1. Migration Testing

- Test migration on staging database first
- Verify data integrity after migration
- Test rollback procedures

### 2. Functional Testing

- Test MFA setup with TOTP
- Test backup code generation and validation
- Test password reset and magic link flows

### 3. Security Testing

- Test token expiration behavior
- Test concurrent session handling
- Test rate limiting on token endpoints

## Rollback Plan

If issues arise during deployment:

1. Disable MFA features via feature flag
2. Use Prisma rollback to revert migration
3. Restore backup of database if needed
4. Investigate root cause before retry

## Complete Updated Schema

Here's the complete updated schema with MFA support:

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["clientExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id         String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  name       String
  slug       String
  timezone   String?  @default("Asia/Manila")
  metadata   Json?    @default("{}")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  users            User[]
  tenant_settings  TenantSetting[]
  navigation_items NavigationItem[]
  roles            Role[]
  accounts         Account[]
  receipts         Receipt[]
}

model TenantSetting {
  id         String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String   @db.Uuid
  key        String
  value      Json?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  tenant     Tenant   @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, key])
}

model User {
  id         String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String   @db.Uuid
  email      String
  phone      String?
  is_active  Boolean  @default(true)
  is_system_admin Boolean @default(false)
  metadata   Json?    @default("{}")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  tenant         Tenant @relation(fields: [tenant_id], references: [id])
  profiles       UserProfile[]
  auth_providers UserAuthProvider[]
  user_roles     UserRole[]
  rfid_scans     RFIDScan[]
  password_reset_tokens PasswordResetToken[]
  magic_link_tokens   MagicLinkToken[]
  user_sessions       UserSession[]

  @@index([tenant_id])
  @@unique([tenant_id, email])
}

model UserProfile {
  id          String  @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id     String  @db.Uuid
  full_name   String?
  avatar_url  String?
  preferred_name String?
  locale      String?
  extra       Json?   @default("{}")
  created_at  DateTime @default(now())

  user        User    @relation(fields: [user_id], references: [id])
}

model UserAuthProvider {
  id           String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id      String   @db.Uuid
  provider     String
  provider_id  String?
  password_hash String?
  mfa_enabled  Boolean  @default(false)
  mfa_secret   String?  // TOTP secret for MFA
  backup_codes Json?    // Array of backup codes as JSON
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  user         User   @relation(fields: [user_id], references: [id])
}

model PasswordResetToken {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id   String   @db.Uuid
  token     String   @unique
  expires_at DateTime
  created_at DateTime @default(now())
  used_at   DateTime?

  user User @relation(fields: [user_id], references: [id])

  @@index([token])
  @@index([expires_at])
}

model MagicLinkToken {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id   String   @db.Uuid
  token     String   @unique
  expires_at DateTime
  created_at DateTime @default(now())
  used_at   DateTime?

  user User @relation(fields: [user_id], references: [id])

  @@index([token])
  @@index([expires_at])
}

model UserSession {
  id          String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id     String   @db.Uuid
  token       String   @unique
  expires_at  DateTime
  created_at  DateTime @default(now())
  last_used_at DateTime @default(now())
  ip_address  String?
  user_agent  String?

  user User @relation(fields: [user_id], references: [id])

  @@index([token])
  @@index([expires_at])
  @@index([user_id])
}

model Role {
  id         String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String?  @db.Uuid
  name       String
  slug       String
  description String?
  is_builtin Boolean @default(false)
  created_at DateTime @default(now())

  tenant      Tenant? @relation(fields: [tenant_id], references: [id])
  role_permissions RolePermission[]
  user_roles  UserRole[]

  @@unique([tenant_id, slug])
}

model Permission {
  id         String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  action     String
  resource   String
  resource_scope String? @default("tenant")
  description String?
  created_at DateTime @default(now())

  role_permissions RolePermission[]
  @@unique([action, resource])
}

model RolePermission {
  id            String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  role_id       String @db.Uuid
  permission_id String @db.Uuid
  resource_id   String? @db.Uuid
  created_at    DateTime @default(now())

  role       Role       @relation(fields: [role_id], references: [id])
  permission Permission @relation(fields: [permission_id], references: [id])
}

model UserRole {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  user_id   String @db.Uuid
  role_id   String @db.Uuid
  scope     Json?  @default("{}")
  created_at DateTime @default(now())

  user User @relation(fields: [user_id], references: [id])
  role Role @relation(fields: [role_id], references: [id])
  @@unique([user_id, role_id])
}

model NavigationItem {
  id         String  @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String? @db.Uuid
  parent_id  String? @db.Uuid
  title      String
  route      String?
  order_index Int?   @default(0)
  visible    Boolean @default(true)
  permission_required String? @db.Uuid
  metadata   Json?   @default("{}")
  created_at DateTime @default(now())

  tenant    Tenant? @relation(fields: [tenant_id], references: [id])
  parent    NavigationItem? @relation("NavParent", fields: [parent_id], references: [id])
  children  NavigationItem[] @relation("NavParent")
  @@index([tenant_id])
}

model RFIDTag {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id String @db.Uuid
  tag_uid   String
  tag_type  String? @default("person")
  active    Boolean @default(true)
  metadata  Json? @default("{}")
  created_at DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  assignments RFIDAssignment[]
  @@unique([tenant_id, tag_uid])
}

model RFIDAssignment {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tag_id     String @db.Uuid
  entity_type String
  entity_id  String @db.Uuid
  assigned_at DateTime @default(now())
  unassigned_at DateTime?

  tag RFIDTag @relation(fields: [tag_id], references: [id])
}

model RFIDDevice {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id String @db.Uuid
  name      String?
  location  String?
  ip_address String?
  model     String?
  last_seen DateTime?
  metadata  Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
}

model RFIDScan {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id String @db.Uuid
  device_id String?
  tag_uid   String
  scanned_at DateTime @default(now())
  event_type String?
  payload   Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  @@index([tenant_id, scanned_at])
}

model Account {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id String @db.Uuid
  code      String
  name      String
  type      String
  balance   Decimal @db.Decimal(18,2)
  metadata  Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, code])
}

model Transaction {
  id         String  @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String  @db.Uuid
  account_id String  @db.Uuid
  amount     Decimal @db.Decimal(18,2)
  direction  String
  transaction_type String?
  reference  String?
  recorded_at DateTime @default(now())
  created_by  String? @db.Uuid
  metadata   Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  account Account @relation(fields: [account_id], references: [id])
  @@index([tenant_id, recorded_at])
}

model CashTill {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id String @db.Uuid
  name      String
  metadata  Json? @default("{}")
  tenant    Tenant @relation(fields: [tenant_id], references: [id])
}

model TillSession {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  till_id    String @db.Uuid
  cashier_id String? @db.Uuid
  opened_at  DateTime @default(now())
  closed_at  DateTime?
  opened_balance Decimal? @db.Decimal(18,2)
  closed_balance Decimal? @db.Decimal(18,2)
  metadata   Json? @default("{}")

  till CashTill @relation(fields: [till_id], references: [id])
}

model Receipt {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String @db.Uuid
  receipt_no String
  amount     Decimal @db.Decimal(18,2)
  payer_id   String? @db.Uuid
  payment_method String?
  created_at DateTime @default(now())
  created_by String? @db.Uuid
  metadata   Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  @@index([tenant_id, created_at])
}

model Student {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String @db.Uuid
  student_no String
  first_name String
  last_name  String
  birth_date DateTime?
  active     Boolean @default(true)
  metadata   Json? @default("{}")
  created_at DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, student_no])
}

model Course {
  id        String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id String @db.Uuid
  code      String
  title     String
  level     String?
  metadata  Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  @@unique([tenant_id, code])
}

model CourseSection {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  course_id  String @db.Uuid
  term       String?
  capacity   Int?
  metadata   Json? @default("{}")

  course Course @relation(fields: [course_id], references: [id])
}

model Enrollment {
  id         String @id @default(dbgenerated("uuidv7()")) @db.Uuid
  tenant_id  String @db.Uuid
  student_id String @db.Uuid
  course_section_id String? @db.Uuid
  enrolled_at DateTime @default(now())
  status     String? @default("active")
  metadata   Json? @default("{}")

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  student Student @relation(fields: [student_id], references: [id])
  @@index([tenant_id])
}
```

## Next Steps

1. Review and approve this schema update
2. Create and test migration
3. Update repository implementations to use new fields
4. Implement MFA service logic
5. Update API endpoints to support new functionality
