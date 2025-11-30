# Sprint 1 Test Templates

## Overview

This document provides comprehensive test templates for Sprint 1 stories following TDD principles. These templates include unit tests, integration tests, and E2E tests for each user story in Sprint 1: Core Tenant Management & Authentication.

## Sprint 1 Stories

1. Multi-Tenant Architecture
2. User Authentication System
3. Permission-Based Navigation

---

## Story 1: Multi-Tenant Architecture

### User Story
**As a** system administrator,  
**I want** to manage multiple schools/tenants,  
**So that** each institution has isolated data and configuration.

### Acceptance Criteria
- New tenants can be created with unique identifiers
- Tenant isolation is enforced at database level
- Row-Level Security (RLS) is implemented (ADR-004)
- Tenant context is properly injected in all requests
- Data leakage between tenants is prevented

### Technical Tasks
- Implement tenant management domain module (ADR-002)
- Set up PostgreSQL RLS policies (ADR-004)
- Create tenant isolation middleware
- Implement tenant context injection
- Add tenant-aware database queries
- Implement UUIDv7 for tenant IDs (ADR-005)
- Use Prisma with repository pattern (ADR-006)
- Follow modular monolith boundaries (ADR-013)
- Write comprehensive tests for tenant isolation

## Test Templates

### Unit Tests

#### Tenant Entity Tests
Location: `tests/unit/domain/tenant/Tenant.entity.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Tenant } from '@domain/tenant/Tenant.entity';
import { TenantType } from '@domain/tenant/TenantType.enum';
import { v7 as uuidv7 } from 'uuid';

describe('Tenant Entity', () => {
  let tenant: Tenant;

  beforeEach(() => {
    tenant = new Tenant({
      id: uuidv7(),
      name: 'Test School',
      code: 'TEST-SCHOOL',
      type: TenantType.ELEMENTARY,
      address: '123 Test Street',
      phone: '+639123456789',
      email: 'test@school.edu.ph',
      isActive: true
    });
  });

  describe('Tenant Creation', () => {
    it('should create a valid tenant with required fields', () => {
      expect(tenant.id).toBeDefined();
      expect(tenant.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(tenant.name).toBe('Test School');
      expect(tenant.code).toBe('TEST-SCHOOL');
      expect(tenant.type).toBe(TenantType.ELEMENTARY);
      expect(tenant.isActive).toBe(true);
    });

    it('should generate UUIDv7 for tenant ID', () => {
      const anotherTenant = new Tenant({
        name: 'Another School',
        code: 'ANOTHER-SCHOOL',
        type: TenantType.HIGHER_ED,
        address: '456 Another Street',
        phone: '+639987654321',
        email: 'another@school.edu.ph',
        isActive: true
      });

      expect(anotherTenant.id).toBeDefined();
      expect(anotherTenant.id).not.toBe(tenant.id);
      
      // Verify UUIDv7 format (timestamp-based)
      const timestamp = parseInt(anotherTenant.id.substring(0, 8), 16);
      const now = Date.now();
      expect(timestamp).toBeLessThanOrEqual(now);
      expect(timestamp).toBeGreaterThan(now - 10000); // Within last 10 seconds
    });

    it('should validate tenant code format', () => {
      expect(() => {
        new Tenant({
          name: 'Test School',
          code: 'INVALID CODE WITH SPACES',
          type: TenantType.ELEMENTARY,
          address: '123 Test Street',
          phone: '+639123456789',
          email: 'test@school.edu.ph',
          isActive: true
        });
      }).toThrow('Tenant code must contain only letters, numbers, and hyphens');
    });

    it('should validate email format', () => {
      expect(() => {
        new Tenant({
          name: 'Test School',
          code: 'TEST-SCHOOL',
          type: TenantType.ELEMENTARY,
          address: '123 Test Street',
          phone: '+639123456789',
          email: 'invalid-email',
          isActive: true
        });
      }).toThrow('Invalid email format');
    });

    it('should validate phone format', () => {
      expect(() => {
        new Tenant({
          name: 'Test School',
          code: 'TEST-SCHOOL',
          type: TenantType.ELEMENTARY,
          address: '123 Test Street',
          phone: 'invalid-phone',
          email: 'test@school.edu.ph',
          isActive: true
        });
      }).toThrow('Invalid phone format');
    });
  });

  describe('Tenant Business Logic', () => {
    it('should activate tenant by default', () => {
      const newTenant = new Tenant({
        name: 'New School',
        code: 'NEW-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '789 New Street',
        phone: '+639111222333',
        email: 'new@school.edu.ph'
      });

      expect(newTenant.isActive).toBe(true);
    });

    it('should allow tenant deactivation', () => {
      tenant.deactivate();
      expect(tenant.isActive).toBe(false);
    });

    it('should allow tenant reactivation', () => {
      tenant.deactivate();
      tenant.activate();
      expect(tenant.isActive).toBe(true);
    });

    it('should validate tenant type', () => {
      expect(() => {
        new Tenant({
          name: 'Test School',
          code: 'TEST-SCHOOL',
          type: 'INVALID_TYPE' as any,
          address: '123 Test Street',
          phone: '+639123456789',
          email: 'test@school.edu.ph',
          isActive: true
        });
      }).toThrow('Invalid tenant type');
    });

    it('should generate tenant code from name if not provided', () => {
      const autoCodeTenant = new Tenant({
        name: 'Test University of the Philippines',
        type: TenantType.HIGHER_ED,
        address: '123 UP Street',
        phone: '+639123456789',
        email: 'up@edu.ph'
      });

      expect(autoCodeTenant.code).toBe('TEST-UNIVERSITY-OF-THE');
    });
  });

  describe('Tenant Equality', () => {
    it('should consider tenants equal with same ID', () => {
      const anotherTenant = new Tenant({
        id: tenant.id,
        name: 'Different Name',
        code: 'DIFFERENT-CODE',
        type: TenantType.SECONDARY,
        address: 'Different Address',
        phone: '+639987654321',
        email: 'different@school.edu.ph',
        isActive: false
      });

      expect(tenant.equals(anotherTenant)).toBe(true);
    });

    it('should consider tenants different with different IDs', () => {
      const anotherTenant = new Tenant({
        id: uuidv7(),
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true
      });

      expect(tenant.equals(anotherTenant)).toBe(false);
    });
  });
});
```

