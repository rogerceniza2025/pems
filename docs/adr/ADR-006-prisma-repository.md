# ADR 006 – Prisma ORM with Repository Pattern
Status: Accepted

## Context
Need strongly typed data access.

## Decision
Use Prisma 7.0.1 wrapped in repository pattern.

## Consequences
- Strong type safety
- Prisma cannot define RLS → SQL migrations required
