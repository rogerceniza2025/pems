# PO-3 Multi-Tenant Architecture - Quick Start Guide

## 🎯 Overview

This implementation provides complete multi-tenant architecture for PEMS with tenant isolation, comprehensive security, and scalable design.

## ⚡ Quick Start

### Prerequisites
```bash
# Required software
- PostgreSQL 14+ (18+ recommended for UUIDv7)
- Node.js 18+
- pnpm 8+
```

### 1. Database Setup
```bash
# Start PostgreSQL (using Docker)
docker-compose -f docker-compose.dev.yml up -d postgres

# Or connect to existing PostgreSQL
psql -U postgres -c "CREATE DATABASE pems_dev;"
psql -U postgres -c "CREATE USER pems_app WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE pems_dev TO pems_app;"
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
pnpm install
```

### 3. Database Migration
```bash
cd packages/infrastructure/database
pnpm db:generate
pnpm db:migrate --name init
pnpm db:migrate --name add-rls-policies
```

### 4. Start Development Server
```bash
cd apps/api
pnpm dev
```

### 5. Verify Installation
```bash
# Health check
curl http://localhost:3002/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-12-01T12:00:00.000Z",
#   "database": "connected"
# }
```

## 🔧 Environment Configuration

Create `.env` file:
```env
DATABASE_URL="postgresql://pems_app:your_password@localhost:5432/pems_dev"
NODE_ENV=development
API_PORT=3002
```

## 🧪 Run Tests

### Database Isolation Tests
```bash
# Test RLS policies
psql "$DATABASE_URL" < scripts/test-tenant-isolation.sql

# Run comprehensive test suite
./scripts/run-tests.sh
```

### Unit Tests
```bash
cd modules/tenant-management
pnpm test
```

## 📚 Key Features

### ✅ Multi-Tenant Security
- Row-Level Security (RLS) on all tables
- Automatic tenant isolation
- Cross-tenant data prevention

### ✅ Tenant Management API
```bash
# Create tenant (requires auth)
curl -X POST http://localhost:3002/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "My School",
    "slug": "my-school",
    "timezone": "Asia/Manila"
  }'
```

### ✅ Tenant-Aware Database Operations
```typescript
import { createTenantAwareClient } from '@pems/database'

const client = createTenantAwareClient(prisma)
client.setTenantContext({
  tenantId: 'tenant-uuid',
  isSystemAdmin: false,
  userId: 'user-uuid'
})

// All queries automatically filtered by tenant
const users = await client.tenantClient.user.findMany()
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Layer     │    │  Business Logic  │    │   Data Layer    │
│                 │    │                  │    │                 │
│ • REST APIs     │◄──►│ • Tenant Service │◄──►│ • PostgreSQL    │
│ • Middleware    │    │ • Domain Events  │    │ • RLS Policies  │
│ • Validation    │    │ • Repositories   │    │ • UUIDv7 IDs    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛡️ Security Features

- **Database-Level**: RLS prevents any cross-tenant access
- **Application-Level**: Middleware validates tenant context
- **API-Level**: Authentication and authorization
- **Audit Trail**: All operations logged with tenant context

## 📊 Testing Your Setup

### 1. Verify RLS is Working
```sql
-- Connect to database
psql -U pems_app -d pems_dev

-- Check RLS status
SELECT tablename, relrowsecurity
FROM pg_tables
WHERE tablename IN ('Student', 'Account', 'Transaction');
```

### 2. Test Tenant Isolation
```bash
# Create test tenants
./scripts/create-test-tenants.sh

# Run isolation tests
psql "$DATABASE_URL" < scripts/test-tenant-isolation.sql
```

### 3. API Health Check
```bash
curl http://localhost:3002/api/tenants \
  -H "Authorization: Bearer mock-super-admin-token"
```

## 🚀 Deployment

### Development
```bash
pnpm dev                    # Start development server
pnpm test                   # Run tests
pnpm build                  # Build for production
```

### Production
```bash
# Build application
pnpm build

# Start production server
cd apps/api && pnpm start

# Or use PM2
pm2 start ecosystem.config.js
```

### Database Migration (Production)
```bash
# Apply migrations to production
DATABASE_URL="postgresql://user:pass@prod-host:5432/pems_prod" \
pnpm db:migrate

# Verify RLS policies
psql "$DATABASE_URL" -c "SELECT schemaname, tablename, policyname FROM pg_policies;"
```

## 📁 Project Structure

```
packages/infrastructure/
├── database/           # Database client and RLS
├── middleware/         # Tenant context middleware
└── auth/              # Authentication (future)

modules/tenant-management/
├── src/
│   ├── domain/        # Business entities and rules
│   ├── application/   # Use cases and services
│   ├── infrastructure/# Repository implementation
│   └── presentation/ # API controllers
└── tests/            # Test suites

apps/api/
├── src/
│   └── server.ts     # Main API server
└── dist/            # Built application
```

## 🔍 Monitoring

### Health Endpoints
- `GET /health` - Application and database status
- `GET /api/tenants` - List tenants (admin only)

### Database Monitoring
```sql
-- Monitor RLS performance
EXPLAIN ANALYZE SELECT * FROM "Student" WHERE tenant_id = 'uuid';

-- Check active sessions
SELECT * FROM pg_stat_activity WHERE datname = 'pems_dev';
```

## 🆘 Troubleshooting

### Common Issues

1. **RLS Not Working**
   ```bash
   # Check if policies are enabled
   psql $DATABASE_URL -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'Student';"
   ```

2. **Database Connection Issues**
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Migration Failures**
   ```bash
   # Reset database
   cd packages/infrastructure/database
   pnpm db:reset
   pnpm db:migrate --name init
   ```

### Getting Help

1. Check logs: `tail -f logs/api.log`
2. Run health check: `curl http://localhost:3002/health`
3. Review test results: `./scripts/run-tests.sh`
4. Check documentation: `docs/PO-3-IMPLEMENTATION-SUMMARY.md`

## 🎯 Next Steps

1. **Configure Authentication**: Set up BetterAuth integration
2. **Create First Tenant**: Use API or database seed script
3. **Test Isolation**: Run comprehensive test suite
4. **Deploy to Staging**: Validate in staging environment
5. **Production Deployment**: Follow deployment guide

## 📖 Additional Documentation

- [Implementation Summary](docs/PO-3-IMPLEMENTATION-SUMMARY.md)
- [Architecture Deep Dive](docs/ARCHITECTURE-DEEP-DIVE.md)
- [Deployment Guide](scripts/deploy-multitenancy.md)
- [Testing Guide](scripts/testing-guide.md)

---

**🎉 Congratulations!** You have successfully implemented multi-tenant architecture for PEMS. The system is now ready to support multiple schools with complete data isolation and security.