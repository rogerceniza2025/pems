# ADR 017 – PostgreSQL as Single Source of Truth
Status: Accepted

## Context
School data must maintain strict consistency.

## Decision
Use PostgreSQL 18 as the single transactional database.

## Consequences
- Strong consistency
- May need read replicas for scaling
