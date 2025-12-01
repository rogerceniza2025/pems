# ADR 003 – Implement CQRS

Status: Accepted

## Context

High-performance features require separation of read/write models.

## Decision

Adopt CQRS for all application-layer operations.

## Consequences

- Faster queries
- Cleaner logic
- Two-model complexity
