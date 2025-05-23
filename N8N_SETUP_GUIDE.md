# n8n Setup Guide for Life Coach AI

## Overview

This guide will help you set up n8n workflows to automatically extract tasks from your Gmail and Google Calendar. Using n8n is more reliable than direct API calls and provides better error handling and monitoring.

## Prerequisites

1. n8n instance running (cloud or self-hosted)
2. Google Cloud project `n8n-personal-assistant-460615` with Gmail and Calendar APIs enabled
3. OpenAI API key for task extraction

## Step 1: Import Workflows

1. Open your n8n instance
2. Import the workflow files:
   - `n8n-workflows/gmail-task-extractor.json`
   - `n8n-workflows/calendar-task-extractor.json`

## Step 2: Configure Credentials in n8n

### Google OAuth2 (for Gmail & Calendar)

1. In n8n, go to **Credentials** > **New**
2. Select **Gmail OAuth2 API**
3. Use these settings:
   - Client ID: Your Google OAuth Client ID
   - Client Secret: Your Google OAuth Client Secret
   - Scopes: 
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
4. Click **Connect** and authorize
5. Repeat for **Google Calendar OAuth2 API** with scope:
   - `https://www.googleapis.com/auth/calendar.readonly`

### OpenAI API

1. In n8n, go to **Credentials** > **New**
2. Select **OpenAI API**
3. Enter your OpenAI API key
4. Save

## Step 3: Configure Webhooks

### In n8n:

1. Open each workflow
2. Find the **Webhook** node at the end
3. Copy the webhook URL (will look like: `https://your-n8n.com/webhook/abc123`)
4. Make note of both URLs

### In Life Coach AI:

1. Go to **Settings** > **Integrations**
2. In the **n8n Automation** section, click **Configure**
3. Enter your n8n instance URL (e.g., `https://your-n8n.com`)
4. The app will display the webhook URLs to use

## Step 4: Update Workflow Webhook Destinations

1. In each n8n workflow, edit the final **HTTP Request** node
2. Update the URL to point to your Life Coach AI instance:
   - Gmail: `https://your-app.com/api/n8n/gmail-tasks`
   - Calendar: `https://your-app.com/api/n8n/calendar-tasks`
3. Add headers:
   ```json
   {
     "Content-Type": "application/json",
     "X-User-Id": "{{your-user-id}}"
   }
   ```

## Step 5: Activate Workflows

1. Toggle each workflow to **Active**
2. Gmail workflow will check for new emails every 5 minutes
3. Calendar workflow will run every hour

## Step 6: Test the Integration

1. In Life Coach AI, go to **Settings** > **Integrations**
2. Click **Sync via n8n** for Gmail or Calendar
3. Check the n8n execution history for any errors
4. Verify tasks appear in your Life Coach AI dashboard

## Workflow Features

### Gmail Task Extractor
- Monitors inbox for new emails
- Extracts tasks from email content using GPT-4
- Identifies commitments, deadlines, and action items
- Deduplicates tasks automatically
- Categorizes by context (Work/Personal/Family)

### Calendar Task Extractor
- Scans upcoming calendar events (next 14 days)
- Creates preparation tasks for meetings
- Sets appropriate due dates before events
- Links tasks to calendar events
- Prioritizes based on event importance

## Troubleshooting

### "403 Forbidden" errors
- Ensure Gmail/Calendar APIs are enabled in Google Cloud Console
- Re-authenticate in n8n credentials

### No tasks appearing
- Check n8n execution logs for errors
- Verify webhook URLs are correct
- Ensure your user ID is being passed correctly

### Tasks are duplicated
- The deduplication service should prevent this
- Check that `emailId` and `relatedEventId` are being passed

## Advanced Configuration

### Customize Task Extraction

Edit the OpenAI prompt in the workflow to:
- Add custom contexts (e.g., "Family", "Learning")
- Change priority rules
- Extract additional metadata

### Add More Email Accounts

1. Duplicate the Gmail workflow
2. Connect different Gmail account credentials
3. Update webhook to identify the account

### Schedule Different Sync Times

Modify the trigger nodes to run:
- More frequently for important accounts
- Less frequently to save API calls
- At specific times of day

## Benefits of Using n8n

1. **Reliability**: n8n handles retries and error recovery
2. **Monitoring**: Visual execution history and error logs
3. **Flexibility**: Easy to modify workflows without code
4. **Scalability**: Can handle multiple accounts and high volume
5. **Security**: Credentials stored securely in n8n
6. **Cost-effective**: Reduces direct API calls from your app

## Next Steps

1. Monitor workflow executions for a few days
2. Adjust extraction prompts based on results
3. Add more automation workflows (e.g., Slack, Notion)
4. Set up error notifications
5. Create workflow for task completion syncing