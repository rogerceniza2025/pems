# ADR 005 – Use UUIDv7 as Primary Keys

Status: Accepted

## Context

PostgreSQL 18 introduces native uuid_v7() function for time-sortable UUIDs.

## Decision

All primary keys will use:

```sql
id UUID PRIMARY KEY DEFAULT uuid_v7()
```

## Consequences

- Better index locality
- Time-ordered IDs
- No uuid-ossp extension required
