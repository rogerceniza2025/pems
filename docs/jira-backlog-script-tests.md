# Jira Backlog Script Tests

## Overview

This document provides comprehensive test specifications for the `populate-jira-backlog.js` script, covering unit tests, integration tests, and E2E tests following TDD principles.

## Test Structure

### Unit Tests

Location: `tests/unit/scripts/populate-jira-backlog.test.ts`

### Integration Tests

Location: `tests/integration/scripts/populate-jira-backlog.test.ts`

### E2E Tests

Location: `tests/e2e/scripts/populate-jira-backlog.spec.ts`

## Test Cases

### Unit Tests

#### 1. Command Line Argument Parsing

```typescript
describe('Command Line Argument Parsing', () => {
  describe('parseArguments', () => {
    it('should parse dry-run flag correctly', () => {
      const args = ['--dry-run']
      const result = parseArguments(args)
      expect(result.dryRun).toBe(true)
      expect(result.sprint).toBeNull()
      expect(result.help).toBe(false)
    })

    it('should parse sprint number correctly', () => {
      const args = ['--sprint', '2']
      const result = parseArguments(args)
      expect(result.dryRun).toBe(false)
      expect(result.sprint).toBe(2)
      expect(result.help).toBe(false)
    })

    it('should parse help flag correctly', () => {
      const args = ['--help']
      const result = parseArguments(args)
      expect(result.dryRun).toBe(false)
      expect(result.sprint).toBeNull()
      expect(result.help).toBe(true)
    })

    it('should parse multiple flags correctly', () => {
      const args = ['--dry-run', '--sprint', '3']
      const result = parseArguments(args)
      expect(result.dryRun).toBe(true)
      expect(result.sprint).toBe(3)
      expect(result.help).toBe(false)
    })

    it('should handle invalid sprint number', () => {
      const args = ['--sprint', 'invalid']
      const result = parseArguments(args)
      expect(result.sprint).toBeNull()
    })

    it('should use default values when no arguments provided', () => {
      const args: string[] = []
      const result = parseArguments(args)
      expect(result.dryRun).toBe(false)
      expect(result.sprint).toBeNull()
      expect(result.help).toBe(false)
    })
  })
})
```

#### 2. Configuration Validation

```typescript
describe('Configuration Validation', () => {
  describe('validateConfig', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.JIRA_URL
      delete process.env.JIRA_EMAIL
      delete process.env.JIRA_API_TOKEN
      delete process.env.JIRA_PROJECT_KEY
    })

    it('should pass validation with all required environment variables', () => {
      process.env.JIRA_URL = 'https://test.atlassian.net'
      process.env.JIRA_EMAIL = 'test@example.com'
      process.env.JIRA_API_TOKEN = 'test-token'
      process.env.JIRA_PROJECT_KEY = 'TEST'

      expect(() => validateConfig()).not.toThrow()
    })

    it('should throw error when JIRA_URL is missing', () => {
      process.env.JIRA_EMAIL = 'test@example.com'
      process.env.JIRA_API_TOKEN = 'test-token'
      process.env.JIRA_PROJECT_KEY = 'TEST'

      expect(() => validateConfig()).toThrow(
        'Missing required environment variables: JIRA_URL',
      )
    })

    it('should throw error when JIRA_EMAIL is missing', () => {
      process.env.JIRA_URL = 'https://test.atlassian.net'
      process.env.JIRA_API_TOKEN = 'test-token'
      process.env.JIRA_PROJECT_KEY = 'TEST'

      expect(() => validateConfig()).toThrow(
        'Missing required environment variables: JIRA_EMAIL',
      )
    })

    it('should throw error when JIRA_API_TOKEN is missing', () => {
      process.env.JIRA_URL = 'https://test.atlassian.net'
      process.env.JIRA_EMAIL = 'test@example.com'
      process.env.JIRA_PROJECT_KEY = 'TEST'

      expect(() => validateConfig()).toThrow(
        'Missing required environment variables: JIRA_API_TOKEN',
      )
    })

    it('should throw error when JIRA_PROJECT_KEY is missing', () => {
      process.env.JIRA_URL = 'https://test.atlassian.net'
      process.env.JIRA_EMAIL = 'test@example.com'
      process.env.JIRA_API_TOKEN = 'test-token'

      expect(() => validateConfig()).toThrow(
        'Missing required environment variables: JIRA_PROJECT_KEY',
      )
    })

    it('should throw error when multiple environment variables are missing', () => {
      process.env.JIRA_URL = 'https://test.atlassian.net'
      // Other variables are missing

      expect(() => validateConfig()).toThrow(
        'Missing required environment variables: JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY',
      )
    })
  })
})
```