#### Tenant Service Tests
Location: `tests/unit/domain/tenant/TenantService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantService } from '@domain/tenant/TenantService';
import { TenantRepository } from '@infrastructure/database/TenantRepository';
import { Tenant } from '@domain/tenant/Tenant.entity';
import { TenantType } from '@domain/tenant/TenantType.enum';

// Mock dependencies
vi.mock('@infrastructure/database/TenantRepository');

describe('TenantService', () => {
  let tenantService: TenantService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByCode: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      existsByCode: vi.fn()
    };
    
    TenantService.prototype.repository = mockRepository;
    tenantService = new TenantService();
  });

  describe('Tenant Creation', () => {
    it('should create a new tenant successfully', async () => {
      const tenantData = {
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      };

      const expectedTenant = new Tenant(tenantData);
      mockRepository.create.mockResolvedValue(expectedTenant);
      mockRepository.existsByCode.mockResolvedValue(false);

      const result = await tenantService.createTenant(tenantData);

      expect(result).toEqual(expectedTenant);
      expect(mockRepository.existsByCode).toHaveBeenCalledWith('TEST-SCHOOL');
      expect(mockRepository.create).toHaveBeenCalledWith(tenantData);
    });

    it('should throw error if tenant code already exists', async () => {
      const tenantData = {
        name: 'Test School',
        code: 'EXISTING-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      };

      mockRepository.existsByCode.mockResolvedValue(true);

      await expect(tenantService.createTenant(tenantData)).rejects.toThrow(
        'Tenant with code EXISTING-SCHOOL already exists'
      );
    });

    it('should validate tenant data before creation', async () => {
      const invalidTenantData = {
        name: '',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      };

      await expect(tenantService.createTenant(invalidTenantData)).rejects.toThrow(
        'Tenant name is required'
      );
    });
  });

  describe('Tenant Retrieval', () => {
    it('should find tenant by ID', async () => {
      const tenantId = 'tenant-id-123';
      const expectedTenant = new Tenant({
        id: tenantId,
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true
      });

      mockRepository.findById.mockResolvedValue(expectedTenant);

      const result = await tenantService.getTenantById(tenantId);

      expect(result).toEqual(expectedTenant);
      expect(mockRepository.findById).toHaveBeenCalledWith(tenantId);
    });

    it('should return null when tenant not found by ID', async () => {
      const tenantId = 'nonexistent-tenant';
      mockRepository.findById.mockResolvedValue(null);

      const result = await tenantService.getTenantById(tenantId);

      expect(result).toBeNull();
      expect(mockRepository.findById).toHaveBeenCalledWith(tenantId);
    });

    it('should find tenant by code', async () => {
      const tenantCode = 'TEST-SCHOOL';
      const expectedTenant = new Tenant({
        id: 'tenant-id-123',
        name: 'Test School',
        code: tenantCode,
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true
      });

      mockRepository.findByCode.mockResolvedValue(expectedTenant);

      const result = await tenantService.getTenantByCode(tenantCode);

      expect(result).toEqual(expectedTenant);
      expect(mockRepository.findByCode).toHaveBeenCalledWith(tenantCode);
    });

    it('should return all active tenants', async () => {
      const expectedTenants = [
        new Tenant({
          id: 'tenant-1',
          name: 'School 1',
          code: 'SCHOOL-1',
          type: TenantType.ELEMENTARY,
          address: 'Address 1',
          phone: '+639111111111',
          email: 'school1@edu.ph',
          isActive: true
        }),
        new Tenant({
          id: 'tenant-2',
          name: 'School 2',
          code: 'SCHOOL-2',
          type: TenantType.SECONDARY,
          address: 'Address 2',
          phone: '+639222222222',
          email: 'school2@edu.ph',
          isActive: true
        })
      ];

      mockRepository.findAll.mockResolvedValue(expectedTenants);

      const result = await tenantService.getAllActiveTenants();

      expect(result).toEqual(expectedTenants);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe('Tenant Updates', () => {
    it('should update tenant information', async () => {
      const tenantId = 'tenant-id-123';
      const updateData = {
        name: 'Updated School Name',
        address: '456 Updated Address'
      };

      const existingTenant = new Tenant({
        id: tenantId,
        name: 'Original School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Original Address',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true
      });

      const updatedTenant = new Tenant({
        ...existingTenant,
        ...updateData
      });

      mockRepository.findById.mockResolvedValue(existingTenant);
      mockRepository.update.mockResolvedValue(updatedTenant);

      const result = await tenantService.updateTenant(tenantId, updateData);

      expect(result).toEqual(updatedTenant);
      expect(mockRepository.findById).toHaveBeenCalledWith(tenantId);
      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, updateData);
    });

    it('should throw error when updating non-existent tenant', async () => {
      const tenantId = 'nonexistent-tenant';
      const updateData = { name: 'Updated Name' };

      mockRepository.findById.mockResolvedValue(null);

      await expect(tenantService.updateTenant(tenantId, updateData)).rejects.toThrow(
        'Tenant not found'
      );
    });
  });

  describe('Tenant Deletion', () => {
    it('should deactivate tenant instead of deleting', async () => {
      const tenantId = 'tenant-id-123';
      const existingTenant = new Tenant({
        id: tenantId,
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph',
        isActive: true
      });

      mockRepository.findById.mockResolvedValue(existingTenant);
      mockRepository.update.mockResolvedValue({ ...existingTenant, isActive: false });

      await tenantService.deleteTenant(tenantId);

      expect(mockRepository.findById).toHaveBeenCalledWith(tenantId);
      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, { isActive: false });
    });

    it('should throw error when deleting non-existent tenant', async () => {
      const tenantId = 'nonexistent-tenant';

      mockRepository.findById.mockResolvedValue(null);

      await expect(tenantService.deleteTenant(tenantId)).rejects.toThrow(
        'Tenant not found'
      );
    });
  });
});
```

#### Tenant Isolation Tests
Location: `tests/unit/domain/tenant/TenantIsolation.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantIsolation } from '@domain/tenant/TenantIsolation';
import { TenantContext } from '@domain/tenant/TenantContext';

describe('Tenant Isolation', () => {
  let tenantIsolation: TenantIsolation;
  let mockTenantContext: any;

  beforeEach(() => {
    mockTenantContext = {
      getCurrentTenant: vi.fn(),
      setCurrentTenant: vi.fn(),
      clearCurrentTenant: vi.fn()
    };
    
    tenantIsolation = new TenantIsolation(mockTenantContext);
  });

  describe('Tenant Context Management', () => {
    it('should set current tenant context', () => {
      const tenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL',
        name: 'Test School'
      };

      tenantIsolation.setCurrentTenant(tenant);

      expect(mockTenantContext.setCurrentTenant).toHaveBeenCalledWith(tenant);
    });

    it('should get current tenant context', () => {
      const expectedTenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL',
        name: 'Test School'
      };

      mockTenantContext.getCurrentTenant.mockReturnValue(expectedTenant);

      const result = tenantIsolation.getCurrentTenant();

      expect(result).toEqual(expectedTenant);
      expect(mockTenantContext.getCurrentTenant).toHaveBeenCalled();
    });

    it('should clear current tenant context', () => {
      tenantIsolation.clearCurrentTenant();

      expect(mockTenantContext.clearCurrentTenant).toHaveBeenCalled();
    });
  });

  describe('Data Isolation', () => {
    it('should enforce tenant isolation in database queries', () => {
      const tenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL'
      };

      mockTenantContext.getCurrentTenant.mockReturnValue(tenant);

      const query = tenantIsolation.applyTenantIsolation('SELECT * FROM users');

      expect(query).toContain('WHERE tenant_id =');
      expect(query).toContain('tenant-123');
    });

    it('should prevent cross-tenant data access', () => {
      const currentTenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL'
      };

      const otherTenant = {
        id: 'tenant-456',
        code: 'OTHER-SCHOOL'
      };

      mockTenantContext.getCurrentTenant.mockReturnValue(currentTenant);

      const canAccess = tenantIsolation.canAccessTenantData(otherTenant.id);

      expect(canAccess).toBe(false);
    });

    it('should allow same-tenant data access', () => {
      const tenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL'
      };

      mockTenantContext.getCurrentTenant.mockReturnValue(tenant);

      const canAccess = tenantIsolation.canAccessTenantData(tenant.id);

      expect(canAccess).toBe(true);
    });

    it('should validate tenant isolation in business logic', () => {
      const currentTenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL'
      };

      const dataFromOtherTenant = {
        tenantId: 'tenant-456',
        data: 'sensitive data'
      };

      mockTenantContext.getCurrentTenant.mockReturnValue(currentTenant);

      expect(() => {
        tenantIsolation.validateTenantAccess(dataFromOtherTenant);
      }).toThrow('Access denied: Data belongs to different tenant');
    });
  });

  describe('Row-Level Security', () => {
    it('should generate RLS policies for tenant isolation', () => {
      const policies = tenantIsolation.generateRLSPolicies();

      expect(policies).toContain('CREATE POLICY tenant_isolation_policy');
      expect(policies).toContain('USING (tenant_id = current_setting(\'app.current_tenant_id\'))');
      expect(policies).toContain('WITH CHECK (tenant_id = current_setting(\'app.current_tenant_id\'))');
    });

    it('should apply RLS to all tenant-specific tables', () => {
      const tables = ['users', 'students', 'courses', 'enrollments'];
      
      tables.forEach(table => {
        const policy = tenantIsolation.generateRLSPolicyForTable(table);
        expect(policy).toContain(`ALTER TABLE ${table}`);
        expect(policy).toContain('ENABLE ROW LEVEL SECURITY');
        expect(policy).toContain('tenant_isolation_policy');
      });
    });

    it('should set tenant context in database session', () => {
      const tenant = {
        id: 'tenant-123',
        code: 'TEST-SCHOOL'
      };

      mockTenantContext.getCurrentTenant.mockReturnValue(tenant);

      const sessionQuery = tenantIsolation.setTenantContextInSession();

      expect(sessionQuery).toContain('SET app.current_tenant_id =');
      expect(sessionQuery).toContain('tenant-123');
    });
  });
});
```

### Integration Tests

