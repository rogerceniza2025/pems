# Multi-Tenant Architecture Deployment Guide

## Prerequisites

- PostgreSQL 18+ (recommended) or PostgreSQL 14+ with UUIDv7 extension
- Node.js 18+
- pnpm package manager
- Docker (optional, for containerized deployment)

## Step 1: Database Preparation

### Option A: Direct PostgreSQL Setup
```bash
# Connect to your PostgreSQL instance
psql -U postgres -d postgres

# Create the PEMS database
CREATE DATABASE pems_dev;
CREATE DATABASE pems_test;
CREATE DATABASE pems_prod;

# Create application user
CREATE USER pems_app WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE pems_dev TO pems_app;
GRANT ALL PRIVILEGES ON DATABASE pems_test TO pems_app;
GRANT ALL PRIVILEGES ON DATABASE pems_prod TO pems_app;
```

### Option B: Docker Compose Setup
```bash
# Create docker-compose.yml for local development
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: pems_dev
      POSTGRES_USER: pems_app
      POSTGRES_PASSWORD: secure_password_here
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-db.sql:/docker-entrypoint-initdb.d/01-init-db.sql
      - ./packages/infrastructure/database/prisma/migrations:/docker-entrypoint-initdb.d/migrations

volumes:
  postgres_data:
EOF
```

## Step 2: Environment Configuration

### Development Environment (.env.development)
```env
# Database Configuration
DATABASE_URL="postgresql://pems_app:secure_password_here@localhost:5432/pems_dev"

# Application Configuration
NODE_ENV=development
API_PORT=3002
API_HOST=localhost

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
BCRYPT_ROUNDS=12

# Multi-Tenant Configuration
ENABLE_RLS=true
DEFAULT_TENANT_TIMEZONE=Asia/Manila
SUPER_ADMIN_EMAIL=admin@pems.local
```

### Production Environment (.env.production)
```env
# Database Configuration
DATABASE_URL="postgresql://pems_app:secure_prod_password@prod-db-host:5432/pems_prod"

# Application Configuration
NODE_ENV=production
API_PORT=3002
API_HOST=0.0.0.0

# Security
JWT_SECRET=production-super-secure-jwt-secret
BCRYPT_ROUNDS=14

# Multi-Tenant Configuration
ENABLE_RLS=true
DEFAULT_TENANT_TIMEZONE=Asia/Manila
SUPER_ADMIN_EMAIL=admin@pems.ph
```

## Step 3: Database Migration

### Initial Setup
```bash
# Install dependencies
pnpm install

# Generate Prisma client
cd packages/infrastructure/database
pnpm db:generate

# Run initial migration (creates tables)
pnpm db:migrate --name init

# Run RLS policies migration
pnpm db:migrate --name add-rls-policies
```

### Verify RLS Implementation
```sql
-- Connect to database
psql -U pems_app -d pems_dev

-- Verify RLS is enabled on tenant tables
SELECT
    schemaname,
    tablename,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_enforced
FROM pg_tables
WHERE tablename IN (
    'Tenant', 'User', 'Student', 'Account',
    'Transaction', 'Receipt', 'Course', 'Enrollment'
)
ORDER BY tablename;
```

## Step 4: Application Deployment

### Development Server
```bash
# Start the API server
cd apps/api
pnpm dev

# Server should start on http://localhost:3002
# Health check: http://localhost:3002/health
```

### Production Deployment
```bash
# Build the application
pnpm build

# Start production server
cd apps/api
pnpm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### PM2 Configuration (ecosystem.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'pems-api',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
}
```

## Step 5: Initial Tenant Setup

### Create System Admin Tenant
```bash
# Use the API to create initial system tenant
curl -X POST http://localhost:3002/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-super-admin-token" \
  -d '{
    "name": "PEMS System Administration",
    "slug": "system-admin",
    "timezone": "Asia/Manila"
  }'
```

### Create Test Tenants
```bash
# Create test school tenant
curl -X POST http://localhost:3002/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mock-super-admin-token" \
  -d '{
    "name": "Test Elementary School",
    "slug": "test-elementary",
    "timezone": "Asia/Manila"
  }'
```

## Step 6: Health Checks and Monitoring

### Database Health Check
```bash
# Test database connectivity
curl http://localhost:3002/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-12-01T12:00:00.000Z",
#   "database": "connected"
# }
```

### RLS Verification
```sql
-- Test RLS policies by setting tenant context
SET app.current_tenant_id = 'test-tenant-id';
SET app.is_system_admin = false;

-- Should only return current tenant's data
SELECT COUNT(*) FROM "Student";

-- Test system admin access
RESET ALL;
SET app.current_tenant_id = 'any-tenant-id';
SET app.is_system_admin = true;

-- Should return all data
SELECT COUNT(*) FROM "Student";
```

## Troubleshooting

### Common Issues

1. **RLS Not Working**
   ```sql
   -- Check if RLS is enabled
   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'Student';

   -- Check if policies exist
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename = 'Student';
   ```

2. **Tenant Context Issues**
   ```sql
   -- Check current session variables
   SELECT current_setting('app.current_tenant_id', true);
   SELECT current_setting('app.is_system_admin', true);
   ```

3. **Migration Failures**
   ```bash
   # Reset and retry
   cd packages/infrastructure/database
   pnpm db:reset
   pnpm db:migrate --name init
   pnpm db:migrate --name add-rls-policies
   ```

### Performance Monitoring

```sql
-- Monitor RLS performance
EXPLAIN ANALYZE SELECT * FROM "Student" WHERE tenant_id = 'specific-tenant-id';

-- Check query patterns
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE query LIKE '%Student%'
ORDER BY total_time DESC;
```

## Security Hardening

### Production Security Checklist
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Implement rate limiting on API endpoints
- [ ] Set up proper CORS policies
- [ ] Enable database connection pooling
- [ ] Implement proper logging and monitoring
- [ ] Regular security audits and penetration testing

## Backup and Recovery

### Database Backup Strategy
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/pems"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -h localhost -U pems_app -d pems_prod > "$BACKUP_DIR/pems_backup_$DATE.sql"

# Keep last 30 days of backups
find $BACKUP_DIR -name "pems_backup_*.sql" -mtime +30 -delete
```

### Point-in-Time Recovery
```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal_archive/%f'
```

## Scaling Considerations

### Database Scaling
- Implement read replicas for reporting queries
- Consider database sharding by tenant for very large deployments
- Monitor connection pool usage and adjust as needed

### Application Scaling
- Use load balancers for multiple API instances
- Implement tenant-aware caching (Redis with tenant prefixing)
- Consider serverless deployment options for variable workloads