#### 3. Sprint Plan Parsing

```typescript
describe('Sprint Plan Parsing', () => {
  describe('parseSprintPlan', () => {
    const mockSprintPlanContent = `# PEMS Sprint Plan

## Sprint 1: Core Tenant Management & Authentication

### User Stories

#### Story 1: Multi-Tenant Architecture
**As a** system administrator,
**I want** to manage multiple schools/tenants,
**So that** each institution has isolated data and configuration.

**Acceptance Criteria:**
- New tenants can be created with unique identifiers
- Tenant isolation is enforced at database level
- Row-Level Security (RLS) is implemented

**Technical Tasks:**
- Implement tenant management domain module
- Set up PostgreSQL RLS policies
- Create tenant isolation middleware

#### Story 2: User Authentication System
**As a** user,
**I want** to securely log in to the system,
**So that** I can access my school's data.

**Acceptance Criteria:**
- Users can register with email and password
- Login/logout functionality works correctly
- Password reset functionality is implemented

**Technical Tasks:**
- Implement BetterAuth integration
- Create user management domain module
- Implement password hashing and validation

## Sprint 2: Cashiering Module

#### Story 1: Payment Processing
**As a** cashier,
**I want** to process student payments,
**So that** the school can collect fees efficiently.

**Acceptance Criteria:**
- Multiple payment methods are supported
- Payment transactions are recorded accurately
- Receipt numbers are generated sequentially

**Technical Tasks:**
- Implement cashiering management domain module
- Create payment processing service
- Integrate with payment gateways`

    it('should parse sprints correctly', () => {
      const result = parseSprintPlan(mockSprintPlanContent)

      expect(result).toHaveLength(2)
      expect(result[0].number).toBe(1)
      expect(result[0].title).toBe('Core Tenant Management & Authentication')
      expect(result[1].number).toBe(2)
      expect(result[1].title).toBe('Cashiering Module')
    })

    it('should parse stories within sprints correctly', () => {
      const result = parseSprintPlan(mockSprintPlanContent)

      expect(result[0].stories).toHaveLength(2)
      expect(result[0].stories[0].number).toBe(1)
      expect(result[0].stories[0].title).toBe('Multi-Tenant Architecture')
      expect(result[0].stories[1].number).toBe(2)
      expect(result[0].stories[1].title).toBe('User Authentication System')

      expect(result[1].stories).toHaveLength(1)
      expect(result[1].stories[0].number).toBe(1)
      expect(result[1].stories[0].title).toBe('Payment Processing')
    })

    it('should parse user stories correctly', () => {
      const result = parseSprintPlan(mockSprintPlanContent)
      const story = result[0].stories[0]

      expect(story.userStory).toBe(
        'As a system administrator, I want to manage multiple schools/tenants, So that each institution has isolated data and configuration.',
      )
    })

    it('should parse acceptance criteria correctly', () => {
      const result = parseSprintPlan(mockSprintPlanContent)
      const story = result[0].stories[0]

      expect(story.acceptanceCriteria).toHaveLength(3)
      expect(story.acceptanceCriteria[0]).toBe(
        'New tenants can be created with unique identifiers',
      )
      expect(story.acceptanceCriteria[1]).toBe(
        'Tenant isolation is enforced at database level',
      )
      expect(story.acceptanceCriteria[2]).toBe(
        'Row-Level Security (RLS) is implemented',
      )
    })

    it('should parse technical tasks correctly', () => {
      const result = parseSprintPlan(mockSprintPlanContent)
      const story = result[0].stories[0]

      expect(story.technicalTasks).toHaveLength(3)
      expect(story.technicalTasks[0]).toBe(
        'Implement tenant management domain module',
      )
      expect(story.technicalTasks[1]).toBe('Set up PostgreSQL RLS policies')
      expect(story.technicalTasks[2]).toBe('Create tenant isolation middleware')
    })

    it('should handle empty sprint plan', () => {
      const result = parseSprintPlan('')
      expect(result).toHaveLength(0)
    })

    it('should handle sprint without stories', () => {
      const content = `## Sprint 1: Empty Sprint
