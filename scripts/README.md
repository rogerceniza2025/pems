# Jira Backlog Population Script

This script will populate your Jira backlog with all user stories from the sprint plan document.

## Prerequisites

1. Node.js installed (v18 or higher)
2. Jira API token generated from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
3. Environment variables configured in `.env` file

## Setup

1. Install dependencies:

```bash
npm install axios dotenv
```

2. Verify your `.env` file contains the required Jira credentials:

```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
```

## Usage

### Dry Run (Recommended First)

Run in dry-run mode to preview what will be created without actually creating issues:

```bash
node scripts/populate-jira-backlog.js --dry-run
```

### Populate All Stories

Create all stories from all sprints:

```bash
node scripts/populate-jira-backlog.js
```

### Populate Specific Sprint

Create stories from a specific sprint only:

```bash
node scripts/populate-jira-backlog.js --sprint 1
```

### View Help

Display all available options:

```bash
node scripts/populate-jira-backlog.js --help
```

## Output

The script will:

- Create Jira issues of type "Task" for each user story
- Add sprint labels (e.g., "sprint-0", "sprint-1") to each issue
- Include the user story, acceptance criteria, and technical tasks in the issue description
- Provide a summary of created issues

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify your Jira API token is valid
   - Check that your email is correct
   - Ensure the token has proper permissions for the project

2. **Project Not Found**
   - Verify the `JIRA_PROJECT_KEY` is correct
   - Check that you have access to the project

3. **Rate Limiting**
   - The script includes delays between API calls
   - If you hit rate limits, wait a few minutes and try again

### Getting Help

If you encounter issues:

1. Check the console output for error messages
2. Verify your `.env` configuration
3. Ensure you have proper permissions in Jira
4. Try running with `--dry-run` first to verify parsing works
