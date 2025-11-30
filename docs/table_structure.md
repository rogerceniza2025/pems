pems/
│
├── .github/                           # GitHub configuration
│   ├── workflows/                     # CI/CD pipelines
│   │   ├── ci.yml                    # Continuous integration
│   │   ├── deploy-staging.yml        # Staging deployment
│   │   ├── deploy-production.yml     # Production deployment
│   │   └── test.yml                  # Automated testing
│   ├── ISSUE_TEMPLATE/               # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md      # PR template
│
├── apps/                              # Application layer (deployable apps)
│   │
│   ├── web/                          # Main web application (TanStack Start + SolidJS)
│   │   ├── public/                   # Static assets
│   │   │   ├── favicon.ico
│   │   │   ├── robots.txt
│   │   │   └── images/
│   │   │       ├── deped-logo.png
│   │   │       └── ched-logo.png
│   │   │
│   │   ├── src/
│   │   │   ├── assets/               # Dynamic assets
│   │   │   │   ├── icons/
│   │   │   │   └── styles/
│   │   │   │       └── global.css
│   │   │   │
│   │   │   ├── components/           # Shared UI components
│   │   │   │   ├── common/          # Generic reusable components
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── Table.tsx
│   │   │   │   │   ├── Form/
│   │   │   │   │   │   ├── Input.tsx
│   │   │   │   │   │   ├── Select.tsx
│   │   │   │   │   │   ├── Checkbox.tsx
│   │   │   │   │   │   └── DatePicker.tsx
│   │   │   │   │   └── DataTable/   # Advanced table with sorting, filtering
│   │   │   │   │       ├── DataTable.tsx
│   │   │   │   │       ├── Pagination.tsx
│   │   │   │   │       └── Filters.tsx
│   │   │   │   │
│   │   │   │   ├── layout/          # Layout components
│   │   │   │   │   ├── AppShell.tsx # Main app container
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── Breadcrumbs.tsx
│   │   │   │   │
│   │   │   │   ├── navigation/      # Navigation components
│   │   │   │   │   ├── MainNav.tsx
│   │   │   │   │   ├── ModuleNav.tsx
│   │   │   │   │   ├── UserMenu.tsx
│   │   │   │   │   └── SchoolSwitcher.tsx # For switching between schools (multi-tenant)
│   │   │   │   │
│   │   │   │   └── features/        # Feature-specific components
│   │   │   │       ├── enrollment/
│   │   │   │       ├── attendance/
│   │   │   │       ├── grading/
│   │   │   │       └── cashiering/
│   │   │   │
│   │   │   ├── routes/              # File-based routing (TanStack Start)
│   │   │   │   ├── __root.tsx       # Root layout
│   │   │   │   ├── index.tsx        # Dashboard/home
│   │   │   │   │
│   │   │   │   ├── auth/            # Authentication routes
│   │   │   │   │   ├── login.tsx
│   │   │   │   │   ├── register.tsx
│   │   │   │   │   ├── forgot-password.tsx
│   │   │   │   │   └── reset-password.tsx
│   │   │   │   │
│   │   │   │   ├── dashboard/       # Main dashboard
│   │   │   │   │   └── index.tsx
│   │   │   │   │
│   │   │   │   ├── students/        # Student management routes
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── $studentId.tsx
│   │   │   │   │   ├── new.tsx
│   │   │   │   │   └── import.tsx
│   │   │   │   │
│   │   │   │   ├── enrollment/      # Enrollment routes
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── new.tsx
│   │   │   │   │   └── $enrollmentId.tsx
│   │   │   │   │
│   │   │   │   ├── attendance/      # Attendance routes
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── rfid.tsx     # RFID-based attendance
│   │   │   │   │   └── manual.tsx
│   │   │   │   │
│   │   │   │   ├── grading/         # Grading routes
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── quarters/    # K-12 quarterly grades
│   │   │   │   │   └── semesters/   # HE semester grades
│   │   │   │   │
│   │   │   │   ├── cashiering/      # Payment/cashiering routes
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── transactions/
│   │   │   │   │   ├── receipts/
│   │   │   │   │   └── reports/
│   │   │   │   │
│   │   │   │   ├── accounting/      # Accounting module routes
│   │   │   │   ├── hr/              # HR module routes
│   │   │   │   ├── inventory/       # Inventory module routes
│   │   │   │   │
│   │   │   │   └── settings/        # System settings
│   │   │   │       ├── index.tsx
│   │   │   │       ├── school.tsx
│   │   │   │       ├── users.tsx
│   │   │   │       ├── roles.tsx
│   │   │   │       └── modules.tsx  # Module subscription management
│   │   │   │
│   │   │   ├── stores/              # TanStack Store (state management)
│   │   │   │   ├── auth.store.ts
│   │   │   │   ├── tenant.store.ts  # Current school/tenant context
│   │   │   │   ├── navigation.store.ts
│   │   │   │   └── ui.store.ts
│   │   │   │
│   │   │   ├── hooks/               # Custom SolidJS hooks
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useTenant.ts
│   │   │   │   ├── usePermissions.ts
│   │   │   │   ├── useRFID.ts
│   │   │   │   └── usePayment.ts
│   │   │   │
│   │   │   ├── lib/                 # Utility libraries
│   │   │   │   ├── api-client.ts    # oRPC client wrapper
│   │   │   │   ├── auth-client.ts   # BetterAuth client
│   │   │   │   ├── validators.ts    # Form validation utilities
│   │   │   │   ├── formatters.ts    # Data formatting (dates, currency, etc.)
│   │   │   │   └── constants.ts
│   │   │   │
│   │   │   ├── types/               # TypeScript type definitions
│   │   │   │   ├── api.types.ts
│   │   │   │   └── global.d.ts
│   │   │   │
│   │   │   └── router.tsx           # TanStack Router configuration
│   │   │
│   │   ├── tests/                   # Web app tests
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   │       ├── enrollment.spec.ts
│   │   │       ├── attendance.spec.ts
│   │   │       └── cashiering.spec.ts
│   │   │
│   │   ├── app.config.ts            # TanStack Start config
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   ├── api/                          # API Gateway (Hono 4.10.7)
│   │   ├── src/
│   │   │   ├── middleware/          # HTTP middleware
│   │   │   │   ├── auth.middleware.ts      # JWT/session validation
│   │   │   │   ├── tenant.middleware.ts    # Multi-tenant context
│   │   │   │   ├── rbac.middleware.ts      # Permission checking
│   │   │   │   ├── logger.middleware.ts
│   │   │   │   ├── cors.middleware.ts
│   │   │   │   └── error.middleware.ts
│   │   │   │
│   │   │   ├── routes/              # REST API routes
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── health.routes.ts
│   │   │   │   └── v1/              # API versioning
│   │   │   │       ├── students.routes.ts
│   │   │   │       ├── enrollment.routes.ts
│   │   │   │       ├── attendance.routes.ts
│   │   │   │       └── payments.routes.ts
│   │   │   │
│   │   │   ├── rpc/                 # oRPC endpoints
│   │   │   │   ├── index.ts         # RPC router
│   │   │   │   └── procedures/
│   │   │   │       ├── enrollment.procedures.ts
│   │   │   │       ├── grading.procedures.ts
│   │   │   │       └── cashiering.procedures.ts
│   │   │   │
│   │   │   ├── app.ts               # Hono app instance
│   │   │   └── server.ts            # Server entry point
│   │   │
│   │   ├── tests/
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── admin/                        # Separate admin panel (optional)
│   │   └── # Similar structure to web app but for super admin
│   │
│   └── mobile/                       # Future: React Native/Capacitor mobile app
│       └── # Mobile-specific implementation
│
├── modules/                          # Domain modules (DDD bounded contexts)
│   │
│   ├── user-management/             # Core: User authentication & authorization
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── User.entity.ts
│   │   │   │   ├── Role.entity.ts
│   │   │   │   └── Permission.entity.ts
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── Email.vo.ts
│   │   │   │   ├── Password.vo.ts
│   │   │   │   └── PhoneNumber.vo.ts
│   │   │   │
│   │   │   ├── aggregates/
│   │   │   │   └── UserAggregate.ts
│   │   │   │
│   │   │   ├── repositories/        # Interface definitions
│   │   │   │   ├── IUserRepository.ts
│   │   │   │   └── IRoleRepository.ts
│   │   │   │
│   │   │   ├── events/              # Domain events
│   │   │   │   ├── UserCreated.event.ts
│   │   │   │   ├── UserActivated.event.ts
│   │   │   │   └── UserDeactivated.event.ts
│   │   │   │
│   │   │   └── errors/              # Domain-specific errors
│   │   │       ├── UserNotFound.error.ts
│   │   │       └── InvalidCredentials.error.ts
│   │   │
│   │   ├── application/             # Use cases & application logic
│   │   │   ├── commands/            # Write operations (CQRS)
│   │   │   │   ├── CreateUser.command.ts
│   │   │   │   ├── UpdateUser.command.ts
│   │   │   │   ├── DeleteUser.command.ts
│   │   │   │   └── AssignRole.command.ts
│   │   │   │
│   │   │   ├── queries/             # Read operations (CQRS)
│   │   │   │   ├── GetUser.query.ts
│   │   │   │   ├── ListUsers.query.ts
│   │   │   │   └── GetUserPermissions.query.ts
│   │   │   │
│   │   │   ├── handlers/            # Command/Query handlers
│   │   │   │   ├── CreateUserHandler.ts
│   │   │   │   ├── UpdateUserHandler.ts
│   │   │   │   └── GetUserHandler.ts
│   │   │   │
│   │   │   ├── services/            # Application services
│   │   │   │   ├── PasswordHashingService.ts
│   │   │   │   └── PermissionCheckService.ts
│   │   │   │
│   │   │   └── dtos/                # Data transfer objects
│   │   │       ├── CreateUserDto.ts
│   │   │       ├── UserResponseDto.ts
│   │   │       └── UserListDto.ts
│   │   │
│   │   ├── infrastructure/          # Technical implementation
│   │   │   ├── persistence/
│   │   │   │   ├── UserRepository.ts       # Prisma implementation
│   │   │   │   ├── RoleRepository.ts
│   │   │   │   └── mappers/                # Domain ↔ Prisma mapping
│   │   │   │       ├── UserMapper.ts
│   │   │   │       └── RoleMapper.ts
│   │   │   │
│   │   │   ├── http/                # REST endpoints
│   │   │   │   └── user.controller.ts
│   │   │   │
│   │   │   └── rpc/                 # oRPC endpoints
│   │   │       └── user.procedures.ts
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/                # Domain logic tests
│   │   │   │   ├── User.entity.test.ts
│   │   │   │   └── Email.vo.test.ts
│   │   │   │
│   │   │   ├── integration/         # Repository/database tests
│   │   │   │   └── UserRepository.test.ts
│   │   │   │
│   │   │   └── e2e/                 # End-to-end API tests
│   │   │       └── user-api.test.ts
│   │   │
│   │   ├── index.ts                 # Module public API
│   │   └── package.json
│   │
│   ├── tenant-management/           # Core: Multi-tenancy (School management)
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── School.entity.ts
│   │   │   │   ├── SchoolConfig.entity.ts
│   │   │   │   └── Subscription.entity.ts    # Module subscriptions
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── SchoolCode.vo.ts          # DEPED/CHED school ID
│   │   │   │   ├── TenantId.vo.ts
│   │   │   │   └── SubscriptionPlan.vo.ts
│   │   │   │
│   │   │   └── enums/
│   │   │       ├── SchoolType.enum.ts        # K12, HIGHER_ED
│   │   │       └── ModuleType.enum.ts        # Available modules
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── CreateSchool.command.ts
│   │   │   │   ├── SubscribeToModule.command.ts
│   │   │   │   └── UnsubscribeFromModule.command.ts
│   │   │   │
│   │   │   └── services/
│   │   │       └── TenantIsolationService.ts # Ensure data isolation
│   │   │
│   │   └── infrastructure/
│   │       └── persistence/
│   │           └── SchoolRepository.ts
│   │
│   ├── student-management/          # Student information system
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Student.entity.ts
│   │   │   │   ├── StudentProfile.entity.ts
│   │   │   │   └── Guardian.entity.ts
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── LRN.vo.ts                 # Learner Reference Number (DepEd)
│   │   │   │   ├── StudentNumber.vo.ts       # Higher Ed student number
│   │   │   │   └── Address.vo.ts
│   │   │   │
│   │   │   └── enums/
│   │   │       ├── GradeLevel.enum.ts        # KG to Grade 12
│   │   │       └── Strand.enum.ts            # SHS strands (STEM, ABM, etc.)
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── RegisterStudent.command.ts
│   │   │   │   ├── UpdateStudentProfile.command.ts
│   │   │   │   └── TransferStudent.command.ts
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── GetStudent.query.ts
│   │   │   │   ├── SearchStudents.query.ts
│   │   │   │   └── GetStudentsBySection.query.ts
│   │   │   │
│   │   │   └── services/
│   │   │       └── LRNValidationService.ts   # Validate DepEd LRN
│   │   │
│   │   └── infrastructure/
│   │       ├── persistence/
│   │       │   └── StudentRepository.ts
│   │       │
│   │       └── external/            # External integrations
│   │           └── DepEdLRNService.ts        # Future: DepEd API integration
│   │
│   ├── enrollment-management/       # Enrollment & registration
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Enrollment.entity.ts
│   │   │   │   ├── Section.entity.ts
│   │   │   │   ├── Subject.entity.ts
│   │   │   │   └── Schedule.entity.ts
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── SchoolYear.vo.ts
│   │   │   │   ├── Semester.vo.ts            # HE: 1st, 2nd, Summer
│   │   │   │   └── Quarter.vo.ts             # K-12: 1st-4th quarter
│   │   │   │
│   │   │   └── aggregates/
│   │   │       └── EnrollmentAggregate.ts    # Enrollment + Section + Subjects
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── EnrollStudent.command.ts
│   │   │   │   ├── AssignToSection.command.ts
│   │   │   │   ├── DropSubject.command.ts
│   │   │   │   └── ApproveEnrollment.command.ts
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── GetEnrollment.query.ts
│   │   │   │   ├── GetStudentSchedule.query.ts
│   │   │   │   └── GetSectionRoster.query.ts
│   │   │   │
│   │   │   └── services/
│   │   │       ├── EnrollmentValidationService.ts
│   │   │       └── ScheduleConflictService.ts
│   │   │
│   │   └── infrastructure/
│   │       └── persistence/
│   │           ├── EnrollmentRepository.ts
│   │           └── SectionRepository.ts
│   │
│   ├── attendance-management/       # Attendance tracking with RFID
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Attendance.entity.ts
│   │   │   │   ├── AttendanceRecord.entity.ts
│   │   │   │   └── RFIDCard.entity.ts
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── RFIDNumber.vo.ts
│   │   │   │   ├── AttendanceStatus.vo.ts    # Present, Absent, Late, Excused
│   │   │   │   └── TimeIn.vo.ts
│   │   │   │
│   │   │   └── events/
│   │   │       ├── StudentCheckedIn.event.ts
│   │   │       └── StudentCheckedOut.event.ts
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── RecordAttendance.command.ts
│   │   │   │   ├── MarkAbsent.command.ts
│   │   │   │   └── ExcuseAbsence.command.ts
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── GetDailyAttendance.query.ts
│   │   │   │   ├── GetStudentAttendanceHistory.query.ts
│   │   │   │   └── GenerateAttendanceReport.query.ts
│   │   │   │
│   │   │   └── services/
│   │   │       ├── RFIDAttendanceService.ts  # Core RFID logic
│   │   │       └── AttendanceReportService.ts
│   │   │
│   │   └── infrastructure/
│   │       ├── persistence/
│   │       │   └── AttendanceRepository.ts
│   │       │
│   │       └── hardware/            # RFID hardware integration
│   │           ├── RFIDReaderAdapter.ts
│   │           ├── SerialPortReader.ts       # USB RFID readers
│   │           └── NetworkReader.ts          # Network-based readers
│   │
│   ├── grading-management/          # Grades & academic records
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Grade.entity.ts
│   │   │   │   ├── GradeComponent.entity.ts  # Written Work, Performance Task, etc.
│   │   │   │   ├── ReportCard.entity.ts
│   │   │   │   └── Transcript.entity.ts
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── NumericGrade.vo.ts        # 0-100 for K-12
│   │   │   │   ├── LetterGrade.vo.ts         # A-F for HE (optional)
│   │   │   │   └── GPA.vo.ts                 # Higher Ed GPA
│   │   │   │
│   │   │   ├── enums/
│   │   │   │   ├── GradingPeriod.enum.ts     # Quarter/Semester
│   │   │   │   └── ComponentType.enum.ts     # DepEd grading components
│   │   │   │
│   │   │   └── services/              # Domain services
│   │   │       └── GradeCalculator.ts        # DepEd/CHED grade computation
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── RecordGrade.command.ts
│   │   │   │   ├── ComputeFinalGrade.command.ts
│   │   │   │   └── GenerateReportCard.command.ts
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── GetStudentGrades.query.ts
│   │   │   │   ├── GetClassGrades.query.ts
│   │   │   │   └── GetTranscript.query.ts
│   │   │   │
│   │   │   └── services/
│   │   │       ├── DepEdGradingService.ts    # K-12 specific
│   │   │       └── CHEDGradingService.ts     # Higher Ed specific
│   │   │
│   │   └── infrastructure/
│   │       └── persistence/
│   │           ├── GradeRepository.ts
│   │           └── ReportCardRepository.ts
│   │
│   ├── cashiering-management/       # Payment & cashiering (PRIORITY)
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Payment.entity.ts
│   │   │   │   ├── Receipt.entity.ts
│   │   │   │   ├── Fee.entity.ts
│   │   │   │   ├── StudentAccount.entity.ts
│   │   │   │   └── CashierSession.entity.ts  # Daily cashier sessions
│   │   │   │
│   │   │   ├── value-objects/
│   │   │   │   ├── Amount.vo.ts
│   │   │   │   ├── ReceiptNumber.vo.ts
│   │   │   │   └── ORNumber.vo.ts            # Official Receipt number
│   │   │   │
│   │   │   ├── enums/
│   │   │   │   ├── PaymentMethod.enum.ts     # Cash, Check, GCash, etc.
│   │   │   │   ├── PaymentStatus.enum.ts     # Pending, Paid, Cancelled
│   │   │   │   └── FeeType.enum.ts           # Tuition, Misc, Lab, etc.
│   │   │   │
│   │   │   └── events/
│   │   │       ├── PaymentReceived.event.ts
│   │   │       └── ReceiptIssued.event.ts
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   ├── ProcessPayment.command.ts
│   │   │   │   ├── IssueReceipt.command.ts
│   │   │   │   ├── VoidReceipt.command.ts
│   │   │   │   └── CloseCashierSession.command.ts
│   │   │   │
│   │   │   ├── queries/
│   │   │   │   ├── GetPaymentHistory.query.ts
│   │   │   │   ├── GetStudentBalance.query.ts
│   │   │   │   ├── GetDailyCollections.query.ts
│   │   │   │   └── GenerateRemittanceReport.query.ts
│   │   │   │
│   │   │   └── services/
│   │   │       ├── PaymentProcessingService.ts
│   │   │       ├── ReceiptGenerationService.ts
│   │   │       └── AccountingIntegrationService.ts
│   │   │
│   │   └── infrastructure/
│   │       ├── persistence/
│   │       │   ├── PaymentRepository.ts
│   │       │   └── ReceiptRepository.ts
│   │       │
│   │       ├── payment-gateways/    # Payment gateway integrations
│   │       │   ├── PayMongoAdapter.ts
│   │       │   ├── GCashAdapter.ts
│   │       │   └── PayMayaAdapter.ts
│   │       │
│   │       └── printing/            # Receipt/OR printing
│   │           └── ReceiptPrinter.ts
│   │
│   ├── accounting-management/       # Financial accounting (Module subscription)
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── JournalEntry.entity.ts
│   │   │   │   ├── Account.entity.ts
│   │   │   │   └── GeneralLedger.entity.ts
│   │   │   │
│   │   │   └── enums/
│   │   │       ├── AccountType.enum.ts       # Asset, Liability, etc.
│   │   │       └── TransactionType.enum.ts
│   │   │
│   │   ├── application/
│   │   │   ├── commands/
│   │   │   │   └── PostJournalEntry.command.ts
│   │   │   │
│   │   │   └── queries/
│   │   │       ├── GetTrialBalance.query.ts
│   │   │       ├── GetBalanceSheet.query.ts
│   │   │       └── GetIncomeStatement.query.ts
│   │   │
│   │   └── infrastructure/
│   │       └── persistence/
│   │           └── AccountingRepository.ts
│   │
│   ├── hr-management/               # Human Resources (Module subscription)
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Employee.entity.ts
│   │   │   │   ├── Position.entity.ts
│   │   │   │   ├── Department.entity.ts
│   │   │   │   ├── Payroll.entity.ts
│   │   │   │   └── Leave.entity.ts
│   │   │   │
│   │   │   └── enums/
│   │   │       ├── EmployeeType.enum.ts      # Teaching, Non-teaching
│   │   │       └── LeaveType.enum.ts
│   │   │
│   │   ├── application/
│   │   │   └── # Similar structure
│   │   │
│   │   └── infrastructure/
│   │       └── # Similar structure
│   │
│   ├── inventory-management/        # Inventory/warehouse (Module subscription)
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── Item.entity.ts
│   │   │   │   ├── Stock.entity.ts
│   │   │   │   └── Requisition.entity.ts
│   │   │   │
│   │   │   └── enums/
│   │   │       └── ItemCategory.enum.ts
│   │   │
│   │   ├── application/
│   │   │   └── # Similar structure
│   │   │
│   │   └── infrastructure/
│   │       └── # Similar structure
│   │
│   ├── navigation-management/       # Dynamic navigation with RBAC
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── MenuItem.entity.ts
│   │   │   │   └── ModuleMenu.entity.ts
│   │   │   │
│   │   │   └── value-objects/
│   │   │       └── MenuPath.vo.ts
│   │   │
│   │   ├── application/
│   │   │   ├── queries/
│   │   │   │   └── GetUserNavigation.query.ts
│   │   │   │
│   │   │   └── services/
│   │   │       └── NavigationFilterService.ts  # Filter by permissions
│   │   │
│   │   └── infrastructure/
│   │       └── persistence/
│   │           └── NavigationRepository.ts
│   │
│   └── reporting-management/        # Cross-module reporting
│       ├── domain/
│       │   └── entities/
│       │       └── Report.entity.ts
│       │
│       ├── application/
│       │   ├── queries/
│       │   │   ├── GenerateEnrollmentReport.query.ts
│       │   │   ├── GenerateAttendanceReport.query.ts
│       │   │   ├── GenerateGradesReport.query.ts
│       │   │   ├── GenerateFinancialReport.query.ts
│       │   │   └── GenerateDepEdReport.query.ts  # DepEd compliance reports
│       │   │
│       │   └── services/
│       │       ├── ReportGenerationService.ts
│       │       └── ExcelExportService.ts
│       │
│       └── infrastructure/
│           └── export/
│               ├── PDFGenerator.ts
│               ├── ExcelGenerator.ts
│               └── CSVGenerator.ts
│
├── packages/                         # Shared packages (reusable libraries)
│   │
│   ├── shared/                      # Shared utilities & constants
│   │   ├── constants/               # Shared constants
│   │   │   ├── src/
│   │   │   │   ├── permissions.ts   # RBAC permissions
│   │   │   │   ├── roles.ts         # System roles
│   │   │   │   ├── fee-types.ts     # DepEd/CHED fee types
│   │   │   │   ├── grade-levels.ts  # K-12 grade levels
│   │   │   │   └── shs-strands.ts   # Senior High School strands
│   │   │   │
│   │   │   └── package.json
│   │   │
│   │   ├── types/                   # Shared TypeScript types
│   │   │   ├── src/
│   │   │   │   ├── api.types.ts
│   │   │   │   ├── domain.types.ts
│   │   │   │   ├── deped.types.ts   # DepEd-specific types
│   │   │   │   └── ched.types.ts    # CHED-specific types
│   │   │   │
│   │   │   └── package.json
│   │   │
│   │   └── utils/                   # Utility functions
│   │       ├── src/
│   │       │   ├── validators/
│   │       │   │   ├── lrn-validator.ts      # Validate LRN format
│   │       │   │   ├── email-validator.ts
│   │       │   │   └── phone-validator.ts    # Philippine phone format
│   │       │   │
│   │       │   ├── formatters/
│   │       │   │   ├── date-formatter.ts
│   │       │   │   ├── currency-formatter.ts # PHP currency
│   │       │   │   └── name-formatter.ts
│   │       │   │
│   │       │   ├── generators/
│   │       │   │   ├── uuid.ts              # UUIDv7 generation
│   │       │   │   ├── receipt-number.ts
│   │       │   │   └── password.ts
│   │       │   │
│   │       │   └── helpers/
│   │       │       ├── array-helpers.ts
│   │       │       ├── object-helpers.ts
│   │       │       └── string-helpers.ts
│   │       │
│   │       └── package.json
│   │
│   ├── ui/                          # Shared UI component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Button/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Button.test.tsx
│   │   │   │   │   └── Button.stories.tsx
│   │   │   │   │
│   │   │   │   ├── Input/
│   │   │   │   ├── Select/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Table/
│   │   │   │   └── # ... other components
│   │   │   │
│   │   │   ├── hooks/               # Shared UI hooks
│   │   │   ├── styles/              # Shared styles
│   │   │   └── theme/               # Theme configuration
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── infrastructure/              # Infrastructure layer packages
│   │   │
│   │   ├── database/                # Database package (Prisma)
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma    # Main Prisma schema
│   │   │   │   ├── migrations/      # Database migrations
│   │   │   │   │   └── # Auto-generated migration files
│   │   │   │   │
│   │   │   │   └── seed/            # Database seeding
│   │   │   │       ├── seed.ts
│   │   │   │       ├── data/
│   │   │   │       │   ├── roles.ts
│   │   │   │       │   ├── permissions.ts
│   │   │   │       │   ├── grade-levels.ts
│   │   │   │       │   └── fee-types.ts
│   │   │   │       │
│   │   │   │       └── # Test data generators
│   │   │   │
│   │   │   ├── src/
│   │   │   │   ├── client.ts        # Prisma client singleton
│   │   │   │   ├── types.ts         # Generated Prisma types
│   │   │   │   └── extensions/      # Prisma extensions
│   │   │   │       ├── soft-delete.ts
│   │   │   │       └── tenant-isolation.ts
│   │   │   │
│   │   │   └── package.json
│   │   │
│   │   ├── auth/                    # Authentication package (BetterAuth)
│   │   │   ├── src/
│   │   │   │   ├── config.ts        # BetterAuth configuration
│   │   │   │   ├── client.ts        # Auth client
│   │   │   │   ├── server.ts        # Auth server
│   │   │   │   ├── middleware/
│   │   │   │   │   └── auth-middleware.ts
│   │   │   │   │
│   │   │   │   └── providers/       # Auth providers
│   │   │   │       ├── credentials.ts
│   │   │   │       └── google.ts    # Optional: Google SSO
│   │   │   │
│   │   │   └── package.json
│   │   │
│   │   ├── rpc/                     # RPC package (oRPC)
│   │   │   ├── src/
│   │   │   │   ├── client.ts        # oRPC client
│   │   │   │   ├── server.ts        # oRPC server
│   │   │   │   ├── router.ts        # Main RPC router
│   │   │   │   └── middleware/
│   │   │   │       └── logging.ts
│   │   │   │
│   │   │   └── package.json
│   │   │
│   │   ├── cache/                   # Caching layer (Redis - optional)
│   │   │   ├── src/
│   │   │   │   ├── client.ts
│   │   │   │   └── strategies/
│   │   │   │       └── cache-aside.ts
│   │   │   │
│   │   │   └── package.json
│   │   │
│   │   └── email/                   # Email service
│   │       ├── src/
│   │       │   ├── client.ts
│   │       │   ├── templates/       # Email templates
│   │       │   │   ├── welcome.tsx
│   │       │   │   ├── enrollment-confirmation.tsx
│   │       │   │   └── payment-receipt.tsx
│   │       │   │
│   │       │   └── providers/
│   │       │       └── resend.ts    # Or SendGrid, etc.
│   │       │
│   │       └── package.json
│   │
│   ├── config/                      # Shared configuration
│   │   ├── eslint/
│   │   │   └── package.json
│   │   │
│   │   ├── typescript/
│   │   │   ├── base.json
│   │   │   ├── node.json
│   │   │   ├── solid.json
│   │   │   └── package.json
│   │   │
│   │   └── tailwind/
│   │       ├── preset.ts
│   │       └── package.json
│   │
│   └── testing/                     # Testing utilities
│       ├── src/
│       │   ├── setup/
│       │   │   ├── vitest.setup.ts
│       │   │   └── playwright.setup.ts
│       │   │
│       │   ├── factories/           # Test data factories
│       │   │   ├── user.factory.ts
│       │   │   ├── student.factory.ts
│       │   │   └── enrollment.factory.ts
│       │   │
│       │   ├── mocks/               # Mock data & services
│       │   │   ├── prisma-mock.ts
│       │   │   └── auth-mock.ts
│       │   │
│       │   └── helpers/             # Test helpers
│       │       └── database-helper.ts
│       │
│       └── package.json
│
├── scripts/                          # Utility scripts
│   ├── setup/
│   │   ├── install.sh               # Initial setup script
│   │   └── docker-setup.sh          # Docker setup
│   │
│   ├── database/
│   │   ├── backup.sh                # Database backup
│   │   ├── restore.sh               # Database restore
│   │   └── reset.sh                 # Development reset
│   │
│   ├── deployment/
│   │   ├── deploy-staging.sh
│   │   └── deploy-production.sh
│   │
│   └── generators/                  # Code generators
│       ├── module.ts                # Generate new module
│       ├── entity.ts                # Generate entity boilerplate
│       └── crud.ts                  # Generate CRUD operations
│
├── docs/                            # Documentation
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── ddd-patterns.md
│   │   ├── cqrs.md
│   │   ├── multi-tenancy.md
│   │   └── module-architecture.md
│   │
│   ├── api/
│   │   ├── rest-api.md
│   │   ├── rpc-api.md
│   │   └── authentication.md
│   │
│   ├── modules/
│   │   ├── enrollment.md
│   │   ├── attendance.md
│   │   ├── grading.md
│   │   └── cashiering.md
│   │
│   ├── deployment/
│   │   ├── local-setup.md
│   │   ├── cloud-deployment.md
│   │   └── on-premise-deployment.md
│   │
│   ├── deped-compliance/            # DepEd guidelines
│   │   ├── k12-structure.md
│   │   ├── grading-system.md
│   │   └── reporting-requirements.md
│   │
│   └── ched-compliance/             # CHED guidelines
│       ├── higher-ed-structure.md
│       └── reporting-requirements.md
│
├── tests/                           # Global test configuration
│   ├── setup/
│   │   └── global-setup.ts
│   │
│   └── fixtures/                    # Shared test fixtures
│       ├── users.json
│       ├── students.json
│       └── schools.json
│
├── docker/                          # Docker configurations
│   ├── Dockerfile.api               # API container
│   ├── Dockerfile.web               # Web app container
│   ├── Dockerfile.postgres          # PostgreSQL with extensions
│   └── docker-compose.yml           # Development compose
│
├── .env.example                     # Environment variables template
├── .env                             # Local environment (git-ignored)
├── .gitignore
├── .prettierrc                      # Code formatting
├── .eslintrc.js                     # Linting rules
│
├── turbo.json                       # Turborepo configuration
├── pnpm-workspace.yaml              # pnpm workspace config
├── package.json                     # Root package.json
├── tsconfig.json                    # Root TypeScript config
│
├── vitest.config.ts                 # Vitest configuration
├── playwright.config.ts             # Playwright configuration
│
├── README.md                        # Main readme
├── SETUP.md                         # Setup guide (your document)
├── CONTRIBUTING.md                  # Contribution guidelines
├── LICENSE                          # License file
│
└── CHANGELOG.md                     # Version history