#### Tenant Repository Integration Tests
Location: `tests/integration/domain/tenant/TenantRepository.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TenantRepository } from '@infrastructure/database/TenantRepository';
import { Tenant } from '@domain/tenant/Tenant.entity';
import { TenantType } from '@domain/tenant/TenantType.enum';

describe('TenantRepository Integration', () => {
  let repository: TenantRepository;
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_test'
        }
      }
    });

    repository = new TenantRepository(prisma);
    await prisma.tenant.deleteMany();
  });

  afterEach(async () => {
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  describe('Tenant Creation', () => {
    it('should create tenant in database', async () => {
      const tenantData = {
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      };

      const result = await repository.create(tenantData);

      expect(result).toBeDefined();
      expect(result.name).toBe(tenantData.name);
      expect(result.code).toBe(tenantData.code);
      expect(result.type).toBe(tenantData.type);
      expect(result.address).toBe(tenantData.address);
      expect(result.phone).toBe(tenantData.phone);
      expect(result.email).toBe(tenantData.email);
      expect(result.isActive).toBe(true);
    });

    it('should enforce unique tenant code constraint', async () => {
      const tenantData = {
        name: 'Test School 1',
        code: 'DUPLICATE-CODE',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test1@school.edu.ph'
      };

      await repository.create(tenantData);

      const duplicateData = {
        name: 'Test School 2',
        code: 'DUPLICATE-CODE',
        type: TenantType.SECONDARY,
        address: '456 Test Street',
        phone: '+639987654321',
        email: 'test2@school.edu.ph'
      };

      await expect(repository.create(duplicateData)).rejects.toThrow();
    });
  });

  describe('Tenant Retrieval', () => {
    it('should find tenant by ID', async () => {
      const tenantData = {
        name: 'Test School',
        code: 'TEST-SCHOOL',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      };

      const created = await repository.create(tenantData);
      const found = await repository.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should return null for non-existent tenant ID', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should find tenant by code', async () => {
      const tenantData = {
        name: 'Test School',
        code: 'FIND-BY-CODE',
        type: TenantType.ELEMENTARY,
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      };

      const created = await repository.create(tenantData);
      const found = await repository.findByCode('FIND-BY-CODE');

      expect(found).toEqual(created);
    });

    it('should return null for non-existent tenant code', async () => {
      const found = await repository.findByCode('NON-EXISTENT-CODE');
      expect(found).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce tenant isolation at database level', async () => {
      // Create two tenants
      const tenant1 = await repository.create({
        name: 'School 1',
        code: 'SCHOOL-1',
        type: TenantType.ELEMENTARY,
        address: 'Address 1',
        phone: '+639111111111',
        email: 'school1@edu.ph'
      });

      const tenant2 = await repository.create({
        name: 'School 2',
        code: 'SCHOOL-2',
        type: TenantType.SECONDARY,
        address: 'Address 2',
        phone: '+639222222222',
        email: 'school2@edu.ph'
      });

      // Set tenant context to tenant1
      await prisma.$executeRaw`SET app.current_tenant_id = ${tenant1.id}`;

      // Query with RLS should only return tenant1 data
      const isolatedResult = await prisma.$queryRaw`SELECT * FROM tenants WHERE id = ${tenant2.id}`;
      expect(isolatedResult).toHaveLength(0);

      // Query without RLS should return all data
      await prisma.$executeRaw`RESET app.current_tenant_id`;
      const allResult = await prisma.$queryRaw`SELECT * FROM tenants WHERE id = ${tenant2.id}`;
      expect(allResult).toHaveLength(1);
    });
  });
});
```

### E2E Tests

#### Multi-Tenant Management E2E Tests
Location: `tests/e2e/tenant/multi-tenant-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Multi-Tenant Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as system administrator
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="email"]', 'admin@pems.ph');
    await page.fill('[data-testid="password"]', 'admin-password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('http://localhost:3000/dashboard');
  });

  test('should create new tenant successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/tenants');
    await page.click('[data-testid="create-tenant-button"]');

    // Fill tenant form
    await page.fill('[data-testid="tenant-name"]', 'Test Elementary School');
    await page.fill('[data-testid="tenant-code"]', 'TEST-ELEM');
    await page.selectOption('[data-testid="tenant-type"]', 'ELEMENTARY');
    await page.fill('[data-testid="tenant-address"]', '123 School Street');
    await page.fill('[data-testid="tenant-phone"]', '+639123456789');
    await page.fill('[data-testid="tenant-email"]', 'test@elemschool.edu.ph');

    await page.click('[data-testid="save-tenant-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Tenant created successfully');

    // Verify tenant appears in list
    await expect(page.locator('[data-testid="tenant-list"]')).toContainText('Test Elementary School');
    await expect(page.locator('[data-testid="tenant-list"]')).toContainText('TEST-ELEM');
  });

  test('should validate tenant code uniqueness', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/tenants');
    
    // Create first tenant
    await page.click('[data-testid="create-tenant-button"]');
    await page.fill('[data-testid="tenant-name"]', 'School 1');
    await page.fill('[data-testid="tenant-code"]', 'DUPLICATE-CODE');
    await page.selectOption('[data-testid="tenant-type"]', 'ELEMENTARY');
    await page.fill('[data-testid="tenant-address"]', 'Address 1');
    await page.fill('[data-testid="tenant-phone"]', '+639111111111');
    await page.fill('[data-testid="tenant-email"]', 'school1@edu.ph');
    await page.click('[data-testid="save-tenant-button"]');

    // Try to create second tenant with same code
    await page.goto('http://localhost:3000/admin/tenants');
    await page.click('[data-testid="create-tenant-button"]');
    await page.fill('[data-testid="tenant-name"]', 'School 2');
    await page.fill('[data-testid="tenant-code"]', 'DUPLICATE-CODE');
    await page.selectOption('[data-testid="tenant-type"]', 'SECONDARY');
    await page.fill('[data-testid="tenant-address"]', 'Address 2');
    await page.fill('[data-testid="tenant-phone"]', '+639222222222');
    await page.fill('[data-testid="tenant-email"]', 'school2@edu.ph');
    await page.click('[data-testid="save-tenant-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Tenant code already exists');
  });

  test('should switch between tenants', async ({ page }) => {
    // Create two tenants first
    await createTenant(page, 'School 1', 'SCHOOL-1');
    await createTenant(page, 'School 2', 'SCHOOL-2');

    // Switch to School 1
    await page.goto('http://localhost:3000/dashboard');
    await page.click('[data-testid="tenant-switcher"]');
    await page.click('[data-testid="tenant-SCHOOL-1"]');

    // Verify context switch
    await expect(page.locator('[data-testid="current-tenant"]')).toContainText('School 1');
    
    // Verify data isolation - should only see School 1 data
    await page.goto('http://localhost:3000/students');
    await expect(page.locator('[data-testid="student-list"]')).toContainText('School 1 Student');
    await expect(page.locator('[data-testid="student-list"]')).not.toContainText('School 2 Student');

    // Switch to School 2
    await page.click('[data-testid="tenant-switcher"]');
    await page.click('[data-testid="tenant-SCHOOL-2"]');

    // Verify context switch
    await expect(page.locator('[data-testid="current-tenant"]')).toContainText('School 2');
    
    // Verify data isolation
    await page.goto('http://localhost:3000/students');
    await expect(page.locator('[data-testid="student-list"]')).toContainText('School 2 Student');
    await expect(page.locator('[data-testid="student-list"]')).not.toContainText('School 1 Student');
  });

  test('should prevent cross-tenant data access', async ({ page }) => {
    // Create two tenants
    await createTenant(page, 'School 1', 'SCHOOL-1');
    await createTenant(page, 'School 2', 'SCHOOL-2');

    // Switch to School 1
    await switchTenant(page, 'SCHOOL-1');

    // Try to access School 2 data directly via URL
    await page.goto('http://localhost:3000/api/tenants/SCHOOL-2/students');

    // Should return 403 or empty data
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
  });

  test('should handle tenant deactivation', async ({ page }) => {
    // Create tenant
    await createTenant(page, 'Test School', 'TEST-SCHOOL');

    // Deactivate tenant
    await page.goto('http://localhost:3000/admin/tenants');
    await page.click('[data-testid="tenant-TEST-SCHOOL"]');
    await page.click('[data-testid="deactivate-tenant"]');
    await page.click('[data-testid="confirm-deactivation"]');

    // Verify tenant is deactivated
    await expect(page.locator('[data-testid="tenant-TEST-SCHOOL"]')).toContainText('Inactive');
    
    // Verify tenant is not available for switching
    await page.click('[data-testid="tenant-switcher"]');
    await expect(page.locator('[data-testid="tenant-TEST-SCHOOL"]')).not.toBeVisible();
  });
});

// Helper functions
async function createTenant(page: any, name: string, code: string) {
  await page.goto('http://localhost:3000/admin/tenants');
  await page.click('[data-testid="create-tenant-button"]');
  await page.fill('[data-testid="tenant-name"]', name);
  await page.fill('[data-testid="tenant-code"]', code);
  await page.selectOption('[data-testid="tenant-type"]', 'ELEMENTARY');
  await page.fill('[data-testid="tenant-address"]', `${name} Address`);
  await page.fill('[data-testid="tenant-phone"]', '+639123456789');
  await page.fill('[data-testid="tenant-email"]', `${code.toLowerCase()}@school.edu.ph`);
  await page.click('[data-testid="save-tenant-button"]');
  await page.waitForSelector('[data-testid="success-message"]');
}

async function switchTenant(page: any, code: string) {
  await page.goto('http://localhost:3000/dashboard');
  await page.click('[data-testid="tenant-switcher"]');
  await page.click(`[data-testid="tenant-${code}"]`);
  await page.waitForSelector(`[data-testid="current-tenant"]`);
}
```

