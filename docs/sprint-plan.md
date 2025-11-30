# PEMS Sprint Plan

## Overview

This document outlines the sprint plan for the Philippine Educational Management System (PEMS), a comprehensive multi-tenant SaaS platform for Philippine educational institutions. The plan is organized into logical sprints that build upon each other, following the TDD-first approach and Domain-Driven Design patterns outlined in the project vision.

## Sprint Duration & Structure

- **Sprint Duration**: 2 weeks per sprint
- **Team Structure**: Cross-functional team with frontend, backend, and testing expertise
- **Development Approach**: TDD-first with RED-GREEN-REFACTOR cycle
- **Architecture**: Modular monolith with DDD patterns

## Relevant ADRs

The following Architecture Decision Records (ADRs) guide the implementation across all sprints:

- **ADR-001**: Turborepo as Monorepo Build System
- **ADR-002**: Domain-Driven Design (DDD)
- **ADR-003**: CQRS Pattern
- **ADR-004**: Multi-Tenant Architecture with RLS
- **ADR-005**: UUIDv7 as Primary Keys
- **ADR-006**: Prisma ORM with Repository Pattern
- **ADR-007**: Hono as Backend API Gateway
- **ADR-008**: oRPC for API Communication
- **ADR-009**: TanStack Start + SolidJS for Frontend
- **ADR-010**: Cashiering Module as First Domain Module
- **ADR-011**: TDD-First Development Workflow
- **ADR-012**: Shared Packages for Cross-Module Reuse
- **ADR-013**: Modular Monolith Architecture
- **ADR-014**: Domain Events for Module Communication
- **ADR-015**: Vitest for Unit/Integration Testing
- **ADR-016**: Playwright for E2E Testing
- **ADR-017**: PostgreSQL as Single Source of Truth
- **ADR-018**: BetterAuth for Authentication
- **ADR-019**: Permission-Based Navigation
- **ADR-020**: Zod for Validation
- **ADR-021**: Tailwind v4 as Styling Framework
- **ADR-022**: Hybrid Deployment Strategy

---

## Sprint 0: Foundation & Infrastructure Setup

**Duration**: 2 weeks  
**Focus**: Establishing the core development infrastructure and tooling

**Related ADRs**: ADR-001, ADR-005, ADR-006, ADR-011, ADR-015, ADR-016, ADR-017, ADR-020, ADR-021

### User Stories

#### Story 1: Development Environment Setup
**As a** developer,  
**I want** a fully configured development environment,  
**So that** I can start building features without setup delays.

**Acceptance Criteria:**
- All team members can run `pnpm install` without errors
- All applications (api, web, admin) start with `pnpm dev`
- Database connection is established and migrations run successfully
- All linting and formatting rules are enforced
- Pre-commit hooks are configured and working

**Technical Tasks:**
- Configure Turborepo with pnpm workspaces (ADR-001)
- Set up TypeScript configuration with strict mode
- Configure ESLint, Prettier, and pre-commit hooks
- Set up PostgreSQL 18 with required extensions (ADR-017)
- Configure Prisma with UUIDv7 support (ADR-005, ADR-006)
- Set up Vitest for unit/integration testing (ADR-015)
- Configure Playwright for E2E testing (ADR-016)
- Create development Docker environment
- Set up Zod validation (ADR-020)
- Configure Tailwind v4 styling (ADR-021)

#### Story 2: CI/CD Pipeline Foundation
**As a** developer,  
**I want** automated CI/CD pipelines,  
**So that** code changes are automatically tested and validated.

**Acceptance Criteria:**
- All pull requests trigger automated tests
- Code coverage reports are generated
- Build artifacts are created and stored
- Staging environment is automatically deployed on merge to main

**Technical Tasks:**
- Set up GitHub Actions workflows
- Configure automated testing in CI
- Set up build and deployment pipelines
- Configure environment variable management
- Set up artifact storage and caching
- Implement TDD workflow automation (ADR-011)

---

