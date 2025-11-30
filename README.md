## Project Overview

PEMS (Philippine Educational Management System) is a comprehensive multi-tenant SaaS platform built for Philippine educational institutions (both K-12 DepEd and Higher Education CHED). This is a TDD-first Turborepo modular monolith using modern technologies and following Domain-Driven Design Patterns.

## Development Commands

### Common Development Tasks

```bash
# Install dependencies
pnpm install

# Start all applications (api, web, admin)
pnpm dev

# Start individual applications
cd apps/api && pnpm dev
cd apps/web && pnpm dev
cd apps/admin && pnpm dev

# Build all packages and applications
pnpm build

# Build only packages
pnpm build:packages

# Build only applications
pnpm build:apps
```

### Testing Commands

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Watch mode for TDD development
pnpm test:watch

# Generate coverage reports
pnpm test:coverage
```

### Database Management

```bash
# Generate Prisma Client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Push schema changes (development)
pnpm db:push

# Open Prisma Studio
pnpm db:studio

# Seed database with test data
pnpm db:seed

# Reset database (development only)
pnpm db:reset
```

### Code Quality

```bash
# Lint all packages and apps
pnpm lint

# Format code with Prettier
pnpm format

# Type checking across all packages
pnpm type-check

# Clean build artifacts and node_modules
pnpm clean
```

## Architecture Overview

### Technology Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Backend**: Hono.js (lightweight web framework)
- **Frontend**: TanStack Start + SolidJS
- **Database**: PostgreSQL 18 with Prisma ORM
- **Authentication**: BetterAuth
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **UI**: SolidJS + Kobalte + TailwindCSS v4

### Project Structure

```
pems/
├── apps/                    # Deployable applications
│   ├── api/                # Hono API server
│   ├── web/                # Student/parent web app
│   └── admin/              # Admin dashboard
├── modules/                # Domain modules (DDD)
│   ├── tenant-management/
│   ├── student-management/
│   ├── enrollment-management/
│   ├── grading-management/
│   ├── attendance-management/
│   ├── cashiering-management/  # PRIORITY - Payments & OR
│   └── ... (other modules)
└── packages/               # Shared packages
    ├── shared/            # Types, utils, constants
    ├── infrastructure/    # Database, auth, RPC, email
    ├── ui/                # Shared UI components
    └── testing/           # Testing utilities
```

### Development Patterns

#### TDD-First Approach

All development follows Test-Driven Development:

1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Optimize while maintaining test coverage

```bash
# Use watch mode for TDD workflow
pnpm test:watch
```

#### Domain-Driven Design (DDD)

- Each module is a bounded context with clear boundaries
- Domain entities with business logic validation
- Value objects for complex data types
- Aggregates for consistency boundaries
- Repository pattern for data access abstraction

#### CQRS Pattern

- Separate command operations from query operations
- Commands for write operations with validation
- Queries for read operations optimized for specific use cases

## Module Development Workflow

### Creating New Features

1. Start in the appropriate `modules/` directory
2. Write domain layer tests first
3. Implement domain entities and value objects
4. Add application layer (commands/queries)
5. Implement infrastructure (repositories)
6. Add RPC procedures for external access
7. Write UI components if needed

### Database Changes

1. Update `packages/infrastructure/database/prisma/schema.prisma`
2. Generate migration: `pnpm db:migrate`
3. Update domain models to reflect changes
4. Run tests to ensure compatibility

## Key Configuration

### Environment Setup

- Node.js >= v24.11.1
- pnpm >= 10.24.0
- PostgreSQL 18
- Copy `.env.example` to `.env` and configure database URL

### TypeScript Configuration

- Strict mode enabled
- Path aliases: `@pems/*` for internal packages
- ESNext modules with JSX support for SolidJS

### Multi-Tenancy

- All database queries must be tenant-aware
- Use row-level security for data isolation
- Tenant context is injected at the request level

## Philippine Education Standards

### DepEd K-12

- LRN (12-digit Learner Reference Number) support
- Grade levels: Kindergarten to Grade 12
- Senior High School tracks (STEM, ABM, HUMSS, GAS)
- Grading: 75 passing grade, 4 quarters
- Components: Written Work (30%), Performance Task (50%), Quarterly Assessment (20%)

### CHED Higher Education

- Institution-specific student numbers
- Programs: Associate, Bachelor, Master, Doctorate
- Semesters: 1st, 2nd, Summer
- Grading periods: Prelim, Midterm, Finals
- GPA: 1.0 (highest) to 5.0 (failing), 3.0 passing

## Priority Modules

### Cashiering Management (IMMEDIATE PRIORITY)

- Payment processing with multiple methods (Cash, GCash, PayMaya, etc.)
- Official Receipt (OR) generation and printing
- Cashier session management with daily reconciliation
- Student account balances and payment history
- Database tables already implemented in schema

### Tenant Management (CORE)

- Multi-tenant school management
- Subscription and module feature flags
- Tenant isolation and security

## Testing Strategy

### Unit Tests

- Domain entities and value objects
- Business logic validation
- Pure functions and utilities

### Integration Tests

- Repository implementations
- RPC procedures
- Database operations

### E2E Tests

- Complete user workflows
- Critical business paths
- Cross-module functionality

## Code Style Guidelines

### SolidJS Specific

- Use functional components with `createSignal()` for state
- Implement proper JSX with `.tsx` extensions
- Use TailwindCSS classes for styling
- Implement dark mode using Tailwind's dark variant

### General TypeScript

- Strict typing with no `any` types
- Interface over type for object shapes
- Proper error handling with typed errors
- Use Zod for runtime validation

### Database

- All IDs use Postgresql native UUIDv7() function
- Implement soft delete pattern where applicable
- Use audit fields (created_at, updated_at, deleted_at)
- Follow naming conventions: snake_case for tables/columns

## Development Tips

### Debugging

- Use `pnpm db:studio` to inspect database
- Check browser console for frontend errors
- Use test watch mode for rapid TDD iteration
- Enable Prisma query logging in development

### Performance

- Use Prisma includes/selects to optimize queries
- Implement proper caching strategies
- Use React Query (TanStack Query) for server state
- Optimize bundle sizes with tree shaking

### Security

- Never commit sensitive data or API keys
- Use environment variables for configuration
- Implement proper input validation
- Follow OWASP security guidelines
