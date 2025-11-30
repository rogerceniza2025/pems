#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  JIRA_URL: process.env.JIRA_URL,
  JIRA_EMAIL: process.env.JIRA_EMAIL,
  JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
  JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY,
  SPRINT_PLAN_PATH: path.join(__dirname, '..', 'docs', 'sprint-plan.md')
};

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  sprint: null,
  help: args.includes('--help')
};

// Parse sprint number if provided
const sprintIndex = args.indexOf('--sprint');
if (sprintIndex !== -1 && args[sprintIndex + 1]) {
  options.sprint = parseInt(args[sprintIndex + 1]);
}

// Display help
if (options.help) {
  console.log(`${COLORS.cyan}Jira Backlog Population Script${COLORS.reset}`);
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/populate-jira-backlog.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run    Parse and display stories without creating Jira issues');
  console.log('  --sprint N   Process only specific sprint (e.g., --sprint 1)');
  console.log('  --help       Display this help message');
  console.log('');
  process.exit(0);
}

// Validate environment variables
function validateConfig() {
  const required = ['JIRA_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY'];
  const missing = required.filter(key => !CONFIG[key]);
  
  if (missing.length > 0) {
    console.error(`${COLORS.red}Error: Missing required environment variables:${COLORS.reset}`);
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }
}

