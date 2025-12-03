PO-4: User Authentication System

Description

h2. User Story

As a user,  
 I want to securely log in to the system, So that I can access my school's data.

h3. Acceptance Criteria

- Users can register with email and password
- Login/logout functionality works correctly
- Password reset functionality is implemented
- Multi-factor authentication is supported
- Session management is secure
- Authentication is tenant-aware

h3. Technical Tasks

- Implement BetterAuth integration (ADR-018)
- Create user management domain module (ADR-002)
- Implement password hashing and validation
- Set up session management
- Create authentication middleware
- Implement role-based access control (RBAC)
- Use PostgreSQL as single source of truth (ADR-017)
- Write authentication tests
