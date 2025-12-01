-- Enable required extensions for UUIDv7 and other features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create UUIDv7 generation function (PostgreSQL 18 has native support, but we'll add fallback)
CREATE OR REPLACE FUNCTION uuid_v7() 
RETURNS UUID
AS $$
BEGIN
    -- Use native uuid_v7 if available (PostgreSQL 18+)
    BEGIN
        RETURN uuid_generate_v7();
    EXCEPTION WHEN undefined_function THEN
        -- Fallback for older versions
        RETURN uuid_generate_v4();
    END;
END;
$$ LANGUAGE plpgsql;

-- Set default permissions for better security
ALTER DEFAULT PRIVILEGES REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT CREATE ON SCHEMA public TO PUBLIC;

-- Create audit trigger for tracking changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs(table_name, operation, user_id, old_values, new_values, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, current_setting('app.current_user_id'::text, 'unknown'), row_to_json(OLD), row_to_json(NEW), NOW());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs(table_name, operation, user_id, old_values, new_values, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, current_setting('app.current_user_id'::text, 'unknown'), row_to_json(OLD), row_to_json(NEW), NOW());
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs(table_name, operation, user_id, old_values, new_values, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, current_setting('app.current_user_id'::text, 'unknown'), row_to_json(OLD), row_to_json(NEW), NOW());
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit_logs table for tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_v7(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Enable Row Level Security (RLS) for multi-tenancy
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation ON audit_logs
    FOR ALL
    TO authenticated_role
    USING (user_id = current_setting('app.current_tenant_id')::text OR user_id IS NULL)
    WITH CHECK (user_id = current_setting('app.current_tenant_id')::text OR user_id IS NULL);
