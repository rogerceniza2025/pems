# ADR 022 – Hybrid Deployment Strategy

Status: Accepted

## Context

Frontend, backend, and DB have different infra needs.

## Decision

- Frontend: Vercel
- Backend API: Railway or Deno Deploy
- Database: DigitalOcean / Railway PostgreSQL

## Consequences

- Optimized cost/performance
- Requires environment sync
