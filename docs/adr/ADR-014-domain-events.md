# ADR 014 – Domain Events for Module Communication
Status: Accepted

## Context
Modules need decoupled communication.

## Decision
Use domain events (in-memory pub/sub).

## Consequences
- Better decoupling
- Requires event registry
