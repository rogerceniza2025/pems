# Branch Protection Rules for TDD Compliance

This document outlines the branch protection rules and GitHub settings required to enforce TDD compliance at the repository level.

## GitHub Branch Protection Settings

### Main Branch Protection

**Branch**: `main` and `develop`

#### Required Status Checks

```yaml
Required status checks:
  - TDD Enforcement
  - Coverage Validation
  - Test Suite
  - Build Validation
  - Lint Check
  - Type Check
```

#### Required Pull Request Reviews

```yaml
Required reviewers:
  - Minimum: 1
  - Require code owner reviews: true
  - Dismiss stale PR approvals when new commits are pushed: true
  - Require review from CODEOWNERS: true
```

#### Additional Restrictions

```yaml
Restrictions:
  - Require status checks to pass before merging: true
  - Require branches to be up to date before merging: true
  - Do not allow bypassing the above settings: false (allow admins)
```

## GitHub Actions Workflow for Branch Protection

**File: `.github/workflows/branch-protection.yml`**

```yaml
name: Branch Protection and TDD Compliance

on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  tdd-compliance:
    name: TDD Compliance Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for better analysis
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v40
        with:
          files: |
            **/*.{js,jsx,ts,tsx}
            **/*.{test,spec}.{js,jsx,ts,tsx}
            package.json
            pnpm-lock.yaml
      
      - name: Install dependencies
        if: steps.changed-files.outputs.any_changed == 'true'
        run: pnpm install --frozen-lockfile
      
      - name: Validate TDD Principles
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          echo "🔍 Validating TDD principles for changed files..."
          pnpm test:enforce
        continue-on-error: false
      
      - name: Validate Test Coverage
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          echo "📊 Validating test coverage..."
          pnpm test:coverage-validate
        continue-on-error: false
      
      - name: Run Test Suite
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          echo "🧪 Running full test suite..."
          pnpm test
        continue-on-error: false
      
      - name: Type Check
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          echo "🔍 Running type check..."
          pnpm type-check
        continue-on-error: false
      
      - name: Lint Check
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          echo "🔧 Running lint check..."
          pnpm lint
        continue-on-error: false
      
      - name: Build Validation
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          echo "🏗️ Running build validation..."
          pnpm build
        continue-on-error: false
      
      - name: Upload Coverage Reports
        if: steps.changed-files.outputs.any_changed == 'true'
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false

  pr-quality-check:
    name: PR Quality Check
    runs-on: ubuntu-latest
    needs: tdd-compliance
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Check PR Description
        uses: actions/github-script@v7
        with:
          script: |
            const { data: pr } = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            
            const description = pr.body || '';
            const hasDescription = description.length > 50;
            const hasTestSection = description.toLowerCase().includes('test') || 
                                 description.toLowerCase().includes('testing');
            
            if (!hasDescription) {
              core.setFailed('PR description is required (minimum 50 characters)');
            }
            
            if (!hasTestSection) {
              core.warning('PR should include information about testing approach');
            }
      
      - name: Check for Test Files
        uses: actions/github-script@v7
        with:
          script: |
            const { data: files } = await github.rest.pulls.listFiles({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });
            
            const sourceFiles = files.filter(f => 
              f.filename.match(/\.(js|jsx|ts|tsx)$/) && 
              !f.filename.includes('.test.') && 
              !f.filename.includes('.spec.') &&
              !f.filename.includes('node_modules') &&
              !f.filename.includes('dist')
            );
            
            const testFiles = files.filter(f => 
              f.filename.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)
            );
            
            if (sourceFiles.length > 0 && testFiles.length === 0) {
              core.setFailed(`Found ${sourceFiles.length} source files but no test files. Please add tests for your changes.`);
            }
            
            console.log(`✅ Found ${testFiles.length} test files for ${sourceFiles.length} source files`);

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: tdd-compliance
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run security audit
        run: |
          echo "🔒 Running security audit..."
          pnpm audit --audit-level moderate
        continue-on-error: false
      
      - name: CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

## Repository Settings Configuration

### CODEOWNERS File

**File: `.github/CODEOWNERS`**

```yaml
# Global owners
* @tech-lead @senior-developer