// Create Jira API client
function createJiraClient() {
  const auth = Buffer.from(`${CONFIG.JIRA_EMAIL}:${CONFIG.JIRA_API_TOKEN}`).toString('base64');
  
  return axios.create({
    baseURL: `${CONFIG.JIRA_URL}/rest/api/3`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
}

// Parse sprint plan markdown
function parseSprintPlan(content) {
  const lines = content.split('\n');
  const sprints = [];
  let currentSprint = null;
  let currentStory = null;
  let currentSection = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect sprint header
    const sprintMatch = line.trim().match(/^## Sprint (\d+): (.+)$/);
    if (sprintMatch) {
      // Add previous story to sprint before switching to new sprint
      if (currentStory && currentSprint) {
        currentSprint.stories.push(currentStory);
      }
      if (currentSprint) {
        sprints.push(currentSprint);
      }
      currentSprint = {
        number: parseInt(sprintMatch[1]),
        title: sprintMatch[2],
        stories: []
      };
      currentStory = null;
      continue;
    }
    
    // Detect story header
    const storyMatch = line.trim().match(/^#### Story (\d+): (.+)$/);
    if (storyMatch && currentSprint) {
      // Add previous story to sprint if it exists
      if (currentStory) {
        currentSprint.stories.push(currentStory);
      }
      // Create new story
      currentStory = {
        number: parseInt(storyMatch[1]),
        title: storyMatch[2],
        userStory: '',
        acceptanceCriteria: [],
        technicalTasks: []
      };
      currentSection = null;
      continue;
    }
    
    // Detect sections
    if (line.trim() === '**Acceptance Criteria:**') {
      currentSection = 'acceptanceCriteria';
      continue;
    }
    if (line.trim() === '**Technical Tasks:**') {
      currentSection = 'technicalTasks';
      continue;
    }
    
    // Parse user story line
    if (currentStory && line.startsWith('**As a**')) {
      // User story spans multiple lines, so we need to collect them
      let userStoryLines = [line.replace(/\*\*/g, '')];
      let nextLineIndex = i + 1;
      
      // Collect the next two lines of the user story
      while (nextLineIndex < lines.length && userStoryLines.length < 3) {
        const nextLine = lines[nextLineIndex].trim();
        if (nextLine.startsWith('**I want**') || nextLine.startsWith('**So that**')) {
          userStoryLines.push(nextLine.replace(/\*\*/g, ''));
          i = nextLineIndex; // Update i to skip these lines in the main loop
        }
        nextLineIndex++;
      }
      
      currentStory.userStory = userStoryLines.join(' ');
      continue;
    }
    
    // Parse list items
    if (currentStory && currentSection && line.startsWith('- ')) {
      const item = line.substring(2);
      currentStory[currentSection].push(item);
    }
  }
  
  // Add the last sprint and story
  if (currentStory && currentSprint) {
    currentSprint.stories.push(currentStory);
  }
  if (currentSprint) {
    sprints.push(currentSprint);
  }
  
  return sprints;
}

// Format description for Jira
function formatDescription(story, sprintNumber) {
  let description = `h2. User Story\n\n${story.userStory}\n\n`;
  
  if (story.acceptanceCriteria.length > 0) {
    description += `h3. Acceptance Criteria\n\n`;
    story.acceptanceCriteria.forEach(criteria => {
      description += `* ${criteria}\n`;
    });
    description += '\n';
  }
  
  if (story.technicalTasks.length > 0) {
    description += `h3. Technical Tasks\n\n`;
    story.technicalTasks.forEach(task => {
      description += `* ${task}\n`;
    });
  }
  
  return description;
}

// Create Jira issue
async function createJiraIssue(jiraClient, story, sprintNumber) {
  const issueData = {
    fields: {
      project: {
        key: CONFIG.JIRA_PROJECT_KEY
      },
      summary: story.title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: formatDescription(story, sprintNumber)
              }
            ]
          }
        ]
      },
      issuetype: {
        name: 'Task'
      },
      labels: [`sprint-${sprintNumber}`]
    }
  };
  
  try {
    const response = await jiraClient.post('/issue', issueData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Jira API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
  console.log(`${COLORS.blue}🚀 Jira Backlog Population Script${COLORS.reset}\n`);
  
  if (options.dryRun) {
    console.log(`${COLORS.yellow}🔍 DRY RUN MODE - No issues will be created${COLORS.reset}\n`);
  } else {
    validateConfig();
  }
  
  try {
    // Read sprint plan
    const content = fs.readFileSync(CONFIG.SPRINT_PLAN_PATH, 'utf8');
    const sprints = parseSprintPlan(content);
    
    // Filter by sprint if specified
    const filteredSprints = options.sprint !== null 
      ? sprints.filter(s => s.number === options.sprint)
      : sprints;
    
    if (filteredSprints.length === 0) {
      console.log(`${COLORS.yellow}No sprints found matching the criteria.${COLORS.reset}`);
      return;
    }
    
    // Count total stories
    const totalStories = filteredSprints.reduce((sum, sprint) => sum + sprint.stories.length, 0);
    console.log(`${COLORS.cyan}Found ${filteredSprints.length} sprint(s) with ${totalStories} stories total${COLORS.reset}\n`);
    
    // Create Jira client if not in dry run mode
    let jiraClient = null;
    if (!options.dryRun) {
      jiraClient = createJiraClient();
      console.log(`${COLORS.blue}Connected to Jira at ${CONFIG.JIRA_URL}${COLORS.reset}\n`);
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each sprint
    for (const sprint of filteredSprints) {
      console.log(`${COLORS.cyan}Sprint ${sprint.number}: ${sprint.title}${COLORS.reset}`);
      
      for (const story of sprint.stories) {
        try {
          if (options.dryRun) {
            console.log(`  ${COLORS.yellow}→${COLORS.reset} ${story.title} (sprint-${sprint.number})`);
            successCount++;
          } else {
            console.log(`  ${COLORS.blue}Creating:${COLORS.reset} ${story.title}...`);
            
            const result = await createJiraIssue(jiraClient, story, sprint.number);
            console.log(`  ${COLORS.green}✅ Created issue ${result.key}: ${story.title} (sprint-${sprint.number})${COLORS.reset}`);
            
            successCount++;
            
            // Rate limiting
            await sleep(500);
          }
        } catch (error) {
          console.error(`  ${COLORS.red}❌ Failed to create issue "${story.title}": ${error.message}${COLORS.reset}`);
          failCount++;
        }
      }
      console.log('');
    }
    
    // Summary
    console.log(`${COLORS.cyan}📊 Summary:${COLORS.reset}`);
    console.log(`  Total stories processed: ${totalStories}`);
    if (options.dryRun) {
      console.log(`  Would be created: ${successCount}`);
    } else {
      console.log(`  Successfully created: ${COLORS.green}${successCount}${COLORS.reset}`);
      console.log(`  Failed: ${COLORS.red}${failCount}${COLORS.reset}`);
    }
    
  } catch (error) {
    console.error(`${COLORS.red}Error: ${error.message}${COLORS.reset}`);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(`${COLORS.red}Unexpected error: ${error.message}${COLORS.reset}`);
  process.exit(1);
});