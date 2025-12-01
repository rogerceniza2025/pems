# Multi-Tenant Architecture Deep Dive

## Overview

This document provides a comprehensive explanation of the multi-tenant architecture implementation in PEMS, explaining the technical decisions, security measures, and operational considerations.

## Architecture Layers

### 1. Database Layer (Foundation)

#### Row-Level Security (RLS)
```sql
-- Core isolation function
CREATE OR REPLACE FUNCTION check_tenant_access(table_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN table_tenant_id = current_setting('app.current_tenant_id', true)::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key Concepts:**
- **RLS Policies**: Applied to all tenant-aware tables
- **Session Variables**: `app.current_tenant_id`, `app.is_system_admin`
- **Automatic Filtering**: Database enforces tenant boundaries

#### Database Schema Design
```sql
-- Tenant-aware table pattern
CREATE TABLE "Student" (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    tenant_id UUID NOT NULL REFERENCES "Tenant"(id),
    -- Other columns...
    UNIQUE(tenant_id, student_no)  -- Tenant-scoped uniqueness
);

-- RLS Policy
CREATE POLICY student_tenant_isolation ON "Student"
    FOR ALL TO authenticated_role
    USING (check_tenant_access(tenant_id))
    WITH CHECK (check_tenant_access(tenant_id));
```

### 2. Infrastructure Layer (Security Foundation)

#### Tenant Context Middleware
```typescript
export const tenantContextMiddleware = (prisma: PrismaClient) => {
  return async (c: Context, next: Next) => {
    // Extract tenant from auth token
    const authPayload = await extractAuthPayload(token, prisma)

    // Set tenant context in request
    c.set(TENANT_CONTEXT_KEY, tenantContext)

    // Configure database session for RLS
    await configureDatabaseSession(prisma, tenantContext)

    await next()
  }
}
```

**Responsibilities:**
- Token validation and tenant extraction
- Database session configuration
- Context injection for downstream handlers

#### Tenant-Aware Database Client
```typescript
export class TenantAwarePrismaClient {
  setTenantContext(context: TenantContext): void {
    this.tenantContext = context
    this.configureDatabaseSession(context)
  }

  get tenantClient() {
    return this.createTenantAwareProxy()  // Auto-filters queries by tenant
  }
}
```

**Features:**
- Automatic tenant filtering on all queries
- Transaction support with tenant context
- Raw query execution with tenant safety

### 3. Domain Layer (Business Logic)

#### Tenant Entity
```typescript
export interface TenantDomainEntity {
  id: string              // UUIDv7
  name: string           // Human readable
  slug: string          // URL-friendly identifier
  timezone: string       // Tenant's timezone
  metadata: Record<string, unknown>  // Flexible configuration
  createdAt: Date
  updatedAt: Date
}
```

#### Domain Events
```typescript
export interface TenantCreatedEvent {
  type: 'TENANT_CREATED'
  tenantId: string
  name: string
  slug: string
  occurredAt: Date
}
```

**Benefits:**
- Loose coupling between modules
- Audit trail through events
- Extensibility for future features

### 4. Application Layer (Use Cases)

#### Tenant Service
```typescript
export class TenantService {
  async createTenant(data: CreateTenantSchema): Promise<TenantDomainEntity> {
    // Business rules validation
    if (await this.tenantRepository.existsBySlug(data.slug)) {
      throw new TenantSlugAlreadyExistsError(data.slug)
    }

    const tenant = await this.tenantRepository.create(data)

    // Emit domain event
    this.addDomainEvent<TenantCreatedEvent>({
      type: 'TENANT_CREATED',
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      occurredAt: new Date()
    })

    return tenant
  }
}
```

### 5. Presentation Layer (API)

#### REST API Controller
```typescript
export function createTenantRoutes(tenantService: ITenantService): Hono {
  const app = new Hono()

  app.post('/tenants', zValidator('json', CreateTenantSchema), async (c) => {
    const data = c.req.valid('json')
    const tenant = await tenantService.createTenant(data)
    return c.json({ success: true, data: tenant }, 201)
  })

  return app
}
```

## Security Architecture

### Defense in Depth

1. **Database Level (RLS)**
   - Prevents any cross-tenant data access
   - Works even if application layer is compromised
   - Automatic and cannot be bypassed

2. **Application Level (Middleware)**
   - Context validation and injection
   - Request-level security checks
   - Centralized security logic

3. **API Level (Controllers)**
   - Input validation
   - Authorization checks
   - Rate limiting considerations

### Access Control Model

```typescript
interface TenantContext {
  tenantId: string        // Current tenant
  isSystemAdmin: boolean  // Override flag
  userId: string         // Current user
}
```

**Access Patterns:**
- **Regular User**: Can only access their tenant's data
- **System Admin**: Can access all tenant data
- **Tenant Admin**: Can manage their tenant's users and settings

## Data Isolation Strategies

### 1. Row-Level Security (Primary)
- Automatic tenant filtering
- Cannot be bypassed
- Maintains referential integrity

### 2. Application-Level Filtering (Secondary)
- Additional safety net
- Performance optimization
- Business rule enforcement

### 3. Connection-Level Isolation (Future)
- Separate databases per tenant
- Physical isolation
- Ultimate security boundary

## Performance Considerations

### Database Optimization

1. **Indexing Strategy**
```sql
-- Tenant-first indexing
CREATE INDEX idx_student_tenant_id ON "Student" (tenant_id);
CREATE UNIQUE INDEX idx_student_tenant_email ON "Student" (tenant_id, email);

