
/*
Migration: 0001_init
Creates all tables, triggers, and RLS policies.
Run as a DB admin. This migration is intended to be used with Prisma 7.0.1.
*/
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Tables (same as earlier but ensuring names/prisma mapping kept simple)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL,
  slug text NOT NULL,
  timezone text DEFAULT 'Asia/Manila',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX tenants_slug_idx ON tenants(slug);

CREATE TABLE tenant_settings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone text,
  is_active boolean DEFAULT true,
  is_system_admin boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX users_email_tenant_idx ON users(tenant_id, lower(email));

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  preferred_name text,
  locale text,
  extra jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_auth_providers (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_id text,
  password_hash text,
  mfa_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_builtin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX roles_unique_idx ON roles(tenant_id, lower(slug));

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  action text NOT NULL,
  resource text NOT NULL,
  resource_scope text DEFAULT 'tenant',
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX perm_action_resource_idx ON permissions(lower(action), lower(resource));

CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  resource_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id, resource_id)
);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

CREATE TABLE navigation_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid,
  parent_id uuid REFERENCES navigation_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  route text,
  order_index int DEFAULT 0,
  visible boolean DEFAULT true,
  permission_required uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX navigation_tenant_idx ON navigation_items(tenant_id);

CREATE TABLE rfid_tags (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tag_uid text NOT NULL,
  tag_type text DEFAULT 'person',
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX rfid_tag_uid_tenant_idx ON rfid_tags(tenant_id, tag_uid);

CREATE TABLE rfid_assignments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tag_id uuid NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  unassigned_at timestamptz
);

CREATE TABLE rfid_devices (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text,
  location text,
  ip_address inet,
  model text,
  last_seen timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE rfid_scans (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id uuid REFERENCES rfid_devices(id),
  tag_uid text NOT NULL,
  scanned_at timestamptz DEFAULT now(),
  event_type text,
  payload jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX rfid_scans_tenant_time_idx ON rfid_scans(tenant_id, scanned_at DESC);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  balance numeric(18,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX accounts_code_tenant_idx ON accounts(tenant_id, code);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  amount numeric(18,2) NOT NULL,
  direction text NOT NULL,
  transaction_type text,
  reference text,
  recorded_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX transactions_tenant_time_idx ON transactions(tenant_id, recorded_at DESC);

CREATE TABLE cash_tills (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE till_sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  till_id uuid NOT NULL REFERENCES cash_tills(id),
  cashier_id uuid REFERENCES users(id),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opened_balance numeric(18,2) DEFAULT 0,
  closed_balance numeric(18,2),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE receipts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_no text NOT NULL,
  amount numeric(18,2) NOT NULL,
  payer_id uuid,
  payment_method text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX receipts_tenant_time_idx ON receipts(tenant_id, created_at DESC);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_no text,
  first_name text,
  last_name text,
  birth_date date,
  active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX students_no_tenant_idx ON students(tenant_id, student_no);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text,
  title text,
  level text,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX courses_code_tenant_idx ON courses(tenant_id, code);

CREATE TABLE course_sections (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term text,
  capacity int,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id),
  course_section_id uuid REFERENCES course_sections(id),
  enrolled_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tenant_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz DEFAULT now(),
  old_data jsonb,
  new_data jsonb
);
CREATE INDEX audit_logs_tenant_time_idx ON audit_logs(tenant_id, changed_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_if_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs(tenant_id, table_name, record_id, action, changed_by, changed_at, old_data, new_data)
    VALUES (COALESCE(OLD.tenant_id, NULL), TG_TABLE_NAME, OLD.id, 'DELETE', current_setting('app.current_user' , true)::uuid, now(), row_to_json(OLD)::jsonb, NULL);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs(tenant_id, table_name, record_id, action, changed_by, changed_at, old_data, new_data)
    VALUES (COALESCE(NEW.tenant_id, NULL), TG_TABLE_NAME, NEW.id, 'UPDATE', current_setting('app.current_user' , true)::uuid, now(), row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs(tenant_id, table_name, record_id, action, changed_by, changed_at, old_data, new_data)
    VALUES (COALESCE(NEW.tenant_id, NULL), TG_TABLE_NAME, NEW.id, 'INSERT', current_setting('app.current_user' , true)::uuid, now(), NULL, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to key tables
DO $$
DECLARE
  tbl record;
  tables_to_attach text[] := ARRAY[
    'users','students','accounts','transactions','receipts','rfid_tags','rfid_assignments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_attach LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$s;', tbl);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION audit_if_changed();', tbl);
  END LOOP;
END;
$$;

-- RLS helper functions
CREATE OR REPLACE FUNCTION app_current_tenant()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app_current_user()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.current_user', true), '')::uuid;
$$;

-- Enable RLS and policies (examples)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_isolation ON users
USING (
  (EXISTS (
     SELECT 1 FROM users u_sys WHERE u_sys.id = app_current_user() AND u_sys.is_system_admin = true
  ))
  OR tenant_id = app_current_tenant()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_tenant_isolation ON students
USING (
  (EXISTS (
     SELECT 1 FROM users u_sys WHERE u_sys.id = app_current_user() AND u_sys.is_system_admin = true
  ))
  OR tenant_id = app_current_tenant()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_tenant_isolation ON accounts
USING (
  (EXISTS (
     SELECT 1 FROM users u_sys WHERE u_sys.id = app_current_user() AND u_sys.is_system_admin = true
  ))
  OR tenant_id = app_current_tenant()
);

-- Add more RLS policies per-table as needed...

-- Indexes
CREATE INDEX idx_user_roles_user_role ON user_roles(user_id, role_id);
CREATE INDEX idx_role_permissions_role_perm ON role_permissions(role_id, permission_id);
CREATE INDEX idx_user_email_tenant ON users(tenant_id, lower(email));