## Sprint 1: Core Tenant Management & Authentication

**Duration**: 2 weeks  
**Focus**: Implementing multi-tenancy and authentication foundation

**Related ADRs**: ADR-002, ADR-004, ADR-005, ADR-006, ADR-013, ADR-017, ADR-018, ADR-019

### User Stories

#### Story 1: Multi-Tenant Architecture
**As a** system administrator,  
**I want** to manage multiple schools/tenants,  
**So that** each institution has isolated data and configuration.

**Acceptance Criteria:**
- New tenants can be created with unique identifiers
- Tenant isolation is enforced at database level
- Row-Level Security (RLS) is implemented (ADR-004)
- Tenant context is properly injected in all requests
- Data leakage between tenants is prevented

**Technical Tasks:**
- Implement tenant management domain module (ADR-002)
- Set up PostgreSQL RLS policies (ADR-004)
- Create tenant isolation middleware
- Implement tenant context injection
- Add tenant-aware database queries
- Implement UUIDv7 for tenant IDs (ADR-005)
- Use Prisma with repository pattern (ADR-006)
- Follow modular monolith boundaries (ADR-013)
- Write comprehensive tests for tenant isolation

#### Story 2: User Authentication System
**As a** user,  
**I want** to securely log in to the system,  
**So that** I can access my school's data.

**Acceptance Criteria:**
- Users can register with email and password
- Login/logout functionality works correctly
- Password reset functionality is implemented
- Multi-factor authentication is supported
- Session management is secure
- Authentication is tenant-aware

**Technical Tasks:**
- Implement BetterAuth integration (ADR-018)
- Create user management domain module (ADR-002)
- Implement password hashing and validation
- Set up session management
- Create authentication middleware
- Implement role-based access control (RBAC)
- Use PostgreSQL as single source of truth (ADR-017)
- Write authentication tests

#### Story 3: Permission-Based Navigation
**As a** user,  
**I want** to see only the menu items I have access to,  
**So that** the interface is clean and relevant to my role.

**Acceptance Criteria:**
- Navigation menus are dynamically generated based on permissions
- Role-based menu filtering works correctly
- Permission checks are enforced on both frontend and backend
- Navigation structure is configurable per tenant

**Technical Tasks:**
- Implement navigation management module (ADR-019)
- Create permission-based menu filtering
- Implement navigation caching for performance
- Create navigation management UI
- Use domain events for module communication (ADR-014)
- Write navigation tests

---

## Sprint 2: Cashiering Module (Priority Module)

**Duration**: 2 weeks  
**Focus**: Implementing the cashiering module as identified in ADR-010

**Related ADRs**: ADR-002, ADR-003, ADR-005, ADR-006, ADR-010, ADR-013, ADR-014, ADR-020

### User Stories

#### Story 1: Payment Processing
**As a** cashier,  
**I want** to process student payments,  
**So that** the school can collect fees efficiently.

**Acceptance Criteria:**
- Multiple payment methods are supported (Cash, GCash, PayMaya)
- Payment transactions are recorded accurately
- Receipt numbers are generated sequentially
- Payment history is maintained and searchable
- Daily collection reports can be generated

**Technical Tasks:**
- Implement cashiering management domain module (ADR-010, ADR-002)
- Create payment processing service
- Integrate with payment gateways (GCash, PayMaya)
- Implement receipt generation with sequential numbering
- Create payment history tracking
- Use CQRS for payment operations (ADR-003)
- Implement UUIDv7 for transaction IDs (ADR-005)
- Use Prisma with repository pattern (ADR-006)
- Apply Zod validation (ADR-020)
- Write cashiering tests

#### Story 2: Official Receipt Generation
**As a** cashier,  
**I want** to generate official receipts,  
**So that** payments are properly documented.

**Acceptance Criteria:**
- Official receipts follow Philippine tax requirements
- Receipts can be printed or exported as PDF
- Receipt numbers are unique and sequential
- Voided receipts are tracked and audited
- Receipt templates are customizable per tenant