# Domain layer requires senior approval
modules/*/domain/ @tech-lead @architecture-team

# Infrastructure layer requires devops approval
packages/infrastructure/ @devops-team @tech-lead

# Tests and quality
tests/ @qa-team @tech-lead
*.test.* @qa-team
*.spec.* @qa-team

# Configuration files
*.config.* @tech-lead
.github/ @tech-lead @devops-team
husky/ @tech-lead

# Documentation
docs/ @tech-lead @documentation-team

# Frontend specific
apps/web/ @frontend-team @ui-ux-team
apps/admin/ @frontend-team @ui-ux-team

# Backend specific
apps/api/ @backend-team @devops-team

# Shared packages
packages/ @tech-lead @architecture-team
```

### Issue Templates

**File: `.github/ISSUE_TEMPLATE/tdd_violation.md`**

```markdown
---
name: TDD Violation Report
about: Report a TDD process violation
title: '[TDD VIOLATION] '
labels: 'tdd, quality'
assignees: '@tech-lead'
---

## TDD Violation Details

### Type of Violation
- [ ] Missing test files
- [ ] Test written after implementation
- [ ] Insufficient test coverage
- [ ] Poor test quality
- [ ] Other (please describe)

### Description
Provide a detailed description of the TDD violation:

### Files Involved
List the specific files that violate TDD principles:

### Expected Behavior
Describe what should have been done according to TDD principles:

### Impact Assessment
How does this violation affect code quality and maintainability:

### Suggested Resolution
How should this be fixed:

### Additional Context
Any additional information or context:
```

## Branch Protection Rules API Configuration

For automated setup using GitHub API or GitHub CLI:

```bash
#!/bin/bash

# Script to configure branch protection rules
REPO_OWNER="your-org"
REPO_NAME="pems"
BRANCH="main"

# Set up branch protection
gh api repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection \
  --method PUT \
  --field required_status_checks='{
    "strict": true,
    "contexts": [
      "TDD Enforcement",
      "Coverage Validation",
      "Test Suite",
      "Build Validation",
      "Lint Check",
      "Type Check"
    ]
  }' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  }' \
  --field restrictions=null

echo "Branch protection configured for $BRANCH"
```

## Quality Gates and Metrics

### Automated Quality Metrics

1. **Test Coverage Thresholds**
   - Global: 80% minimum
   - Domain Layer: 90% minimum
   - New Code: 85% minimum

2. **Test Quality Metrics**
   - Minimum 1 test per function
   - No empty test cases
   - Proper assertions required

3. **Code Quality Metrics**
   - Zero ESLint warnings
   - All TypeScript checks pass
   - Build succeeds without errors

### Manual Review Checklist

**For Pull Request Reviewers:**

```markdown
## TDD Review Checklist

### Test Coverage
- [ ] All new functions have corresponding tests
- [ ] Test coverage meets minimum thresholds
- [ ] Edge cases are tested
- [ ] Error conditions are tested

### Test Quality
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Test names are descriptive
- [ ] Tests are independent and isolated
- [ ] Mocks are used appropriately

### Code Quality
- [ ] Code follows established patterns
- [ ] Documentation is updated
- [ ] No TODO comments left in production code
- [ ] Security considerations addressed

### Process Compliance
- [ ] Tests were written before implementation
- [ ] Red-Green-Refactor cycle was followed
- [ ] Continuous testing was performed during development
```

## Monitoring and Alerting

### Slack Integration

**File: `.github/workflows/slack-notifications.yml`**

```yaml
name: Slack Notifications

on:
  pull_request:
    branches: [main, develop]
    types: [opened, closed]

jobs:
  notify:
    runs-on: ubuntu-latest
    if: github.event.action == 'opened' || github.event.pull_request.merged == true
    
    steps:
      - name: Notify Slack on PR Opened
        if: github.event.action == 'opened'
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              "text": "🔄 New PR Opened: ${{ github.event.pull_request.title }}",
              "attachments": [
                {
                  "color": "#36a64f",
                  "fields": [
                    {
                      "title": "Author",
                      "value": "${{ github.event.pull_request.user.login }}",
                      "short": true
                    },
                    {
                      "title": "Branch",
                      "value": "${{ github.event.pull_request.head.ref }}",
                      "short": true
                    },
                    {
                      "title": "Files Changed",
                      "value": "${{ github.event.pull_request.changed_files }}",
                      "short": true
                    },
                    {
                      "title": "URL",
                      "value": "${{ github.event.pull_request.html_url }}",
                      "short": false
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - name: Notify Slack on PR Merged
        if: github.event.pull_request.merged == true
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: "✅ PR Merged: ${{ github.event.pull_request.title }} by ${{ github.event.pull_request.user.login }}"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Enforcement Timeline

### Phase 1: Soft Enforcement (Week 1-2)
- Enable all checks but allow bypass
- Provide education and training
- Collect feedback and adjust thresholds

### Phase 2: Warning Enforcement (Week 3-4)
- Enable warnings for violations
- Require comments for bypasses
- Monitor compliance metrics

### Phase 3: Hard Enforcement (Week 5+)
- Enable strict enforcement
- No bypasses allowed
- Full compliance required

## Success Metrics

### Key Performance Indicators

1. **TDD Compliance Rate**
   - Target: 95% of PRs pass TDD validation
   - Measurement: Automated tracking in GitHub

2. **Test Coverage Trends**
   - Target: Maintain or improve coverage
   - Measurement: Weekly coverage reports

3. **Defect Reduction**
   - Target: 30% reduction in production bugs
   - Measurement: Bug tracking metrics

4. **Development Velocity**
   - Target: No significant slowdown in development
   - Measurement: Cycle time metrics

This comprehensive branch protection and TDD enforcement system ensures that your team maintains high code quality standards while following test-first development principles.