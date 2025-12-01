# Jira Backlog Population Script - Usage Guide

## Quick Start

1. **Install dependencies** (if not already done):

```bash
npm install axios dotenv
```

2. **Verify your .env file** has the required Jira credentials:

```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
```

3. **Test with dry-run** (recommended first):

```bash
# Test all stories
node scripts/populate-jira-backlog.js --dry-run

# Test specific sprint
node scripts/populate-jira-backlog.js --sprint 0 --dry-run
```

4. **Run for real**:

```bash
# Create all stories
node scripts/populate-jira-backlog.js

# Create specific sprint only
node scripts/populate-jira-backlog.js --sprint 1
```

## What the Script Does

- Parses `docs/sprint-plan.md` to extract user stories
- Creates Jira issues with type "Task"
- Adds sprint labels (sprint-0, sprint-1, etc.) to each issue
- Includes user story, acceptance criteria, and technical tasks in issue description
- Supports rate limiting (500ms between API calls)
- Provides detailed logging with success/failure tracking

## Expected Output

The script will find 26 stories across 9 sprints:

- **Sprint 0**: 2 stories (Foundation & Infrastructure Setup)
- **Sprint 1**: 3 stories (Core Tenant Management & Authentication)
- **Sprint 2**: 3 stories (Cashiering Module)
- **Sprint 3**: 3 stories (Student Management Module)
- **Sprint 4**: 3 stories (Enrollment Management Module)
- **Sprint 5**: 3 stories (Attendance Management Module)
- **Sprint 6**: 3 stories (Grading Management Module)
- **Sprint 7**: 3 stories (Reporting & Analytics)
- **Sprint 8**: 3 stories (Integration Testing & Deployment Prep)

## Troubleshooting

### Issues Creating Jira Issues

1. Check your API token is valid and has proper permissions
2. Verify the project key is correct
3. Ensure you have permission to create issues in the project

### Script Not Finding Stories

1. Check that `docs/sprint-plan.md` exists and is readable
2. Verify the file format matches the expected structure
3. Run with `--dry-run` to see parsing results

### Rate Limiting

The script includes 500ms delays between API calls to avoid rate limiting. If you hit rate limits:

- Wait a few minutes and try again
- Consider running with `--sprint N` to process smaller batches

## Security Notes

- Your API token is sensitive - keep it secure
- The script reads from `.env` file - never commit this with real credentials
- Consider using environment-specific .env files for different environments