---

## Story 2: User Authentication System

### User Story
**As a** user,  
**I want** to securely log in to the system,  
**So that** I can access my school's data.

### Acceptance Criteria
- Users can register with email and password
- Login/logout functionality works correctly
- Password reset functionality is implemented
- Multi-factor authentication is supported
- Session management is secure
- Authentication is tenant-aware

### Technical Tasks
- Implement BetterAuth integration (ADR-018)
- Create user management domain module (ADR-002)
- Implement password hashing and validation
- Set up session management
- Create authentication middleware
- Implement role-based access control (RBAC)
- Use PostgreSQL as single source of truth (ADR-017)
- Write authentication tests

## Test Templates

### Unit Tests

#### User Entity Tests
Location: `tests/unit/domain/user/User.entity.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '@domain/user/User.entity';
import { UserRole } from '@domain/user/UserRole.enum';
import { v7 as uuidv7 } from 'uuid';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User({
      id: uuidv7(),
      tenantId: 'tenant-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.TEACHER,
      isActive: true,
      passwordHash: 'hashed-password'
    });
  });

  describe('User Creation', () => {
    it('should create a valid user with required fields', () => {
      expect(user.id).toBeDefined();
      expect(user.tenantId).toBe('tenant-123');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.role).toBe(UserRole.TEACHER);
      expect(user.isActive).toBe(true);
      expect(user.passwordHash).toBe('hashed-password');
    });

    it('should validate email format', () => {
      expect(() => {
        new User({
          id: uuidv7(),
          tenantId: 'tenant-123',
          email: 'invalid-email',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.TEACHER,
          isActive: true,
          passwordHash: 'hashed-password'
        });
      }).toThrow('Invalid email format');
    });

    it('should validate password strength', () => {
      expect(() => {
        new User({
          id: uuidv7(),
          tenantId: 'tenant-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: UserRole.TEACHER,
          isActive: true,
          passwordHash: 'weak'
        });
      }).toThrow('Password does not meet security requirements');
    });

    it('should validate role', () => {
      expect(() => {
        new User({
          id: uuidv7(),
          tenantId: 'tenant-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'INVALID_ROLE' as any,
          isActive: true,
          passwordHash: 'hashed-password'
        });
      }).toThrow('Invalid user role');
    });
  });

  describe('User Business Logic', () => {
    it('should activate user by default', () => {
      const newUser = new User({
        id: uuidv7(),
        tenantId: 'tenant-123',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.STUDENT,
        passwordHash: 'hashed-password'
      });

      expect(newUser.isActive).toBe(true);
    });

    it('should deactivate user', () => {
      user.deactivate();
      expect(user.isActive).toBe(false);
    });

    it('should check if user has specific role', () => {
      expect(user.hasRole(UserRole.TEACHER)).toBe(true);
      expect(user.hasRole(UserRole.ADMIN)).toBe(false);
    });

    it('should check if user has any of multiple roles', () => {
      expect(user.hasAnyRole([UserRole.ADMIN, UserRole.TEACHER])).toBe(true);
      expect(user.hasAnyRole([UserRole.ADMIN, UserRole.PRINCIPAL])).toBe(false);
    });

    it('should get full name', () => {
      expect(user.getFullName()).toBe('Test User');
    });

    it('should update password correctly', () => {
      const newPasswordHash = 'new-hashed-password';
      user.updatePassword(newPasswordHash);
      expect(user.passwordHash).toBe(newPasswordHash);
    });
  });

  describe('User Authentication', () => {
    it('should verify password correctly', () => {
      const correctPassword = 'password123';
      const wrongPassword = 'wrong-password';
      
      // Mock password verification
      const mockVerify = vi.fn().mockImplementation((password: string, hash: string) => {
        return password === 'password123' && hash === 'hashed-password';
      });

      expect(mockVerify(correctPassword, user.passwordHash)).toBe(true);
      expect(mockVerify(wrongPassword, user.passwordHash)).toBe(false);
    });

    it('should track login attempts', () => {
      expect(user.loginAttempts).toBe(0);
      
      user.recordFailedLogin();
      expect(user.loginAttempts).toBe(1);
      
      user.recordFailedLogin();
      user.recordFailedLogin();
      expect(user.loginAttempts).toBe(3);
      
      user.recordSuccessfulLogin();
      expect(user.loginAttempts).toBe(0);
    });

    it('should lock account after too many failed attempts', () => {
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      
      expect(user.isLocked()).toBe(true);
    });

    it('should unlock account', () => {
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      
      expect(user.isLocked()).toBe(true);
      
      user.unlock();
      expect(user.isLocked()).toBe(false);
      expect(user.loginAttempts).toBe(0);
    });
  });
});
```

