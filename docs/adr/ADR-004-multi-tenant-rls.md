# ADR 004 – Multi-Tenant Architecture with RLS
Status: Accepted

## Context
PEMS is a SaaS platform for multiple schools.

## Decision
Use PostgreSQL Row-Level Security and tenant-aware tables.

## Consequences
- Strong isolation
- Lower operational costs