Some content here but no stories`
      const result = parseSprintPlan(content)

      expect(result).toHaveLength(1)
      expect(result[0].stories).toHaveLength(0)
    })

    it('should handle story without acceptance criteria', () => {
      const content = `## Sprint 1: Test Sprint
#### Story 1: Test Story
**As a** user,
**I want** to test,
**So that** it works.

**Technical Tasks:**
- Write tests`
      const result = parseSprintPlan(content)
      const story = result[0].stories[0]

      expect(story.acceptanceCriteria).toHaveLength(0)
      expect(story.technicalTasks).toHaveLength(1)
    })

    it('should handle story without technical tasks', () => {
      const content = `## Sprint 1: Test Sprint
#### Story 1: Test Story
**As a** user,
**I want** to test,
**So that** it works.

**Acceptance Criteria:**
- It should work`
      const result = parseSprintPlan(content)
      const story = result[0].stories[0]

      expect(story.acceptanceCriteria).toHaveLength(1)
      expect(story.technicalTasks).toHaveLength(0)
    })
  })
})
```

#### 4. Jira Client Creation

```typescript
describe('Jira Client Creation', () => {
  describe('createJiraClient', () => {
    beforeEach(() => {
      process.env.JIRA_URL = 'https://test.atlassian.net'
      process.env.JIRA_EMAIL = 'test@example.com'
      process.env.JIRA_API_TOKEN = 'test-token'
    })

    it('should create axios instance with correct configuration', () => {
      const client = createJiraClient()

      expect(client.defaults.baseURL).toBe(
        'https://test.atlassian.net/rest/api/3',
      )
      expect(client.defaults.headers['Authorization']).toMatch(/^Basic /)
      expect(client.defaults.headers['Content-Type']).toBe('application/json')
      expect(client.defaults.headers['Accept']).toBe('application/json')
    })

    it('should encode credentials correctly', () => {
      const client = createJiraClient()
      const authHeader = client.defaults.headers['Authorization']

      // The header should be Basic base64(email:token)
      expect(authHeader).toMatch(/^Basic /)

      // Decode to verify format
      const base64Credentials = authHeader.replace('Basic ', '')
      const credentials = Buffer.from(base64Credentials, 'base64').toString()
      expect(credentials).toBe('test@example.com:test-token')
    })

    it('should handle special characters in credentials', () => {
      process.env.JIRA_EMAIL = 'test+special@example.com'
      process.env.JIRA_API_TOKEN = 'token-with-special-chars-@#$%'

      const client = createJiraClient()
      const authHeader = client.defaults.headers['Authorization']

      expect(authHeader).toMatch(/^Basic /)

      const base64Credentials = authHeader.replace('Basic ', '')
      const credentials = Buffer.from(base64Credentials, 'base64').toString()
      expect(credentials).toBe(
        'test+special@example.com:token-with-special-chars-@#$%',
      )
    })
  })
})
```

#### 5. Description Formatting

