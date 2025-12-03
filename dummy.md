PO-6: Payment Processing

Description

h2. User Story

As a cashier,  
 I want to process student payments, So that the school can collect fees efficiently.

h3. Acceptance Criteria

- Multiple payment methods are supported (Cash, GCash, PayMaya)
- Payment transactions are recorded accurately
- Receipt numbers are generated sequentially
- Payment history is maintained and searchable
- Daily collection reports can be generated

h3. Technical Tasks

- Write cashiering tests (Respecting TDD)

- Implement cashiering management domain module (ADR-010, ADR-002)
- Create payment processing service
- Integrate with payment gateways (GCash, PayMaya)
- Implement receipt generation with sequential numbering
- Create payment history tracking
- Use CQRS for payment operations (ADR-003)
- Implement UUIDv7 for transaction IDs (ADR-005)
- Use Prisma with repository pattern (ADR-006)
- Apply Zod validation (ADR-020)
