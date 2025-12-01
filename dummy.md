PO-1: Development Environment Setup

Description

h2. User Story

As a developer,  
 I want a fully configured development environment, So that I can start building features without setup delays.

h3. Acceptance Criteria

- All team members can run `pnpm install` without errors
- All applications (api, web, admin) start with `pnpm dev`
- Database connection is established and migrations run successfully
- All linting and formatting rules are enforced
- Pre-commit hooks are configured and working

h3. Technical Tasks

- Configure Turborepo with pnpm workspaces (ADR-001)
- Set up TypeScript configuration with strict mode
- Configure ESLint, Prettier, and pre-commit hooks
- Set up PostgreSQL 18 with required extensions (ADR-017)
- Configure Prisma with UUIDv7 support (ADR-005, ADR-006)
- Set up Vitest for unit/integration testing (ADR-015)
- Configure Playwright for E2E testing (ADR-016)
- Create development Docker environment
- Set up Zod validation (ADR-020)
- Configure Tailwind v4 styling (ADR-021)