**Technical Tasks:**
- Implement receipt generation service
- Create receipt templates with tenant branding
- Implement receipt numbering system
- Add receipt voiding functionality
- Create receipt printing/export functionality
- Use domain events for receipt issuance (ADR-014)
- Write receipt generation tests

#### Story 3: Cashier Session Management
**As a** cashier,  
**I want** to manage my daily cash drawer sessions,  
**So that** cash accountability is maintained.

**Acceptance Criteria:**
- Cashiers can open and close daily sessions
- Opening and closing balances are recorded
- Session reconciliation identifies discrepancies
- Session reports can be generated
- Multiple cashiers can work simultaneously

**Technical Tasks:**
- Implement cashier session management
- Create cash till tracking
- Implement session reconciliation
- Add session reporting
- Use CQRS for session operations (ADR-003)
- Follow modular monolith boundaries (ADR-013)
- Write session management tests

---

## Sprint 3: Student Management Module

**Duration**: 2 weeks  
**Focus**: Implementing core student management functionality

**Related ADRs**: ADR-002, ADR-005, ADR-006, ADR-012, ADR-013, ADR-014, ADR-020

### User Stories

#### Story 1: Student Registration
**As a** registrar,  
**I want** to register new students,  
**So that** they can be enrolled in the school.

**Acceptance Criteria:**
- Student information can be captured with all required fields
- LRN (Learner Reference Number) validation works for DepEd schools
- Student numbers are generated automatically for HE institutions
- Student profiles can be updated
- Student records can be imported in bulk

**Technical Tasks:**
- Implement student management domain module (ADR-002)
- Create student registration service
- Implement LRN validation (DepEd)
- Implement student number generation (CHED)
- Create bulk import functionality
- Use UUIDv7 for student IDs (ADR-005)
- Apply Zod validation (ADR-020)
- Use shared packages for common utilities (ADR-012)
- Write student management tests

#### Story 2: Student Profile Management
**As a** student,  
**I want** to view and update my profile information,  
**So that** my records are accurate.

**Acceptance Criteria:**
- Students can view their personal information
- Profile updates are validated and saved
- Profile photos can be uploaded
- Contact information can be updated
- Academic history is displayed

**Technical Tasks:**
- Create student profile UI components
- Implement profile update functionality
- Add photo upload capability
- Create profile validation
- Use domain events for profile updates (ADR-014)
- Write profile management tests

#### Story 3: Guardian Management
**As a** registrar,  
**I want** to manage student guardian information,  
**So that** parents/guardians can be contacted.

**Acceptance Criteria:**
- Multiple guardians can be assigned per student
- Guardian contact information is maintained
- Guardian relationships are properly categorized
- Emergency contacts are highlighted
- Guardian access can be granted

**Technical Tasks:**
- Implement guardian management
- Create guardian relationship types
- Add emergency contact functionality
- Implement guardian access control
- Use shared packages for common types (ADR-012)
- Write guardian management tests

---

## Sprint 4: Enrollment Management Module

**Duration**: 2 weeks  
**Focus**: Implementing enrollment and registration processes

**Related ADRs**: ADR-002, ADR-003, ADR-005, ADR-006, ADR-012, ADR-013, ADR-014, ADR-020

### User Stories

#### Story 1: Course and Section Management
**As a** registrar,  
**I want** to manage courses and sections,  
**So that** students can be properly enrolled.

**Acceptance Criteria:**
- Courses can be created with appropriate metadata
- Sections can be created with capacity limits
- Course schedules can be defined
- Prerequisites can be set for courses
- Section assignments are tracked

**Technical Tasks:**
- Implement enrollment management domain module (ADR-002)
- Create course management service
- Implement section management
- Add schedule management
- Create prerequisite validation
- Use CQRS for course operations (ADR-003)
- Apply Zod validation (ADR-020)
- Write course management tests

#### Story 2: Student Enrollment
**As a** registrar,  
**I want** to enroll students in courses,  
**So that** they can attend classes.