```typescript
describe('Description Formatting', () => {
  describe('formatDescription', () => {
    const mockStory = {
      number: 1,
      title: 'Test Story',
      userStory: 'As a user, I want to test, So that it works.',
      acceptanceCriteria: [
        'It should work correctly',
        'It should handle errors',
      ],
      technicalTasks: ['Write tests', 'Implement functionality'],
    }

    it('should format description with all sections', () => {
      const result = formatDescription(mockStory, 1)

      expect(result).toContain('h2. User Story')
      expect(result).toContain(mockStory.userStory)
      expect(result).toContain('h3. Acceptance Criteria')
      expect(result).toContain('* It should work correctly')
      expect(result).toContain('* It should handle errors')
      expect(result).toContain('h3. Technical Tasks')
      expect(result).toContain('* Write tests')
      expect(result).toContain('* Implement functionality')
    })

    it('should handle story without acceptance criteria', () => {
      const storyWithoutAC = {
        ...mockStory,
        acceptanceCriteria: [],
      }

      const result = formatDescription(storyWithoutAC, 1)

      expect(result).toContain('h2. User Story')
      expect(result).toContain('h3. Technical Tasks')
      expect(result).not.toContain('h3. Acceptance Criteria')
    })

    it('should handle story without technical tasks', () => {
      const storyWithoutTasks = {
        ...mockStory,
        technicalTasks: [],
      }

      const result = formatDescription(storyWithoutTasks, 1)

      expect(result).toContain('h2. User Story')
      expect(result).toContain('h3. Acceptance Criteria')
      expect(result).not.toContain('h3. Technical Tasks')
    })

    it('should handle story with only user story', () => {
      const storyOnlyUser = {
        number: 1,
        title: 'Test Story',
        userStory: 'As a user, I want to test, So that it works.',
        acceptanceCriteria: [],
        technicalTasks: [],
      }

      const result = formatDescription(storyOnlyUser, 1)

      expect(result).toContain('h2. User Story')
      expect(result).toContain(storyOnlyUser.userStory)
      expect(result).not.toContain('h3. Acceptance Criteria')
      expect(result).not.toContain('h3. Technical Tasks')
    })

    it('should format acceptance criteria as bullet points', () => {
      const result = formatDescription(mockStory, 1)

      expect(result).toMatch(/\* It should work correctly/)
      expect(result).toMatch(/\* It should handle errors/)
    })

    it('should format technical tasks as bullet points', () => {
      const result = formatDescription(mockStory, 1)

      expect(result).toMatch(/\* Write tests/)
      expect(result).toMatch(/\* Implement functionality/)
    })
  })
})
```

#### 6. Issue Data Creation

```typescript
describe('Issue Data Creation', () => {
  describe('createIssueData', () => {
    const mockStory = {
      number: 1,
      title: 'Test Story',
      userStory: 'As a user, I want to test, So that it works.',
      acceptanceCriteria: ['It should work'],
      technicalTasks: ['Write tests'],
    }

    beforeEach(() => {
      process.env.JIRA_PROJECT_KEY = 'TEST'
    })

    it('should create issue data with correct structure', () => {
      const result = createIssueData(mockStory, 1)

      expect(result.fields.project.key).toBe('TEST')
      expect(result.fields.summary).toBe('Test Story')
      expect(result.fields.issuetype.name).toBe('Task')
      expect(result.fields.labels).toContain('sprint-1')
      expect(result.fields.description.type).toBe('doc')
      expect(result.fields.description.version).toBe(1)
      expect(result.fields.description.content).toHaveLength(1)
    })

    it('should include sprint label', () => {
      const result = createIssueData(mockStory, 2)

      expect(result.fields.labels).toContain('sprint-2')
      expect(result.fields.labels).toHaveLength(1)
    })

    it('should format description as Jira document', () => {
      const result = createIssueData(mockStory, 1)
      const description = result.fields.description

      expect(description.content[0].type).toBe('paragraph')
      expect(description.content[0].content[0].type).toBe('text')
      expect(description.content[0].content[0].text).toContain('h2. User Story')
    })

    it('should handle different project keys', () => {
      process.env.JIRA_PROJECT_KEY = 'PROJ'

      const result = createIssueData(mockStory, 1)

      expect(result.fields.project.key).toBe('PROJ')
    })
  })
})
```

### Integration Tests

#### 1. File System Integration