#### Authentication Service Tests
Location: `tests/unit/domain/auth/AuthenticationService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticationService } from '@domain/auth/AuthenticationService';
import { UserRepository } from '@infrastructure/database/UserRepository';
import { TenantRepository } from '@infrastructure/database/TenantRepository';
import { PasswordService } from '@domain/auth/PasswordService';
import { TokenService } from '@domain/auth/TokenService';
import { User } from '@domain/user/User.entity';
import { UserRole } from '@domain/user/UserRole.enum';

// Mock dependencies
vi.mock('@infrastructure/database/UserRepository');
vi.mock('@infrastructure/database/TenantRepository');
vi.mock('@domain/auth/PasswordService');
vi.mock('@domain/auth/TokenService');

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockUserRepository: any;
  let mockTenantRepository: any;
  let mockPasswordService: any;
  let mockTokenService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    };
    
    mockTenantRepository = {
      findById: vi.fn()
    };
    
    mockPasswordService = {
      hash: vi.fn(),
      verify: vi.fn(),
      validateStrength: vi.fn()
    };
    
    mockTokenService = {
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      verifyToken: vi.fn(),
      revokeToken: vi.fn()
    };

    authService = new AuthenticationService(
      mockUserRepository,
      mockTenantRepository,
      mockPasswordService,
      mockTokenService
    );
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const registrationData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.STUDENT
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      const hashedPassword = 'hashed-secure-password';
      const newUser = new User({
        id: 'user-123',
        tenantId: tenant.id,
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        role: registrationData.role,
        passwordHash: hashedPassword,
        isActive: true
      });

      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockPasswordService.validateStrength.mockReturnValue(true);
      mockPasswordService.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await authService.register(registrationData);

      expect(result).toEqual(newUser);
      expect(mockTenantRepository.findById).toHaveBeenCalledWith('TEST-SCHOOL');
      expect(mockPasswordService.validateStrength).toHaveBeenCalledWith('SecurePassword123!');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('SecurePassword123!');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com', tenant.id);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        tenantId: tenant.id,
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        role: registrationData.role,
        passwordHash: hashedPassword,
        isActive: true
      });
    });

    it('should throw error if tenant does not exist', async () => {
      const registrationData = {
        tenantCode: 'NONEXISTENT',
        email: 'user@example.com',
        password: 'SecurePassword123!',
        firstName: 'User',
        lastName: 'Test',
        role: UserRole.STUDENT
      };

      mockTenantRepository.findById.mockResolvedValue(null);

      await expect(authService.register(registrationData)).rejects.toThrow(
        'Tenant not found'
      );
    });

    it('should throw error if email already exists', async () => {
      const registrationData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        firstName: 'User',
        lastName: 'Test',
        role: UserRole.STUDENT
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      const existingUser = new User({
        id: 'existing-user',
        tenantId: tenant.id,
        email: registrationData.email,
        firstName: 'Existing',
        lastName: 'User',
        role: UserRole.STUDENT,
        passwordHash: 'hashed-password',
        isActive: true
      });

      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(registrationData)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('should throw error if password is too weak', async () => {
      const registrationData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'user@example.com',
        password: 'weak',
        firstName: 'User',
        lastName: 'Test',
        role: UserRole.STUDENT
      };

      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-123' });
      mockPasswordService.validateStrength.mockReturnValue(false);

      await expect(authService.register(registrationData)).rejects.toThrow(
        'Password does not meet security requirements'
      );
    });
  });

  describe('User Login', () => {
    it('should login user successfully with correct credentials', async () => {
      const loginData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'user@example.com',
        password: 'CorrectPassword123!'
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      const user = new User({
        id: 'user-123',
        tenantId: tenant.id,
        email: loginData.email,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.TEACHER,
        passwordHash: 'hashed-password',
        isActive: true
      });

      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-123';

      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(true);
      mockTokenService.generateAccessToken.mockResolvedValue(accessToken);
      mockTokenService.generateRefreshToken.mockResolvedValue(refreshToken);

      const result = await authService.login(loginData);

      expect(result).toEqual({
        user,
        accessToken,
        refreshToken
      });
      expect(mockTenantRepository.findById).toHaveBeenCalledWith('TEST-SCHOOL');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('user@example.com', tenant.id);
      expect(mockPasswordService.verify).toHaveBeenCalledWith('CorrectPassword123!', 'hashed-password');
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(user);
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith(user);
    });

    it('should throw error for invalid tenant', async () => {
      const loginData = {
        tenantCode: 'INVALID-TENANT',
        email: 'user@example.com',
        password: 'CorrectPassword123!'
      };

      mockTenantRepository.findById.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid tenant or credentials'
      );
    });

    it('should throw error for invalid email', async () => {
      const loginData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'invalid@example.com',
        password: 'CorrectPassword123!'
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid tenant or credentials'
      );
    });

    it('should throw error for invalid password', async () => {
      const loginData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'user@example.com',
        password: 'WrongPassword'
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      const user = new User({
        id: 'user-123',
        tenantId: tenant.id,
        email: loginData.email,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.TEACHER,
        passwordHash: 'hashed-password',
        isActive: true
      });

      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid tenant or credentials'
      );
    });

    it('should throw error for inactive user', async () => {
      const loginData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'user@example.com',
        password: 'CorrectPassword123!'
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      const user = new User({
        id: 'user-123',
        tenantId: tenant.id,
        email: loginData.email,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.TEACHER,
        passwordHash: 'hashed-password',
        isActive: false
      });

      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(true);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Account is inactive'
      );
    });

    it('should throw error for locked account', async () => {
      const loginData = {
        tenantCode: 'TEST-SCHOOL',
        email: 'user@example.com',
        password: 'CorrectPassword123!'
      };

      const tenant = { id: 'tenant-123', code: 'TEST-SCHOOL' };
      const user = new User({
        id: 'user-123',
        tenantId: tenant.id,
        email: loginData.email,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.TEACHER,
        passwordHash: 'hashed-password',
        isActive: true
      });

      // Simulate locked account
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();
      user.recordFailedLogin();

      mockTenantRepository.findById.mockResolvedValue(tenant);
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(true);

      await expect(authService.login(loginData)).rejects.toThrow(
        'Account is locked due to too many failed login attempts'
      );
    });
  });

  describe('Token Management', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const user = new User({
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.TEACHER,
        passwordHash: 'hashed-password',
        isActive: true
      });

      const newAccessToken = 'new-access-token-123';

      mockTokenService.verifyToken.mockResolvedValue({ userId: user.id });
      mockUserRepository.findById.mockResolvedValue(user);
      mockTokenService.generateAccessToken.mockResolvedValue(newAccessToken);

      const result = await authService.refreshToken(refreshToken);

      expect(result).toBe(newAccessToken);
      expect(mockTokenService.verifyToken).toHaveBeenCalledWith(refreshToken);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(user.id);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(user);
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockTokenService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should logout user successfully', async () => {
      const accessToken = 'valid-access-token';
      const refreshToken = 'valid-refresh-token';

      await authService.logout(accessToken, refreshToken);

      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(accessToken);
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(refreshToken);
    });
  });
});
```

### Integration Tests

#### Authentication Integration Tests
Location: `tests/integration/domain/auth/AuthenticationService.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuthenticationService } from '@domain/auth/AuthenticationService';
import { UserRepository } from '@infrastructure/database/UserRepository';
import { TenantRepository } from '@infrastructure/database/TenantRepository';
import { PasswordService } from '@infrastructure/auth/PasswordService';
import { TokenService } from '@infrastructure/auth/TokenService';
import { UserRole } from '@domain/user/UserRole.enum';

describe('Authentication Integration', () => {
  let prisma: PrismaClient;
  let authService: AuthenticationService;
  let tenantRepository: TenantRepository;
  let userRepository: UserRepository;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_test'
        }
      }
    });

    tenantRepository = new TenantRepository(prisma);
    userRepository = new UserRepository(prisma);
    
    const passwordService = new PasswordService();
    const tokenService = new TokenService();
    
    authService = new AuthenticationService(
      userRepository,
      tenantRepository,
      passwordService,
      tokenService
    );

    // Clean up test data
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  describe('End-to-End Authentication Flow', () => {
    it('should complete full registration and login flow', async () => {
      // Create tenant
      const tenant = await tenantRepository.create({
        name: 'Test School',
        code: 'AUTH-TEST',
        type: 'ELEMENTARY',
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      });

      // Register user
      const registrationData = {
        tenantCode: 'AUTH-TEST',
        email: 'authuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'Auth',
        lastName: 'User',
        role: UserRole.TEACHER
      };

      const registeredUser = await authService.register(registrationData);

      expect(registeredUser.email).toBe(registrationData.email);
      expect(registeredUser.tenantId).toBe(tenant.id);
      expect(registeredUser.role).toBe(registrationData.role);

      // Login user
      const loginData = {
        tenantCode: 'AUTH-TEST',
        email: 'authuser@example.com',
        password: 'SecurePassword123!'
      };

      const loginResult = await authService.login(loginData);

      expect(loginResult.user.id).toBe(registeredUser.id);
      expect(loginResult.accessToken).toBeDefined();
      expect(loginResult.refreshToken).toBeDefined();
    });

    it('should prevent login with wrong tenant', async () => {
      // Create tenant and user
      const tenant = await tenantRepository.create({
        name: 'Test School',
        code: 'CORRECT-TENANT',
        type: 'ELEMENTARY',
        address: '123 Test Street',
        phone: '+639123456789',
        email: 'test@school.edu.ph'
      });

      await authService.register({
        tenantCode: 'CORRECT-TENANT',
        email: 'user@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.STUDENT
      });

      // Try to login with wrong tenant
      const loginData = {
        tenantCode: 'WRONG-TENANT',
        email: 'user@example.com',
        password: 'SecurePassword123!'
      };

      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid tenant or credentials'
      );
    });

    it('should enforce tenant isolation in authentication', async () => {
      // Create two tenants
      const tenant1 = await tenantRepository.create({
        name: 'School 1',
        code: 'TENANT-1',
        type: 'ELEMENTARY',
        address: 'Address 1',
        phone: '+639111111111',
        email: 'school1@edu.ph'
      });

      const tenant2 = await tenantRepository.create({
        name: 'School 2',
        code: 'TENANT-2',
        type: 'SECONDARY',
        address: 'Address 2',
        phone: '+639222222222',
        email: 'school2@edu.ph'
      });

      // Register same email in both tenants (should be allowed)
      const user1 = await authService.register({
        tenantCode: 'TENANT-1',
        email: 'shared@example.com',
        password: 'SecurePassword123!',
        firstName: 'User',
        lastName: 'One',
        role: UserRole.STUDENT
      });

      const user2 = await authService.register({
        tenantCode: 'TENANT-2',
        email: 'shared@example.com',
        password: 'SecurePassword123!',
        firstName: 'User',
        lastName: 'Two',
        role: UserRole.STUDENT
      });

      // Verify users are in different tenants
      expect(user1.tenantId).toBe(tenant1.id);
      expect(user2.tenantId).toBe(tenant2.id);
      expect(user1.id).not.toBe(user2.id);

      // Login should work for both tenants
      const login1 = await authService.login({
        tenantCode: 'TENANT-1',
        email: 'shared@example.com',
        password: 'SecurePassword123!'
      });

      const login2 = await authService.login({
        tenantCode: 'TENANT-2',
        email: 'shared@example.com',
        password: 'SecurePassword123!'
      });

      expect(login1.user.tenantId).toBe(tenant1.id);
      expect(login2.user.tenantId).toBe(tenant2.id);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords securely', async () => {
      const password = 'PlainPassword123!';
      const hashedPassword = await (authService as any).passwordService.hash(password);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      
      // Verify hash can be verified
      const isValid = await (authService as any).passwordService.verify(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'password123',
        'admin',
        'test'
      ];

      for (const weakPassword of weakPasswords) {
        const isStrong = await (authService as any).passwordService.validateStrength(weakPassword);
        expect(isStrong).toBe(false);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPasswords = [
        'SecurePassword123!',
        'MyComplexP@ssw0rd',
        'Th1sIsAV3ryStrongPassword',
        'P@ssw0rd!WithNumbers'
      ];

      for (const strongPassword of strongPasswords) {
        const isStrong = await (authService as any).passwordService.validateStrength(strongPassword);
        expect(isStrong).toBe(true);
      }
    });
  });
});
```

