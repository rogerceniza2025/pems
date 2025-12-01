# PEMS Sprint Flow Diagram

## Sprint Dependencies and Flow

```mermaid
gantt
    title PEMS Sprint Timeline
    dateFormat  YYYY-MM-DD
    section Foundation
    Sprint 0: Infrastructure Setup    :s0, 2025-12-01, 14d

    section Core Systems
    Sprint 1: Tenant & Auth          :s1, after s0, 14d

    section Priority Modules
    Sprint 2: Cashiering             :s2, after s1, 14d

    section Core Modules
    Sprint 3: Student Management      :s3, after s1, 14d
    Sprint 4: Enrollment Management   :s4, after s3, 14d
    Sprint 5: Attendance Management   :s5, after s1, 14d
    Sprint 6: Grading Management      :s6, after s4, 14d

    section Integration
    Sprint 7: Reporting & Analytics  :s7, after s6, 14d
    Sprint 8: Testing & Deployment    :s8, after s7, 14d
```

## Module Dependencies

```mermaid
graph TD
    A[Sprint 0: Infrastructure] --> B[Sprint 1: Tenant & Auth]
    B --> C[Sprint 2: Cashiering]
    B --> D[Sprint 3: Student Management]
    B --> E[Sprint 5: Attendance Management]
    D --> F[Sprint 4: Enrollment Management]
    F --> G[Sprint 6: Grading Management]
    C --> H[Sprint 7: Reporting & Analytics]
    G --> H
    E --> H
    H --> I[Sprint 8: Testing & Deployment]

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style D fill:#e8f5e8
    style E fill:#e8f5e8
    style F fill:#e8f5e8
    style G fill:#e8f5e8
    style H fill:#fce4ec
    style I fill:#f1f8e9
```

## ADR Coverage by Sprint

```mermaid
pie title ADR Coverage Distribution
    "Sprint 0" : 9
    "Sprint 1" : 8
    "Sprint 2" : 8
    "Sprint 3" : 7
    "Sprint 4" : 8
    "Sprint 5" : 7
    "Sprint 6" : 7
    "Sprint 7" : 6
    "Sprint 8" : 7
```

## Key Architecture Decisions by Sprint

### Sprint 0: Foundation

- ADR-001: Turborepo as Monorepo Build System
- ADR-005: UUIDv7 as Primary Keys
- ADR-006: Prisma ORM with Repository Pattern
- ADR-011: TDD-First Development Workflow
- ADR-015: Vitest for Unit/Integration Testing
- ADR-016: Playwright for E2E Testing
- ADR-017: PostgreSQL as Single Source of Truth
- ADR-020: Zod for Validation
- ADR-021: Tailwind v4 as Styling Framework

### Sprint 1: Core Systems

- ADR-002: Domain-Driven Design (DDD)
- ADR-004: Multi-Tenant Architecture with RLS
- ADR-013: Modular Monolith Architecture
- ADR-014: Domain Events for Module Communication
- ADR-018: BetterAuth for Authentication
- ADR-019: Permission-Based Navigation

### Sprint 2-6: Domain Modules

- ADR-003: CQRS Pattern
- ADR-010: Cashiering Module as First Domain Module
- ADR-012: Shared Packages for Cross-Module Reuse

### Sprint 7-8: Integration & Deployment

- ADR-007: Hono as Backend API Gateway
- ADR-008: oRPC for API Communication
- ADR-009: TanStack Start + SolidJS for Frontend
- ADR-022: Hybrid Deployment Strategy
