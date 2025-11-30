# ADR 001 – Use Turborepo as Monorepo Build System
Status: Accepted
Date: 2025-11-30

## Context
PEMS consists of 360+ directories and many modules. A scalable monorepo build system is required.

## Decision
Use Turborepo with pnpm workspaces.

## Consequences
- Faster builds via caching
- Standardized tasks
- Slight learning curve