### E2E Tests

#### Authentication E2E Tests
Location: `tests/e2e/auth/authentication.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should register new user successfully', async ({ page }) => {
    await page.click('[data-testid="register-link"]');
    
    // Fill registration form
    await page.fill('[data-testid="tenant-code"]', 'AUTH-E2E');
    await page.fill('[data-testid="email"]', 'newuser@example.com');
    await page.fill('[data-testid="password"]', 'SecurePassword123!');
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123!');
    await page.fill('[data-testid="first-name"]', 'New');
    await page.fill('[data-testid="last-name"]', 'User');
    await page.selectOption('[data-testid="role"]', 'STUDENT');

    await page.click('[data-testid="register-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');

    // Should redirect to login
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('should validate registration requirements', async ({ page }) => {
    await page.click('[data-testid="register-link"]');
    
    // Try to register with weak password
    await page.fill('[data-testid="tenant-code"]', 'AUTH-E2E');
    await page.fill('[data-testid="email"]', 'weak@example.com');
    await page.fill('[data-testid="password"]', 'weak');
    await page.fill('[data-testid="confirm-password"]', 'weak');
    await page.fill('[data-testid="first-name"]', 'Weak');
    await page.fill('[data-testid="last-name"]', 'User');
    await page.selectOption('[data-testid="role"]', 'STUDENT');

    await page.click('[data-testid="register-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
  });

  test('should login with valid credentials', async ({ page }) => {
    // First register a user
    await registerUser(page, 'LOGIN-TEST', 'loginuser@example.com', 'LoginPassword123!');

    // Now login
    await page.fill('[data-testid="tenant-code"]', 'LOGIN-TEST');
    await page.fill('[data-testid="email"]', 'loginuser@example.com');
    await page.fill('[data-testid="password"]', 'LoginPassword123!');
    await page.click('[data-testid="login-button"]');

    // Verify successful login
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Login User');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="tenant-code"]', 'LOGIN-TEST');
    await page.fill('[data-testid="email"]', 'nonexistent@example.com');
    await page.fill('[data-testid="password"]', 'WrongPassword');
    await page.click('[data-testid="login-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid tenant or credentials');
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.click('[data-testid="forgot-password-link"]');
    
    // Fill password reset form
    await page.fill('[data-testid="tenant-code"]', 'RESET-TEST');
    await page.fill('[data-testid="email"]', 'reset@example.com');
    await page.click('[data-testid="reset-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset link sent');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await registerUser(page, 'LOGOUT-TEST', 'logoutuser@example.com', 'LogoutPassword123!');
    await login(page, 'LOGOUT-TEST', 'logoutuser@example.com', 'LogoutPassword123!');

    // Now logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verify logout
    await expect(page).toHaveURL('http://localhost:3000/login');
    
    // Verify session is cleared
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await registerUser(page, 'SESSION-TEST', 'session@example.com', 'SessionPassword123!');
    await login(page, 'SESSION-TEST', 'session@example.com', 'SessionPassword123!');

    // Navigate to protected page
    await page.goto('http://localhost:3000/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();

    // Simulate session expiration (this would require backend support)
    await page.evaluate(() => {
      // Clear session/token
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Try to access protected page again
    await page.reload();
    
    // Should redirect to login
    await expect(page).toHaveURL('http://localhost:3000/login');
    await expect(page.locator('[data-testid="session-expired"]')).toBeVisible();
  });

  test('should support multi-factor authentication', async ({ page }) => {
    // This would require MFA setup
    await registerUser(page, 'MFA-TEST', 'mfa@example.com', 'MFAPassword123!');
    
    // Enable MFA for user (this would require admin setup)
    await page.goto('http://localhost:3000/profile/security');
    await page.click('[data-testid="enable-mfa"]');
    await page.fill('[data-testid="mfa-code"]', '123456');
    await page.click('[data-testid="verify-mfa"]');

    // Now login with MFA
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="tenant-code"]', 'MFA-TEST');
    await page.fill('[data-testid="email"]', 'mfa@example.com');
    await page.fill('[data-testid="password"]', 'MFAPassword123!');
    await page.click('[data-testid="login-button"]');

    // Should ask for MFA code
    await expect(page.locator('[data-testid="mfa-input"]')).toBeVisible();
    await page.fill('[data-testid="mfa-input"]', '123456');
    await page.click('[data-testid="verify-mfa-login"]');

    // Should login successfully
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });
});

// Helper functions
async function registerUser(page: any, tenantCode: string, email: string, password: string) {
  await page.click('[data-testid="register-link"]');
  await page.fill('[data-testid="tenant-code"]', tenantCode);
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.fill('[data-testid="confirm-password"]', password);
  await page.fill('[data-testid="first-name"]', 'Test');
  await page.fill('[data-testid="last-name"]', 'User');
  await page.selectOption('[data-testid="role"]', 'STUDENT');
  await page.click('[data-testid="register-button"]');
  await page.waitForSelector('[data-testid="success-message"]');
}

async function login(page: any, tenantCode: string, email: string, password: string) {
  await page.fill('[data-testid="tenant-code"]', tenantCode);
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('http://localhost:3000/dashboard');
}
```

---

## Story 3: Permission-Based Navigation

### User Story
**As a** user,  
**I want** to see only the menu items I have access to,  
**So that** the interface is clean and relevant to my role.

### Acceptance Criteria
- Navigation menus are dynamically generated based on permissions
- Role-based menu filtering works correctly
- Permission checks are enforced on both frontend and backend
- Navigation structure is configurable per tenant

### Technical Tasks
- Implement navigation management module (ADR-019)
- Create permission-based menu filtering
- Implement navigation caching for performance
- Create navigation management UI
- Use domain events for module communication (ADR-014)
- Write navigation tests

## Test Templates

### Unit Tests

