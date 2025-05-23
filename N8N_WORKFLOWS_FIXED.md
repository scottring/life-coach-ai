# n8n Workflows - Fixed Versions

## Issue Fixed
The environment variables in n8n were not being resolved in the HTTP Request node URL fields, causing ERR_INVALID_URL errors.

## Solution
Created fixed versions of all workflows with hardcoded values:
- URL: `https://life-coach-ai-drab.vercel.app/api/n8n/{endpoint}`
- Webhook Secret: `my-secret-key-2024`

## Fixed Workflow Files

### 1. Gmail Work Task Extractor
- Original: `gmail-work-task-extractor.json`
- Fixed: `gmail-work-task-extractor-fixed.json`
- Endpoint: `/api/n8n/gmail-tasks`
- Account: scott@mobileaccord.com

### 2. Gmail Personal Task Extractor
- Original: `gmail-personal-task-extractor.json`
- Fixed: `gmail-personal-task-extractor-fixed.json`
- Endpoint: `/api/n8n/gmail-tasks`
- Account: smkaufman@gmail.com

### 3. Calendar Work Task Extractor
- Original: `calendar-work-task-extractor.json`
- Fixed: `calendar-work-task-extractor-fixed.json`
- Endpoint: `/api/n8n/calendar-tasks`
- Account: scott@mobileaccord.com

### 4. Calendar Personal Task Extractor
- Original: `calendar-personal-task-extractor.json`
- Fixed: `calendar-personal-task-extractor-fixed.json`
- Endpoint: `/api/n8n/calendar-tasks`
- Account: smkaufman@gmail.com

## How to Import in n8n

1. In n8n, go to Workflows
2. Click the "..." menu and select "Import from File"
3. Upload each `-fixed.json` file
4. Verify the credentials are connected properly
5. Activate the workflows

## Testing

After importing, you can test each workflow:
1. Open the workflow
2. Click "Execute Workflow" button
3. Check the execution results
4. Verify tasks appear in your Life Coach AI app at https://life-coach-ai-drab.vercel.app

## Notes

- The workflows run hourly by default
- Gmail workflows check the last 24 hours of emails
- Calendar workflows check the next 14 days of events
- All tasks are deduplicated based on source IDs