```typescript
describe('File System Integration', () => {
  describe('readSprintPlan', () => {
    const testSprintPlanPath = '/tmp/test-sprint-plan.md'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should read sprint plan file successfully', async () => {
      const mockContent = '# Test Sprint Plan\n## Sprint 1: Test'
      vi.mock('fs', () => ({
        readFileSync: vi.fn(() => mockContent),
      }))

      const result = readSprintPlan(testSprintPlanPath)

      expect(result).toBe(mockContent)
    })

    it('should throw error when file does not exist', () => {
      vi.mock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('ENOENT: no such file or directory')
        }),
      }))

      expect(() => readSprintPlan('/nonexistent/file.md')).toThrow(
        'ENOENT: no such file or directory',
      )
    })

    it('should handle file read errors', () => {
      vi.mock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('Permission denied')
        }),
      }))

      expect(() => readSprintPlan(testSprintPlanPath)).toThrow(
        'Permission denied',
      )
    })
  })
})
```

#### 2. Jira API Integration

```typescript
describe('Jira API Integration', () => {
  describe('createJiraIssue', () => {
    let jiraClient: any
    let mockStory: any

    beforeEach(() => {
      jiraClient = {
        post: vi.fn(),
      }

      mockStory = {
        number: 1,
        title: 'Test Story',
        userStory: 'As a user, I want to test, So that it works.',
        acceptanceCriteria: ['It should work'],
        technicalTasks: ['Write tests'],
      }
    })

    it('should create Jira issue successfully', async () => {
      const mockResponse = {
        data: {
          id: '1001',
          key: 'TEST-123',
          self: 'https://test.atlassian.net/rest/api/3/issue/1001',
        },
      }

      jiraClient.post.mockResolvedValue(mockResponse)

      const result = await createJiraIssue(jiraClient, mockStory, 1)

      expect(result).toEqual(mockResponse.data)
      expect(jiraClient.post).toHaveBeenCalledWith('/issue', expect.any(Object))
    })

    it('should handle Jira API error', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            errorMessages: ['Invalid field: summary'],
          },
        },
      }

      jiraClient.post.mockRejectedValue(mockError)

      await expect(createJiraIssue(jiraClient, mockStory, 1)).rejects.toThrow(
        'Jira API Error: 400 - {"errorMessages":["Invalid field: summary"]}',
      )
    })

    it('should handle network error', async () => {
      const networkError = new Error('Network timeout')

      jiraClient.post.mockRejectedValue(networkError)

      await expect(createJiraIssue(jiraClient, mockStory, 1)).rejects.toThrow(
        'Network timeout',
      )
    })

    it('should retry on rate limit error', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            errorMessages: ['Rate limit exceeded'],
          },
        },
      }

      const successResponse = {
        data: {
          id: '1001',
          key: 'TEST-123',
        },
      }

      jiraClient.post
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse)

      const result = await createJiraIssue(jiraClient, mockStory, 1)

      expect(result).toEqual(successResponse.data)
      expect(jiraClient.post).toHaveBeenCalledTimes(2)
    }, 10000) // Increased timeout for retry logic
  })
})
```

### E2E Tests

#### 1. Complete Workflow Tests

