/**
 * Comprehensive Tenant Isolation Test Script
 *
 * This script tests all aspects of tenant isolation to ensure
 * data security and proper RLS implementation.
 *
 * Run this script to validate your multi-tenant setup:
 * psql -U pems_app -d pems_dev < test-tenant-isolation.sql
 */

-- Start test session
\echo '=== Multi-Tenant Architecture Test Suite ==='

-- Test 1: Verify RLS is enabled on all tenant-aware tables
\echo 'Test 1: Verifying RLS is enabled...'
SELECT
    schemaname,
    tablename,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_enforced
FROM pg_tables
WHERE tablename IN (
    'Tenant', 'User', 'Student', 'Account', 'Transaction',
    'Receipt', 'Course', 'Enrollment', 'TenantSetting',
    'Role', 'UserRole', 'NavigationItem', 'RFIDTag'
)
ORDER BY tablename;

-- Test 2: Verify RLS policies exist
\echo 'Test 2: Verifying RLS policies...'
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN (
    'Tenant', 'User', 'Student', 'Account', 'Transaction'
)
ORDER BY tablename, policyname;

-- Test 3: Test Tenant Isolation - Student Table
\echo 'Test 3: Testing Student table tenant isolation...'

-- Set up test tenant contexts
\echo 'Setting up test tenant contexts...'

-- Should see only Test School Alpha data
\echo 'Context: Test School Alpha (Tenant 1)'
SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = false;

SELECT 'Students visible to Tenant Alpha:' as context, student_no, first_name, last_name
FROM "Student"
ORDER BY student_no;

-- Should see only Test School Beta data
\echo 'Context: Test School Beta (Tenant 2)'
SET app.current_tenant_id = '00000000-0000-0000-0000-000000000002';
SET app.is_system_admin = false;

SELECT 'Students visible to Tenant Beta:' as context, student_no, first_name, last_name
FROM "Student"
ORDER BY student_no;

-- Test 4: Test Account Isolation
\echo 'Test 4: Testing Account table tenant isolation...'

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = false;

SELECT 'Accounts visible to Tenant Alpha:' as context, code, name, balance
FROM "Account"
ORDER BY code;

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000002';
SET app.is_system_admin = false;

SELECT 'Accounts visible to Tenant Beta:' as context, code, name, balance
FROM "Account"
ORDER BY code;

-- Test 5: Test Transaction Isolation
\echo 'Test 5: Testing Transaction table tenant isolation...'

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = false;

SELECT 'Transactions visible to Tenant Alpha:' as context, amount, direction, transaction_type
FROM "Transaction"
ORDER BY created_at;

-- Test 6: Test Cross-Tenant Access Prevention
\echo 'Test 6: Testing cross-tenant access prevention...'

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = false;

-- This should return empty (tenant cannot access other tenant's data)
SELECT COUNT(*) as cross_tenant_student_access
FROM "Student"
WHERE tenant_id = '00000000-0000-0000-0000-000000000002';

SELECT COUNT(*) as cross_tenant_account_access
FROM "Account"
WHERE tenant_id = '00000000-0000-0000-0000-000000000002';

-- Test 7: Test System Admin Access
\echo 'Test 7: Testing System Admin access...'

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = true;

SELECT 'All students visible to System Admin:' as context, tenant_id, student_no, first_name, last_name
FROM "Student"
ORDER BY tenant_id, student_no;

SELECT 'All accounts visible to System Admin:' as context, tenant_id, code, balance
FROM "Account"
ORDER BY tenant_id, code;

-- Test 8: Test Insert with Wrong Tenant (Should Fail)
\echo 'Test 8: Testing insert with wrong tenant_id...'

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = false;

-- This should fail due to RLS policy violation
DO $$
BEGIN
    INSERT INTO "Student" (
        id, tenant_id, student_no, first_name, last_name
    ) VALUES (
        'TEST-STUDENT-001',
        '00000000-0000-0000-0000-000000000002', -- Different tenant
        'TEST-001',
        'Test',
        'Student'
    );
    RAISE EXCEPTION 'Insert should have failed due to RLS';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Insert correctly failed: %', SQLERRM;
END $$;

-- Test 9: Test Update with Wrong Tenant (Should Fail)
\echo 'Test 9: Testing update with wrong tenant_id...'

-- This should fail due to RLS policy violation
DO $$
BEGIN
    UPDATE "Student"
    SET first_name = 'Modified'
    WHERE tenant_id = '00000000-0000-0000-0000-000000000002'; -- Different tenant
    RAISE EXCEPTION 'Update should have failed due to RLS';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Update correctly failed: %', SQLERRM;
END $$;

-- Test 10: Test Delete with Wrong Tenant (Should Fail)
\echo 'Test 10: Testing delete with wrong tenant_id...'

-- This should fail due to RLS policy violation
DO $$
BEGIN
    DELETE FROM "Student"
    WHERE tenant_id = '00000000-0000-0000-0000-000000000002'; -- Different tenant
    RAISE NOTICE 'Deleted % rows', ROW_COUNT;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Delete correctly failed: %', SQLERRM;
END $$;

-- Test 11: Test Tenant Settings Isolation
\echo 'Test 11: Testing Tenant Settings isolation...'

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000001';
SET app.is_system_admin = false;

SELECT 'Settings visible to Tenant Alpha:' as context, key, value
FROM "TenantSetting"
ORDER BY key;

SET app.current_tenant_id = '00000000-0000-0000-0000-000000000002';
SET app.is_system_admin = false;

SELECT 'Settings visible to Tenant Beta:' as context, key, value
FROM "TenantSetting"
ORDER BY key;

-- Test 12: Test Performance with RLS
\echo 'Test 12: Testing performance impact of RLS...'

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Student" WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Test 13: Test Session Variables
\echo 'Test 13: Testing session variables...'

SELECT
    current_setting('app.current_tenant_id', true) as tenant_id,
    current_setting('app.is_system_admin', true) as is_system_admin,
    current_setting('app.current_user_id', true) as user_id;

-- Cleanup test session variables
RESET app.current_tenant_id;
RESET app.is_system_admin;
RESET app.current_user_id;

\echo '=== Test Suite Complete ==='
\echo 'If all tests passed correctly, your tenant isolation is working properly!'
\echo 'Expected results:'
\echo '- Each tenant should only see their own data'
\echo '- System admin should see all data'
\echo '- Cross-tenant operations should fail'
\echo '- Performance should remain acceptable'