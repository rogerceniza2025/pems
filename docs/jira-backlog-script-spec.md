# Jira Backlog Population Script Specification

## Overview
This document specifies the implementation of a Node.js script that will populate Jira's backlog with all user stories from the sprint plan document.

## Script Location
- File: `scripts/populate-jira-backlog.js`
- Dependencies: Node.js modules (axios, dotenv)

## Configuration
The script will read Jira credentials from the `.env` file:
- `JIRA_URL`: Jira instance URL (e.g., https://rogerceniza2024.atlassian.net)
- `JIRA_EMAIL`: Jira account email
- `JIRA_API_TOKEN`: Jira API token
- `JIRA_PROJECT_KEY`: Jira project key (PO)

## Script Features

### 1. Command Line Options
- `--dry-run`: Parse and display stories without creating Jira issues
- `--sprint <number>`: Process only specific sprint (optional)
- `--help`: Display usage information

### 2. Parsing Logic
The script will parse `docs/sprint-plan.md` with the following structure:
- Sprint sections: `## Sprint X: [Title]`
- Story sections: `#### Story X: [Title]`
- User story format: "As a [role], I want [feature], So that [benefit]"
- Acceptance Criteria section
- Technical Tasks section

### 3. Jira Issue Creation
For each story, the script will:
- Create a Jira issue with type "Task"
- Set issue title as the story title
- Include the full user story in the description
- Add sprint label (e.g., "sprint-0", "sprint-1")
- Format description with markdown:
  ```markdown
  h2. User Story
  
  As a [role], I want [feature], So that [benefit]
  
  h3. Acceptance Criteria
  
  - [Criteria 1]
  - [Criteria 2]
  - ...
  
  h3. Technical Tasks
  
  - [Task 1]
  - [Task 2]
  - ...
  ```

### 4. Error Handling
- Validate environment variables before execution
- Handle Jira API errors gracefully
- Log successful and failed issue creations
- Continue processing remaining stories if one fails

### 5. Logging
- Console output with color coding:
  - Green: Successfully created issues
  - Yellow: Dry-run mode messages
  - Red: Errors
  - Blue: Progress information

## Implementation Details

### Dependencies
```json
{
  "axios": "^1.6.0",
  "dotenv": "^16.3.0"
}
```

### Jira API Endpoints
- Base URL: `{JIRA_URL}/rest/api/3`
- Create Issue: `/issue`
- Authentication: Basic auth with email + API token

### Story Extraction Algorithm
1. Read sprint-plan.md file
2. Split content by sprint sections using regex: `/## Sprint \d+:/`
3. For each sprint:
   - Extract sprint number
   - Find all story sections using regex: `/#### Story \d+:/`
   - For each story:
     - Extract title
     - Extract user story line
     - Extract Acceptance Criteria section
     - Extract Technical Tasks section
4. Create structured story object

### Rate Limiting
- Add 500ms delay between Jira API calls to avoid rate limiting
- Implement retry logic for failed requests (max 3 retries)

## Usage Examples

### Dry Run (Recommended first)
```bash
node scripts/populate-jira-backlog.js --dry-run
```

### Process All Stories
```bash
node scripts/populate-jira-backlog.js
```

### Process Specific Sprint
```bash
node scripts/populate-jira-backlog.js --sprint 1
```

## Expected Output

### Dry Run Mode
```
🔍 DRY RUN MODE - No issues will be created

Found 8 sprints with 24 stories total

Sprint 0: Foundation & Infrastructure Setup
  → Story 1: Development Environment Setup
  → Story 2: CI/CD Pipeline Foundation

Sprint 1: Core Tenant Management & Authentication
  → Story 1: Multi-Tenant Architecture
  → Story 2: User Authentication System
  → Story 3: Permission-Based Navigation
...
```

### Execution Mode
```
🚀 Starting Jira backlog population...

Found 8 sprints with 24 stories total

✅ Created issue PO-123: Development Environment Setup (sprint-0)
✅ Created issue PO-124: CI/CD Pipeline Foundation (sprint-0)
✅ Created issue PO-125: Multi-Tenant Architecture (sprint-1)
✅ Created issue PO-126: User Authentication System (sprint-1)
✅ Created issue PO-127: Permission-Based Navigation (sprint-1)
...

📊 Summary:
  Total stories processed: 24
  Successfully created: 24
  Failed: 0
```

## Security Considerations
- API token should be kept secure and not committed to version control
- Script should validate SSL certificates for Jira API calls
- Input validation for file paths and command line arguments

## Testing
- Test with dry-run mode first
- Verify story parsing accuracy
- Test error scenarios (invalid credentials, network issues)
- Validate Jira issue creation with sample data