```typescript
describe('Complete Workflow Tests', () => {
  describe('populate-jira-backlog.js', () => {
    let testEnv: any

    beforeAll(async () => {
      // Setup test environment
      testEnv = await setupTestEnvironment()
    })

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv)
    })

    it('should complete full workflow in dry-run mode', async () => {
      const result = await execAsync(
        'node scripts/populate-jira-backlog.js --dry-run',
        {
          env: { ...process.env, ...testEnv.env },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('DRY RUN MODE')
      expect(result.stdout).toContain('Found')
      expect(result.stdout).toContain('sprint(s) with')
      expect(result.stdout).toContain('stories total')
    })

    it('should create all issues in production mode', async () => {
      // Mock Jira API to capture requests
      const mockJiraServer = await createMockJiraServer()

      const result = await execAsync('node scripts/populate-jira-backlog.js', {
        env: { ...process.env, ...testEnv.env, JIRA_URL: mockJiraServer.url },
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Successfully created')
      expect(result.stdout).toContain('Summary:')

      // Verify all issues were created
      const createdIssues = await mockJiraServer.getCreatedIssues()
      expect(createdIssues.length).toBeGreaterThan(0)

      await mockJiraServer.close()
    })

    it('should handle specific sprint processing', async () => {
      const result = await execAsync(
        'node scripts/populate-jira-backlog.js --sprint 1 --dry-run',
        {
          env: { ...process.env, ...testEnv.env },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Sprint 1:')
      expect(result.stdout).not.toContain('Sprint 2:')
    })

    it('should display help correctly', async () => {
      const result = await execAsync(
        'node scripts/populate-jira-backlog.js --help',
        {
          env: { ...process.env, ...testEnv.env },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Jira Backlog Population Script')
      expect(result.stdout).toContain('--dry-run')
      expect(result.stdout).toContain('--sprint')
      expect(result.stdout).toContain('--help')
    })

    it('should handle missing environment variables', async () => {
      const result = await execAsync('node scripts/populate-jira-backlog.js', {
        env: { NODE_ENV: 'test' }, // No Jira environment variables
      })

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Missing required environment variables')
    })

    it('should handle network errors gracefully', async () => {
      const result = await execAsync('node scripts/populate-jira-backlog.js', {
        env: {
          ...process.env,
          ...testEnv.env,
          JIRA_URL: 'https://nonexistent.atlassian.net',
        },
      })

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain('Failed:')
      expect(result.stdout).toContain('Summary:')
    })

    it('should handle malformed sprint plan', async () => {
      // Create malformed sprint plan
      await fs.writeFile(
        testEnv.sprintPlanPath,
        'Invalid content without proper structure',
      )

      const result = await execAsync(
        'node scripts/populate-jira-backlog.js --dry-run',
        {
          env: { ...process.env, ...testEnv.env },
        },
      )

      expect(result.exitCode).toBe(0) // Should still complete but with 0 stories
      expect(result.stdout).toContain('No sprints found')
    })
  })
})
```

#### 2. Performance Tests

```typescript
describe('Performance Tests', () => {
  describe('script performance', () => {
    it('should complete processing within reasonable time', async () => {
      const startTime = Date.now()

      const result = await execAsync(
        'node scripts/populate-jira-backlog.js --dry-run',
        {
          env: { ...process.env, ...getTestEnv() },
        },
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.exitCode).toBe(0)
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
    })

    it('should handle large sprint plan efficiently', async () => {
      // Create large sprint plan with many stories
      const largeSprintPlan = generateLargeSprintPlan(50) // 50 stories
      await fs.writeFile(getTestSprintPlanPath(), largeSprintPlan)

      const startTime = Date.now()

      const result = await execAsync(
        'node scripts/populate-jira-backlog.js --dry-run',
        {
          env: { ...process.env, ...getTestEnv() },
        },
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.exitCode).toBe(0)
      expect(duration).toBeLessThan(60000) // Should complete within 60 seconds
      expect(result.stdout).toContain('50 stories total')
    })
  })
})
```

## Test Data and Fixtures

### Mock Sprint Plan Data

```typescript
export const mockSprintPlanData = {
  validSprintPlan: `# PEMS Sprint Plan

## Sprint 1: Foundation & Infrastructure Setup

### User Stories

#### Story 1: Development Environment Setup
**As a** developer,
**I want** a fully configured development environment,
**So that** I can start building features without setup delays.