#### Permission Tests
Location: `tests/unit/domain/permission/Permission.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Permission } from '@domain/permission/Permission.entity';
import { UserRole } from '@domain/user/UserRole.enum';

describe('Permission Entity', () => {
  let permission: Permission;

  beforeEach(() => {
    permission = new Permission({
      id: 'perm-123',
      name: 'view_students',
      description: 'View student information',
      resource: 'students',
      action: 'read',
      roles: [UserRole.ADMIN, UserRole.TEACHER, UserRole.REGISTRAR]
    });
  });

  describe('Permission Creation', () => {
    it('should create a valid permission', () => {
      expect(permission.id).toBe('perm-123');
      expect(permission.name).toBe('view_students');
      expect(permission.description).toBe('View student information');
      expect(permission.resource).toBe('students');
      expect(permission.action).toBe('read');
      expect(permission.roles).toEqual([UserRole.ADMIN, UserRole.TEACHER, UserRole.REGISTRAR]);
    });

    it('should validate permission structure', () => {
      expect(() => {
        new Permission({
          id: 'invalid-perm',
          name: '',
          description: 'Invalid permission',
          resource: '',
          action: '',
          roles: []
        });
      }).toThrow('Permission name is required');
    });
  });

  describe('Permission Checking', () => {
    it('should check if role has permission', () => {
      expect(permission.hasRole(UserRole.ADMIN)).toBe(true);
      expect(permission.hasRole(UserRole.TEACHER)).toBe(true);
      expect(permission.hasRole(UserRole.REGISTRAR)).toBe(true);
      expect(permission.hasRole(UserRole.STUDENT)).toBe(false);
      expect(permission.hasRole(UserRole.PARENT)).toBe(false);
    });

    it('should check if any of multiple roles have permission', () => {
      expect(permission.hasAnyRole([UserRole.STUDENT, UserRole.TEACHER])).toBe(true);
      expect(permission.hasAnyRole([UserRole.STUDENT, UserRole.PARENT])).toBe(false);
    });

    it('should match resource and action', () => {
      expect(permission.matches('students', 'read')).toBe(true);
      expect(permission.matches('students', 'write')).toBe(false);
      expect(permission.matches('users', 'read')).toBe(false);
    });
  });
});
```

#### Navigation Service Tests
Location: `tests/unit/domain/navigation/NavigationService.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationService } from '@domain/navigation/NavigationService';
import { PermissionRepository } from '@infrastructure/database/PermissionRepository';
import { NavigationItem } from '@domain/navigation/NavigationItem.entity';
import { UserRole } from '@domain/user/UserRole.enum';

// Mock dependencies
vi.mock('@infrastructure/database/PermissionRepository');

describe('NavigationService', () => {
  let navigationService: NavigationService;
  let mockPermissionRepository: any;

  beforeEach(() => {
    mockPermissionRepository = {
      findByRole: vi.fn(),
      findAll: vi.fn()
    };

    navigationService = new NavigationService(mockPermissionRepository);
  });

  describe('Navigation Generation', () => {
    it('should generate navigation based on user permissions', async () => {
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'teacher@example.com',
        role: UserRole.TEACHER
      };

      const permissions = [
        new Permission({
          id: 'perm-1',
          name: 'view_students',
          resource: 'students',
          action: 'read',
          roles: [UserRole.ADMIN, UserRole.TEACHER]
        }),
        new Permission({
          id: 'perm-2',
          name: 'view_grades',
          resource: 'grades',
          action: 'read',
          roles: [UserRole.ADMIN, UserRole.TEACHER]
        }),
        new Permission({
          id: 'perm-3',
          name: 'manage_users',
          resource: 'users',
          action: 'write',
          roles: [UserRole.ADMIN]
        })
      ];

      mockPermissionRepository.findByRole.mockResolvedValue(permissions);

      const navigation = await navigationService.generateNavigation(user);

      expect(navigation).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Students',
            path: '/students',
            icon: 'users'
          }),
          expect.objectContaining({
            name: 'Grades',
            path: '/grades',
            icon: 'chart-bar'
          })
        ])
      );

      // Should not include admin-only items
      expect(navigation).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            name: 'User Management'
          })
        ])
      );
    });

    it('should generate full navigation for admin users', async () => {
      const admin = {
        id: 'admin-123',
        tenantId: 'tenant-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      };

      const permissions = [
        new Permission({
          id: 'perm-1',
          name: 'view_students',
          resource: 'students',
          action: 'read',
          roles: [UserRole.ADMIN, UserRole.TEACHER]
        }),
        new Permission({
          id: 'perm-2',
          name: 'manage_users',
          resource: 'users',
          action: 'write',
          roles: [UserRole.ADMIN]
        })
      ];

      mockPermissionRepository.findByRole.mockResolvedValue(permissions);

      const navigation = await navigationService.generateNavigation(admin);

      expect(navigation).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Students'
          }),
          expect.objectContaining({
            name: 'User Management'
          })
        ])
      );
    });

    it('should handle users with no permissions', async () => {
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'noperms@example.com',
        role: UserRole.STUDENT
      };

      mockPermissionRepository.findByRole.mockResolvedValue([]);

      const navigation = await navigationService.generateNavigation(user);

      expect(navigation).toEqual([
        expect.objectContaining({
          name: 'Dashboard',
          path: '/dashboard',
          icon: 'home'
        })
      ]);
    });
  });

  describe('Navigation Caching', () => {
    it('should cache navigation for performance', async () => {
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'teacher@example.com',
        role: UserRole.TEACHER
      };

      const permissions = [
        new Permission({
          id: 'perm-1',
          name: 'view_students',
          resource: 'students',
          action: 'read',
          roles: [UserRole.TEACHER]
        })
      ];

      mockPermissionRepository.findByRole.mockResolvedValue(permissions);

      // First call should hit repository
      const navigation1 = await navigationService.generateNavigation(user);
      expect(mockPermissionRepository.findByRole).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const navigation2 = await navigationService.generateNavigation(user);
      expect(mockPermissionRepository.findByRole).toHaveBeenCalledTimes(1);

      expect(navigation1).toEqual(navigation2);
    });

    it('should invalidate cache when permissions change', async () => {
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'teacher@example.com',
        role: UserRole.TEACHER
      };

      const permissions = [
        new Permission({
          id: 'perm-1',
          name: 'view_students',
          resource: 'students',
          action: 'read',
          roles: [UserRole.TEACHER]
        })
      ];

      mockPermissionRepository.findByRole.mockResolvedValue(permissions);

      // Generate initial navigation
      await navigationService.generateNavigation(user);

      // Invalidate cache
      navigationService.invalidateCache(user.id);

      // Next call should hit repository again
      await navigationService.generateNavigation(user);
      expect(mockPermissionRepository.findByRole).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tenant-Specific Navigation', () => {
    it('should support tenant-specific navigation customization', async () => {
      const user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        email: 'teacher@example.com',
        role: UserRole.TEACHER
      };

      const tenantNavigation = {
        customItems: [
          {
            name: 'School Reports',
            path: '/school-reports',
            icon: 'file-text',
            requiredPermission: 'view_reports'
          }
        ],
        hiddenItems: ['grades'],
        reorderedItems: {
          'students': { order: 1 },
          'school-reports': { order: 0 }
        }
      };

      mockPermissionRepository.findByRole.mockResolvedValue([]);

      const navigation = await navigationService.generateNavigation(user, tenantNavigation);

      expect(navigation).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'School Reports',
            path: '/school-reports'
          })
        ])
      );

      expect(navigation).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            name: 'Grades'
          })
        ])
      );
    });
  });
});
```

### Integration Tests