**Acceptance Criteria:**
- Students can be enrolled in multiple courses
- Section capacity limits are enforced
- Schedule conflicts are detected and prevented
- Enrollment status is tracked
- Enrollment can be approved or rejected

**Technical Tasks:**
- Implement enrollment service
- Create capacity management
- Add schedule conflict detection
- Implement enrollment workflow
- Create enrollment reporting
- Use domain events for enrollment status changes (ADR-014)
- Follow modular monolith boundaries (ADR-013)
- Write enrollment tests

#### Story 3: Enrollment Reporting
**As a** administrator,  
**I want** to view enrollment statistics,  
**So that** I can make informed decisions.

**Acceptance Criteria:**
- Enrollment reports can be generated by various criteria
- Class rosters can be printed
- Enrollment trends can be visualized
- Capacity utilization is tracked
- Reports can be exported

**Technical Tasks:**
- Create enrollment reporting service
- Implement class roster generation
- Add trend analysis
- Create capacity utilization tracking
- Implement report export functionality
- Use shared packages for reporting utilities (ADR-012)
- Write enrollment reporting tests

---

## Sprint 5: Attendance Management Module

**Duration**: 2 weeks  
**Focus**: Implementing attendance tracking with RFID support

**Related ADRs**: ADR-002, ADR-003, ADR-005, ADR-006, ADR-012, ADR-014, ADR-020

### User Stories

#### Story 1: Manual Attendance Tracking
**As a** teacher,  
**I want** to record student attendance manually,  
**So that** attendance records are maintained.

**Acceptance Criteria:**
- Attendance can be recorded for individual students
- Bulk attendance can be recorded for entire classes
- Attendance status options (Present, Absent, Late, Excused)
- Attendance comments can be added
- Historical attendance can be viewed

**Technical Tasks:**
- Implement attendance management domain module (ADR-002)
- Create manual attendance service
- Implement bulk attendance recording
- Add attendance status management
- Create attendance history tracking
- Use CQRS for attendance operations (ADR-003)
- Apply Zod validation (ADR-020)
- Write attendance tests

#### Story 2: RFID-Based Attendance
**As a** student,  
**I want** to check in/out using my RFID card,  
**So that** my attendance is automatically recorded.

**Acceptance Criteria:**
- RFID cards can be assigned to students
- RFID readers can automatically record attendance
- Check-in/check-out times are captured
- Invalid RFID attempts are logged
- RFID hardware integration works

**Technical Tasks:**
- Implement RFID attendance service
- Create RFID card management
- Implement RFID reader integration
- Add automatic attendance recording
- Create RFID device management
- Use domain events for check-in/check-out (ADR-014)
- Use shared packages for RFID utilities (ADR-012)
- Write RFID attendance tests

#### Story 3: Attendance Reporting
**As a** administrator,  
**I want** to generate attendance reports,  
**So that** I can monitor student attendance patterns.

**Acceptance Criteria:**
- Daily attendance reports can be generated
- Attendance summaries can be viewed by class
- Chronic absenteeism can be identified
- Attendance trends can be analyzed
- Reports can be exported

**Technical Tasks:**
- Create attendance reporting service
- Implement daily attendance reports
- Add attendance analytics
- Create absenteeism alerts
- Implement report export functionality
- Use shared packages for reporting (ADR-012)
- Write attendance reporting tests

---

## Sprint 6: Grading Management Module

**Duration**: 2 weeks  
**Focus**: Implementing grading system for both K-12 and Higher Education

**Related ADRs**: ADR-002, ADR-003, ADR-005, ADR-006, ADR-012, ADR-014, ADR-020

### User Stories

#### Story 1: Grade Component Management
**As a** teacher,  
**I want** to define grade components,  
**So that** grades are calculated according to DepEd/CHED standards.

**Acceptance Criteria:**
- Grade components can be defined (Written Work, Performance Task, etc.)
- Component weights can be set according to standards
- K-12 grading components follow DepEd guidelines (30/50/20 split)
- HE grading components support semester-based systems
- Grade components can be customized per course