**Acceptance Criteria:**
- All team members can run \`pnpm install\` without errors
- All applications (api, web, admin) start with \`pnpm dev\`
- Database connection is established and migrations run successfully

**Technical Tasks:**
- Configure Turborepo with pnpm workspaces (ADR-001)
- Set up TypeScript configuration with strict mode
- Configure ESLint, Prettier, and pre-commit hooks

#### Story 2: CI/CD Pipeline Foundation
**As a** developer,
**I want** automated CI/CD pipelines,
**So that** code changes are automatically tested and validated.

**Acceptance Criteria:**
- All pull requests trigger automated tests
- Code coverage reports are generated
- Build artifacts are created and stored

**Technical Tasks:**
- Set up GitHub Actions workflows
- Configure automated testing in CI
- Set up build and deployment pipelines`,

  malformedSprintPlan: `# Invalid Sprint Plan
This is not properly formatted
No sprint headers here
Just some random content`,

  emptySprintPlan: `# Empty Sprint Plan

## Sprint 1: Empty Sprint
No stories in this sprint
`,

  largeSprintPlan: generateLargeSprintPlan(100),
}
```

### Mock Jira Responses

```typescript
export const mockJiraResponses = {
  successfulIssueCreation: {
    id: '1001',
    key: 'TEST-123',
    self: 'https://test.atlassian.net/rest/api/3/issue/1001',
  },

  rateLimitError: {
    errorMessages: ['Rate limit exceeded'],
    errors: {},
  },

  authenticationError: {
    errorMessages: ['Authentication failed'],
    errors: {},
  },

  invalidFieldError: {
    errorMessages: ['Invalid field: summary'],
    errors: {
      summary: 'Field summary is required',
    },
  },
}
```

## Test Utilities

### Mock Server Setup

```typescript
export async function createMockJiraServer() {
  const createdIssues: any[] = []

  const server = await createTestServer({
    routes: [
      {
        method: 'POST',
        path: '/rest/api/3/issue',
        handler: async (req, res) => {
          const issueData = JSON.parse(req.body)

          // Simulate rate limiting
          if (issueData.fields.summary?.includes('RATE_LIMIT')) {
            return res.status(429).json(mockJiraResponses.rateLimitError)
          }

          // Simulate authentication error
          if (issueData.fields.summary?.includes('AUTH_ERROR')) {
            return res.status(401).json(mockJiraResponses.authenticationError)
          }

          // Simulate validation error
          if (!issueData.fields.summary) {
            return res.status(400).json(mockJiraResponses.invalidFieldError)
          }

          // Success case
          const newIssue = {
            ...mockJiraResponses.successfulIssueCreation,
            id: String(1000 + createdIssues.length + 1),
            key: `TEST-${123 + createdIssues.length + 1}`,
            fields: issueData.fields,
          }

          createdIssues.push(newIssue)
          return res.status(201).json(newIssue)
        },
      },
    ],
  })

  return {
    server,
    url: server.url,
    getCreatedIssues: () => createdIssues,
    close: () => server.close(),
  }
}
```

### Test Environment Setup

```typescript
export async function setupTestEnvironment() {
  const tempDir = await fs.mkdtemp('/tmp/pems-test-')
  const sprintPlanPath = path.join(tempDir, 'sprint-plan.md')

  await fs.writeFile(sprintPlanPath, mockSprintPlanData.validSprintPlan)

  return {
    tempDir,
    sprintPlanPath,
    env: {
      JIRA_URL: 'https://test.atlassian.net',
      JIRA_EMAIL: 'test@example.com',
      JIRA_API_TOKEN: 'test-token',
      JIRA_PROJECT_KEY: 'TEST',
      SPRINT_PLAN_PATH: sprintPlanPath,
    },
  }
}

export async function cleanupTestEnvironment(env: any) {
  await fs.rm(env.tempDir, { recursive: true, force: true })
}
```

## Execution Commands

### Run All Tests

```bash
# Unit tests
npm run test:unit tests/unit/scripts/populate-jira-backlog.test.ts

# Integration tests
npm run test:integration tests/integration/scripts/populate-jira-backlog.test.ts

# E2E tests
npm run test:e2e tests/e2e/scripts/populate-jira-backlog.spec.ts

# All script tests
npm run test -- --grep "populate-jira-backlog"
```

### Coverage Requirements

- **Unit Tests**: 95%+ coverage for all functions
- **Integration Tests**: 90%+ coverage for API interactions
- **E2E Tests**: 100% coverage for critical workflows

### Test Data Management

- Use deterministic test data for reproducible results
- Clean up test data after each test
- Isolate test environments to prevent interference
- Mock external dependencies to ensure reliability

This comprehensive test suite ensures the Jira backlog script works correctly across all scenarios, from simple argument parsing to complex API interactions and error handling.
