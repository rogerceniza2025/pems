PO-5: Permission-Based Navigation

Description

h2. User Story

As a user,  
 I want to see only the menu items I have access to, So that the interface is clean and relevant to my role.

h3. Acceptance Criteria

- Navigation menus are dynamically generated based on permissions
- Role-based menu filtering works correctly
- Permission checks are enforced on both frontend and backend
- Navigation structure is configurable per tenant

h3. Technical Tasks

- Implement navigation management module (ADR-019)
- Create permission-based menu filtering
- Implement navigation caching for performance
- Create navigation management UI
- Use domain events for module communication (ADR-014)