**Technical Tasks:**
- Implement grading management domain module (ADR-002)
- Create grade component service
- Implement DepEd grading standards
- Add CHED grading support
- Create grade calculation engine
- Use CQRS for grade operations (ADR-003)
- Apply Zod validation (ADR-020)
- Write grading tests

#### Story 2: Grade Recording
**As a** teacher,  
**I want** to record student grades,  
**So that** academic performance is tracked.

**Acceptance Criteria:**
- Individual grades can be recorded for each component
- Grades can be imported from external sources
- Grade validation ensures data integrity
- Grade calculations are automatic
- Grade histories are maintained

**Technical Tasks:**
- Implement grade recording service
- Create grade validation
- Add grade calculation logic
- Implement grade history tracking
- Create bulk grade import
- Use domain events for grade updates (ADR-014)
- Write grade recording tests

#### Story 3: Report Card Generation
**As a** student/parent,  
**I want** to view my report card,  
**So that** I can track academic progress.

**Acceptance Criteria:**
- Report cards follow DepEd/CHED formats
- Quarterly/Semester grades are displayed
- General averages are calculated correctly
- Report cards can be printed or exported
- Historical report cards are accessible

**Technical Tasks:**
- Create report card generation service
- Implement DepEd report card format
- Add CHED transcript format
- Create report card templates
- Implement report card export
- Use shared packages for report generation (ADR-012)
- Write report card tests

---

## Sprint 7: Reporting & Analytics

**Duration**: 2 weeks  
**Focus**: Implementing cross-module reporting and analytics

**Related ADRs**: ADR-002, ADR-003, ADR-006, ADR-012, ADR-014, ADR-017

### User Stories

#### Story 1: Cross-Module Reporting
**As a** administrator,  
**I want** to generate comprehensive reports,  
**So that** I can make data-driven decisions.

**Acceptance Criteria:**
- Reports can combine data from multiple modules
- Report filters are flexible and powerful
- Reports can be scheduled for automatic generation
- Report templates can be saved and reused
- Reports can be exported in multiple formats

**Technical Tasks:**
- Implement reporting management domain module (ADR-002)
- Create cross-module data aggregation
- Implement report scheduling
- Add report template management
- Create multi-format export (PDF, Excel, CSV)
- Use CQRS for report operations (ADR-003)
- Use PostgreSQL as single source of truth (ADR-017)
- Use shared packages for reporting utilities (ADR-012)
- Write reporting tests

#### Story 2: Dashboard Analytics
**As a** administrator,  
**I want** to view analytics on a dashboard,  
**So that** I can quickly understand system status.

**Acceptance Criteria:**
- Key metrics are displayed on the dashboard
- Charts and visualizations are clear and informative
- Real-time data updates are supported
- Dashboard can be customized per user role
- Historical data trends are visible

**Technical Tasks:**
- Create analytics dashboard
- Implement data visualization
- Add real-time data updates
- Create role-based dashboard views
- Implement trend analysis
- Use domain events for real-time updates (ADR-014)
- Write dashboard tests

#### Story 3: Compliance Reporting
**As a** school administrator,  
**I want** to generate compliance reports,  
**So that** we meet DepEd/CHED requirements.

**Acceptance Criteria:**
- DepEd compliance reports are accurate and complete
- CHED reporting requirements are met
- Reports follow government formats
- Reports can be submitted electronically
- Compliance status is tracked

**Technical Tasks:**
- Implement DepEd compliance reporting
- Add CHED compliance support
- Create government format templates
- Implement electronic submission
- Add compliance tracking
- Use shared packages for compliance utilities (ADR-012)
- Write compliance tests

---

## Sprint 8: Integration Testing & Deployment Prep

**Duration**: 2 weeks  
**Focus**: Comprehensive testing and deployment preparation