-- Composite indexes for common queries
CREATE INDEX idx_student_tenant_active ON "Student" (tenant_id, active);
```

2. **Query Patterns**
```sql
-- Good: Tenant-first queries
SELECT * FROM "Student" WHERE tenant_id = $1 AND active = true;

-- Bad: Non-tenant-specific queries (filtered by RLS anyway)
SELECT * FROM "Student" WHERE active = true;
```

3. **Connection Pooling**
- Shared connection pool with tenant context
- Session variable management
- Connection reuse efficiency

### Application Performance

1. **Caching Strategy**
```typescript
// Tenant-aware caching
const cacheKey = `tenant:${tenantId}:students:${filtersHash}`
const cached = await cache.get(cacheKey)
if (cached) return cached

const result = await tenantClient.student.findMany({ where: filters })
await cache.set(cacheKey, result, 300) // 5 minutes
```

2. **Lazy Loading**
- Load tenant context on-demand
- Efficient database session management
- Resource cleanup

## Monitoring and Observability

### Key Metrics

1. **Security Metrics**
- Cross-tenant access attempts
- Failed authentication attempts
- Policy violation counts

2. **Performance Metrics**
- Query response times by tenant
- Database connection utilization
- RLS policy overhead

3. **Business Metrics**
- Tenant creation rates
- Active tenant counts
- Data volume by tenant

### Monitoring Implementation

```typescript
// Middleware for request tracking
app.use('*', async (c, next) => {
  const start = Date.now()
  const tenantId = c.get('tenantId')

  await next()

  const duration = Date.now() - start

  // Log tenant-specific metrics
  logger.info('Request completed', {
    tenantId,
    path: c.req.path,
    method: c.req.method,
    duration,
    status: c.res.status
  })
})
```

## Operational Considerations

### Backup Strategy

1. **Tenant-Level Backups**
```sql
-- Backup specific tenant data
pg_dump -h localhost -U pems_app -d pems_prod \
  --where="tenant_id = 'tenant-uuid'" \
  --file=tenant-backup.sql
```

2. **Point-in-Time Recovery**
- WAL archiving for all tenants
- Selective tenant recovery
- Minimize cross-tenant impact

### Scaling Strategies

1. **Vertical Scaling**
- Increase database resources
- Optimize queries and indexes
- Implement connection pooling

2. **Horizontal Scaling**
- Read replicas for reporting
- API server load balancing
- Tenant-aware caching layers

3. **Functional Decomposition**
- Separate services by domain
- Tenant-specific microservices
- Event-driven architecture

## Development Workflow

### Testing Strategy

1. **Unit Tests**
- Business logic validation
- Domain event testing
- Error handling verification

2. **Integration Tests**
- RLS policy verification
- API endpoint testing
- Cross-tenant access prevention

3. **Security Tests**
- Penetration testing
- Data leakage verification
- Performance under load

### Deployment Pipeline

1. **Database Migration**
```bash
# Apply RLS policies
pnpm db:migrate

# Verify policies
psql $DATABASE_URL -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE '%';"
```

2. **Application Deployment**
- Zero-downtime deployments
- Rolling updates with tenant awareness
- Health checks and monitoring

3. **Rollback Strategy**
- Database migration rollback
- Application version rollback
- Tenant-specific rollback options

## Future Enhancements

### Advanced Features

1. **Tenant-Specific Configuration**
```typescript
interface TenantConfiguration {
  features: {
    advancedReporting: boolean
    customIntegrations: boolean
    prioritySupport: boolean
  }
  limits: {
    maxUsers: number
    storageQuota: number
    apiRateLimit: number
  }
  branding: {
    logo: string
    colors: {
      primary: string
      secondary: string
    }
    customDomain?: string
  }
}
```

2. **Multi-Database Support**
- PostgreSQL for production
- MySQL for compatibility
- MongoDB for flexible schemas

3. **Hybrid Architecture**
- Core tenants on shared infrastructure
- Large tenants on dedicated resources
- Seamless migration between tiers

### Performance Optimizations

1. **Query Optimization**
- Tenant-aware query hints
- Automatic query optimization
- Performance monitoring

2. **Caching Enhancements**
- Distributed caching by tenant
- Intelligent cache invalidation
- Edge caching for static content

3. **Database Improvements**
- Partitioning by tenant
- Materialized views for reporting
- Read replicas with tenant routing

## Conclusion

This multi-tenant architecture provides a robust, secure, and scalable foundation for PEMS to serve multiple educational institutions. The implementation follows industry best practices and provides multiple layers of security and performance optimization.

The key strengths of this architecture are:

1. **Security**: Defense in depth with RLS and application-level controls
2. **Scalability**: Designed to grow from hundreds to thousands of tenants
3. **Maintainability**: Clean architecture with clear separation of concerns
4. **Performance**: Optimized for tenant-specific workloads
5. **Flexibility**: Extensible for future requirements and features

This architecture positions PEMS for successful growth as a multi-tenant SaaS platform while maintaining the highest standards of security and performance.