#### Navigation Integration Tests
Location: `tests/integration/domain/navigation/NavigationService.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { NavigationService } from '@domain/navigation/NavigationService';
import { PermissionRepository } from '@infrastructure/database/PermissionRepository';
import { UserRepository } from '@infrastructure/database/UserRepository';
import { UserRole } from '@domain/user/UserRole.enum';

describe('Navigation Integration', () => {
  let prisma: PrismaClient;
  let navigationService: NavigationService;
  let permissionRepository: PermissionRepository;
  let userRepository: UserRepository;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/pems_test'
        }
      }
    });

    permissionRepository = new PermissionRepository(prisma);
    userRepository = new UserRepository(prisma);
    navigationService = new NavigationService(permissionRepository);

    // Clean up test data
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.tenant.deleteMany();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.$disconnect();
  });

  describe('Permission-Based Navigation', () => {
    it('should generate navigation based on database permissions', async () => {
      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          id: 'nav-tenant-123',
          name: 'Navigation Test School',
          code: 'NAV-TEST',
          type: 'ELEMENTARY',
          address: '123 Test Street',
          phone: '+639123456789',
          email: 'nav@school.edu.ph'
        }
      });

      // Create permissions
      await prisma.permission.createMany({
        data: [
          {
            id: 'perm-students-read',
            name: 'view_students',
            description: 'View student information',
            resource: 'students',
            action: 'read',
            roles: [UserRole.ADMIN, UserRole.TEACHER]
          },
          {
            id: 'perm-grades-read',
            name: 'view_grades',
            description: 'View grade information',
            resource: 'grades',
            action: 'read',
            roles: [UserRole.ADMIN, UserRole.TEACHER]
          },
          {
            id: 'perm-users-write',
            name: 'manage_users',
            description: 'Manage user accounts',
            resource: 'users',
            action: 'write',
            roles: [UserRole.ADMIN]
          }
        ]
      });

      // Create teacher user
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-123',
          tenantId: tenant.id,
          email: 'teacher@nav.edu.ph',
          firstName: 'Teacher',
          lastName: 'User',
          role: UserRole.TEACHER,
          passwordHash: 'hashed-password',
          isActive: true
        }
      });

      // Generate navigation for teacher
      const navigation = await navigationService.generateNavigation(teacher);

      expect(navigation).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Students',
            path: '/students'
          }),
          expect.objectContaining({
            name: 'Grades',
            path: '/grades'
          })
        ])
      );

      // Should not include admin-only items
      expect(navigation).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            name: 'User Management'
          })
        ])
      );
    });

    it('should handle permission changes dynamically', async () => {
      // Create tenant and user
      const tenant = await prisma.tenant.create({
        data: {
          id: 'dynamic-tenant-123',
          name: 'Dynamic Test School',
          code: 'DYN-TEST',
          type: 'ELEMENTARY',
          address: '123 Test Street',
          phone: '+639123456789',
          email: 'dynamic@school.edu.ph'
        }
      });

      const user = await prisma.user.create({
        data: {
          id: 'user-123',
          tenantId: tenant.id,
          email: 'user@dynamic.edu.ph',
          firstName: 'User',
          lastName: 'Test',
          role: UserRole.TEACHER,
          passwordHash: 'hashed-password',
          isActive: true
        }
      });

      // Initial permissions (only students)
      await prisma.permission.create({
        data: {
          id: 'perm-students-read',
          name: 'view_students',
          description: 'View student information',
          resource: 'students',
          action: 'read',
          roles: [UserRole.TEACHER]
        }
      });

      // Generate initial navigation
      const initialNav = await navigationService.generateNavigation(user);
      expect(initialNav).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Students'
          })
        ])
      );
      expect(initialNav).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            name: 'Grades'
          })
        ])
      );

      // Add grades permission
      await prisma.permission.create({
        data: {
          id: 'perm-grades-read',
          name: 'view_grades',
          description: 'View grade information',
          resource: 'grades',
          action: 'read',
          roles: [UserRole.TEACHER]
        }
      });

      // Invalidate cache and regenerate navigation
      navigationService.invalidateCache(user.id);
      const updatedNav = await navigationService.generateNavigation(user);

      // Should now include grades
      expect(updatedNav).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Students'
          }),
          expect.objectContaining({
            name: 'Grades'
          })
        ])
      );
    });
  });
});
```

### E2E Tests

#### Permission-Based Navigation E2E Tests
Location: `tests/e2e/navigation/permission-based-navigation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Permission-Based Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login');
  });

  test('should show navigation based on user role', async ({ page }) => {
    // Login as teacher
    await loginAsRole(page, 'TEACHER', 'teacher@example.com', 'TeacherPassword123!');

    // Check navigation items
    await expect(page.locator('[data-testid="nav-students"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-grades"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-user-management"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-system-settings"]')).not.toBeVisible();
  });

  test('should show admin navigation for admin users', async ({ page }) => {
    // Login as admin
    await loginAsRole(page, 'ADMIN', 'admin@example.com', 'AdminPassword123!');

    // Check navigation items
    await expect(page.locator('[data-testid="nav-students"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-grades"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-user-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-system-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-tenant-management"]')).toBeVisible();
  });

  test('should show minimal navigation for students', async ({ page }) => {
    // Login as student
    await loginAsRole(page, 'STUDENT', 'student@example.com', 'StudentPassword123!');

    // Check navigation items
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-grades"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-students"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-user-management"]')).not.toBeVisible();
  });

  test('should prevent access to unauthorized pages', async ({ page }) => {
    // Login as teacher
    await loginAsRole(page, 'TEACHER', 'teacher@example.com', 'TeacherPassword123!');

    // Try to access admin-only page directly
    await page.goto('http://localhost:3000/admin/users');

    // Should redirect or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
  });

  test('should update navigation when permissions change', async ({ page }) => {
    // Login as teacher
    await loginAsRole(page, 'TEACHER', 'teacher@example.com', 'TeacherPassword123!');

    // Initially should not see reports
    await expect(page.locator('[data-testid="nav-reports"]')).not.toBeVisible();

    // Admin grants reports permission (this would require admin interface)
    await page.goto('http://localhost:3000/admin/users');
    await page.click('[data-testid="user-teacher@example.com"]');
    await page.click('[data-testid="add-permission"]');
    await page.selectOption('[data-testid="permission-select"]', 'view_reports');
    await page.click('[data-testid="save-permissions"]');

    // Logout and login again
    await page.click('[data-testid="logout-button"]');
    await loginAsRole(page, 'TEACHER', 'teacher@example.com', 'TeacherPassword123!');

    // Should now see reports navigation
    await expect(page.locator('[data-testid="nav-reports"]')).toBeVisible();
  });

  test('should support tenant-specific navigation customization', async ({ page }) => {
    // Login to tenant with custom navigation
    await page.fill('[data-testid="tenant-code"]', 'CUSTOM-NAV');
    await page.fill('[data-testid="email"]', 'custom@example.com');
    await page.fill('[data-testid="password"]', 'CustomPassword123!');
    await page.click('[data-testid="login-button"]');

    // Check for custom navigation items
    await expect(page.locator('[data-testid="nav-custom-reports"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-school-calendar"]')).toBeVisible();
    
    // Check that standard items are hidden as configured
    await expect(page.locator('[data-testid="nav-grades"]')).not.toBeVisible();
  });

  test('should handle navigation caching', async ({ page }) => {
    // Login as teacher
    await loginAsRole(page, 'TEACHER', 'teacher@example.com', 'TeacherPassword123!');

    // Navigation should load quickly (cached)
    const startTime = Date.now();
    await expect(page.locator('[data-testid="nav-students"]')).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000); // Should load within 1 second

    // Navigate away and back - should still be fast
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForURL('**/dashboard');
    
    const navStartTime = Date.now();
    await expect(page.locator('[data-testid="nav-students"]')).toBeVisible();
    const navLoadTime = Date.now() - navStartTime;
    
    expect(navLoadTime).toBeLessThan(500); // Should be even faster from cache
  });
});

// Helper functions
async function loginAsRole(page: any, role: string, email: string, password: string) {
  await page.fill('[data-testid="tenant-code"]', 'NAV-TEST');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('http://localhost:3000/dashboard');
}
```

## Test Execution Guide

### Running Sprint 1 Tests

```bash
# Run all Sprint 1 tests
npm run test -- --grep "Multi-Tenant|User Authentication|Permission-Based Navigation"

# Run unit tests only
npm run test:unit -- --grep "Tenant|User|Authentication|Permission|Navigation"

# Run integration tests
npm run test:integration -- --grep "Tenant|User|Authentication|Permission|Navigation"

# Run E2E tests
npm run test:e2e -- --grep "Multi-Tenant|Authentication|Navigation"

# Coverage report
npm run test:coverage -- --grep "Sprint 1"
```

### Test Data Requirements

- PostgreSQL test database with RLS enabled
- Multiple test tenants for isolation testing
- Test users with different roles
- Permission configurations for each role
- Navigation configurations per tenant

### Success Criteria

- All unit tests pass with 95%+ coverage
- All integration tests pass with proper tenant isolation
- All E2E tests pass with real browser automation
- RLS policies prevent cross-tenant data access
- Authentication flows work correctly for all scenarios
- Navigation adapts to user permissions and roles
- Performance benchmarks met for navigation generation

These comprehensive test templates provide a solid foundation for implementing Sprint 1 functionality following TDD principles with proper tenant isolation, authentication, and permission-based navigation.