**Related ADRs**: ADR-001, ADR-007, ADR-008, ADR-009, ADR-015, ADR-016, ADR-022

### User Stories

#### Story 1: End-to-End Testing
**As a** quality assurance engineer,  
**I want** comprehensive E2E tests,  
**So that** the system works correctly across all modules.

**Acceptance Criteria:**
- All critical user journeys are tested
- Cross-module functionality works correctly
- Performance meets requirements
- Security vulnerabilities are identified and fixed
- Accessibility standards are met

**Technical Tasks:**
- Create comprehensive E2E test suite with Playwright (ADR-016)
- Implement performance testing
- Add security testing
- Create accessibility testing
- Implement cross-browser testing
- Use Vitest for integration testing (ADR-015)
- Write integration tests

#### Story 2: Deployment Preparation
**As a** DevOps engineer,  
**I want** production-ready deployment configurations,  
**So that** the system can be deployed reliably.

**Acceptance Criteria:**
- Production environment is configured
- Database migrations are tested
- Backup and recovery procedures are documented
- Monitoring and alerting are configured
- Deployment procedures are automated

**Technical Tasks:**
- Configure production environment (ADR-022)
- Set up database migration procedures
- Implement backup and recovery
- Add monitoring and alerting
- Create deployment automation
- Configure Hono API gateway for production (ADR-007)
- Set up oRPC for production communication (ADR-008)
- Configure TanStack Start for production (ADR-009)
- Use Turborepo for production builds (ADR-001)
- Write deployment documentation

#### Story 3: User Documentation
**As a** user,  
**I want** comprehensive documentation,  
**So that** I can use the system effectively.

**Acceptance Criteria:**
- User manuals are complete and accurate
- Video tutorials are available
- FAQ section covers common issues
- API documentation is comprehensive
- Troubleshooting guides are helpful

**Technical Tasks:**
- Create user manuals
- Produce video tutorials
- Write FAQ documentation
- Generate API documentation for oRPC (ADR-008)
- Create troubleshooting guides
- Review and test documentation

---

## Technical Dependencies

### Cross-Sprint Dependencies

1. **Foundation First**: Sprint 0 must be completed before any other sprint
2. **Authentication Dependency**: Sprint 1 (Authentication) is required for all subsequent sprints
3. **Module Integration**: Later sprints depend on earlier modules for integration testing

### External Dependencies

1. **Payment Gateway Integration**: Requires accounts with GCash, PayMaya, etc.
2. **RFID Hardware**: Requires procurement of RFID readers and cards
3. **Email Service**: Requires configuration of email service provider
4. **Deployment Infrastructure**: Requires setup of hosting environments

---

## Risk Mitigation

### Technical Risks

1. **Database Performance**: Implement proper indexing and query optimization
2. **Multi-tenancy Security**: Regular security audits and penetration testing
3. **Payment Gateway Integration**: Thorough testing with sandbox environments
4. **RFID Hardware Compatibility**: Test with multiple RFID reader models

### Project Risks

1. **Scope Creep**: Strict adherence to defined sprint goals
2. **Team Availability**: Cross-training team members on critical components
3. **Third-party Dependencies**: Have fallback options for critical integrations

---

## Success Metrics

### Technical Metrics

- Code coverage: > 80%
- Test pass rate: 100%
- Performance: < 2s response time for critical operations
- Security: Zero critical vulnerabilities

### Business Metrics

- User adoption: > 90% of target users actively using the system
- Feature utilization: > 80% of implemented features used regularly
- Customer satisfaction: > 4.5/5 rating
- System uptime: > 99.5%

---

## Conclusion

This sprint plan provides a structured approach to building the PEMS system while following the TDD-first methodology and Domain-Driven Design principles outlined in the project vision. The plan prioritizes the cashiering module as identified in ADR-010 while building a solid foundation for future modules.

Regular sprint reviews and retrospectives will ensure the plan remains flexible and responsive to changing requirements while maintaining focus on the core objectives of delivering a high-quality educational management system for Philippine institutions.