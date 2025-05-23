# n8n Workflows for Life Coach AI

## Overview

This folder contains 5 n8n workflows for extracting tasks from your email and calendar accounts:

### Email Workflows
1. **gmail-work-task-extractor.json** - Monitors work email every 10 minutes during business hours
2. **gmail-personal-task-extractor.json** - Monitors personal email every 30 minutes

### Calendar Workflows  
3. **calendar-work-task-extractor.json** - Checks work calendar every 30 minutes during business hours
4. **calendar-personal-task-extractor.json** - Checks personal calendar every hour
5. **calendar-work-personal-combined.json** - Alternative: Single workflow for both calendars

## Key Features

### Smart Scheduling
- **Work Email**: Every 10 min, 8am-6pm Mon-Fri only
- **Personal Email**: Every 30 minutes, all day
- **Work Calendar**: Every 30 min during business hours
- **Personal Calendar**: Every hour

### Account-Specific Task Extraction

#### Work Accounts
- Focus on deadlines, client commitments, meeting prep
- Higher priority for client-facing tasks
- Default context: "Work"

#### Personal Accounts  
- Focus on family, health, home maintenance
- Higher priority for health appointments (like Jax's vet)
- Default context: "Personal" or "Family"

### Intelligent Categorization

The workflows automatically:
- Detect event types (client meetings, doctor appointments, etc.)
- Set appropriate priorities
- Add relevant metadata
- Handle cross-account deduplication

## Setup Instructions

### 1. Import Workflows
1. Open your n8n instance
2. Click "Add workflow" > "Import from file"
3. Import each JSON file

### 2. Configure Credentials

You'll need 5 credentials total:

#### Gmail Credentials
- **Gmail OAuth2 API - Work**: Connect with scott.kaufman@stacksdata.com
- **Gmail OAuth2 API - Personal**: Connect with smkaufman@gmail.com

#### Calendar Credentials
- **Google Calendar OAuth2 API - Work**: Connect with work account
- **Google Calendar OAuth2 API - Personal**: Connect with personal account

#### OpenAI
- **OpenAI API**: Add your OpenAI API key

### 3. Update Email Addresses

In each workflow's "Process Tasks" node, update the email addresses:
- Work: `scott.kaufman@stacksdata.com` → your work email
- Personal: `smkaufman@gmail.com` → your personal email

### 4. Configure Environment Variables

In n8n, set these environment variables:
- `WEBHOOK_URL`: Your Life Coach AI URL (e.g., https://your-app.com)
- `WEBHOOK_SECRET`: A secret key for webhook security

### 5. Activate Workflows

Toggle each workflow to "Active" status.

## Webhook Endpoints

Each workflow sends to these endpoints:
- Gmail: `POST /api/n8n/gmail-tasks`
- Calendar: `POST /api/n8n/calendar-tasks`

Headers include:
- `X-Account-Type`: "work" or "personal"
- `X-Account-Email`: The specific email address
- `X-Webhook-Secret`: For authentication

## Testing

1. **Manual Trigger**: Click "Execute Workflow" to test
2. **Check Executions**: Monitor the execution history
3. **Verify Tasks**: Check your Life Coach AI for new tasks

## Customization

### Adjust Schedules
Edit the trigger node in each workflow to change timing.

### Modify Extraction Rules
Edit the OpenAI prompts to change what tasks are extracted.

### Add More Accounts
Duplicate workflows and create new credentials for additional accounts.

## Troubleshooting

### No tasks appearing
- Check n8n execution logs
- Verify credentials are connected
- Ensure webhook URL is correct

### Wrong context assigned
- Review the OpenAI prompt in the workflow
- Check account metadata is being passed

### Duplicate tasks
- Verify deduplication is enabled in Life Coach AI
- Check that email IDs are being passed correctly