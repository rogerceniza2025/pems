-- ============================================================================
-- PEMS Database Initialization Script
-- ============================================================================
-- This script runs when the PostgreSQL container starts for the first time
-- It enables required extensions and sets up the database for PEMS

-- Enable UUID extension for UUID v7 support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PostgreSQL 18 has native uuidv7() function that creates true time-ordered UUIDv7
-- The native uuidv7() creates UUIDs with embedded timestamps for chronological sorting
-- No custom functions needed - we use PostgreSQL 18's native uuidv7() directly

-- Grant usage to public
GRANT USAGE ON SCHEMA public TO PUBLIC;

-- Create test database if it doesn't exist (for testing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'pems_test') THEN
        CREATE DATABASE pems_test;
    END IF;
END
$$;
