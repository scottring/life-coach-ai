# n8n Multi-Account Setup Guide

## Overview

This guide covers setting up n8n to handle multiple Google accounts (Work + Personal) for both Gmail and Calendar task extraction.

## Architecture for Multiple Accounts

### Option 1: Separate Workflows (Recommended)
Create dedicated workflows for each account:
- `gmail-work-task-extractor`
- `gmail-personal-task-extractor`
- `calendar-work-task-extractor`
- `calendar-personal-task-extractor`

**Benefits:**
- Independent scheduling (e.g., check work email more frequently)
- Account-specific extraction rules
- Better error isolation
- Easier monitoring

### Option 2: Single Workflow with Multiple Credentials
Use one workflow that processes multiple accounts sequentially.

**Benefits:**
- Simpler to maintain
- Single point of configuration

## Step-by-Step Multi-Account Setup

### 1. Create Multiple Google OAuth Credentials in n8n

For each account (work/personal):

1. In n8n, go to **Credentials** > **New**
2. Create separate credentials:
   - **Gmail OAuth2 API - Work** (using work@company.com)
   - **Gmail OAuth2 API - Personal** (using personal@gmail.com)
   - **Google Calendar OAuth2 API - Work**
   - **Google Calendar OAuth2 API - Personal**
3. Authorize each credential with the respective Google account

### 2. Duplicate and Customize Workflows

#### For Gmail:

1. Import `gmail-task-extractor.json`
2. Duplicate it (right-click > Duplicate)
3. Rename to `Gmail Work Task Extractor`
4. Edit the Gmail nodes to use **Gmail OAuth2 API - Work** credential
5. Modify the Code node to add account context:

```javascript
// In the Process Tasks node, add account info
return tasks.map(task => ({
  json: {
    ...task,
    source: 'email',
    accountType: 'work', // Add this
    accountEmail: 'work@company.com', // Add this
    emailId: emailId,
    emailSubject: subject,
    extractedAt: new Date().toISOString()
  }
}));
```

6. Repeat for Personal account

#### For Calendar:

Similar process - duplicate and customize with account-specific credentials and metadata.

### 3. Customize Extraction Rules Per Account

#### Work Email/Calendar Extraction:
```javascript
// In OpenAI node for work account
const systemPrompt = `You extract work-related tasks from emails. Focus on:
- Project deadlines and deliverables
- Meeting preparation tasks
- Client commitments
- Team action items
- Professional development tasks

Default context should be "Work" unless explicitly personal.
Priority should be higher for client-facing tasks.`;
```

#### Personal Email/Calendar Extraction:
```javascript
// In OpenAI node for personal account
const systemPrompt = `You extract personal tasks from emails. Focus on:
- Family commitments and events
- Personal appointments and preparations
- Home maintenance and chores
- Social commitments
- Health and wellness tasks

Default context should be "Personal" or "Family".
Consider family-related tasks as higher priority.`;
```

### 4. Configure Different Schedules

#### Work Accounts:
- **Gmail Work**: Every 10 minutes during business hours (8am-6pm weekdays)
- **Calendar Work**: Every 30 minutes during business hours

```javascript
// Schedule node configuration for work
{
  "mode": "cronExpression",
  "cronExpression": "*/10 8-18 * * 1-5" // Every 10 min, 8am-6pm, Mon-Fri
}
```

#### Personal Accounts:
- **Gmail Personal**: Every 30 minutes
- **Calendar Personal**: Every hour

### 5. Update Webhook Configuration

Each workflow should send to a unique webhook endpoint:

```javascript
// Work Gmail webhook
POST https://your-app.com/api/n8n/gmail-tasks
{
  "tasks": [...],
  "accountType": "work",
  "accountEmail": "work@company.com"
}

// Personal Gmail webhook
POST https://your-app.com/api/n8n/gmail-tasks
{
  "tasks": [...],
  "accountType": "personal",
  "accountEmail": "personal@gmail.com"
}
```

### 6. Update Life Coach AI Webhook Handler

Modify `n8nWebhookHandler.js` to handle account types:

```javascript
export async function handleN8nWebhook(type, data, accountInfo) {
  try {
    console.log(`Received ${type} webhook from ${accountInfo.accountType} account`);
    
    // Process each task with account context
    for (const item of data) {
      try {
        const taskData = {
          title: item.title,
          description: item.description || '',
          deadline: item.dueDate || null,
          context: item.context || (accountInfo.accountType === 'work' ? 'Work' : 'Personal'),
          priority: item.priority || 3,
          status: 'pending',
          // Store account info in metadata
          metadata: {
            source_account: accountInfo.accountEmail,
            account_type: accountInfo.accountType
          }
        };
        
        // Continue with deduplication...
      } catch (error) {
        console.error('Error processing task:', error);
      }
    }
  } catch (error) {
    console.error('Error handling n8n webhook:', error);
    throw error;
  }
}
```

## Advanced Multi-Account Features

### 1. Cross-Account Deduplication

Prevent duplicate tasks when the same email appears in both accounts:

```javascript
// In deduplication service
const isDuplicate = await checkDuplicateAcrossAccounts(
  taskTitle,
  taskDueDate,
  allUserAccounts
);
```

### 2. Account-Specific Task Templates

```javascript
// Work tasks get additional metadata
if (accountType === 'work') {
  task.tags = ['work', 'professional'];
  task.defaultReminder = '1 day before';
}

// Personal tasks
if (accountType === 'personal') {
  task.tags = ['personal', 'life'];
  task.allowFamilyView = true;
}
```

### 3. Unified Dashboard View

In your Life Coach AI app, add filters:
- "All Tasks"
- "Work Tasks Only" (from work accounts)
- "Personal Tasks Only" (from personal accounts)
- "By Account" dropdown

### 4. Account-Specific Error Handling

```javascript
// In n8n workflow
if (error.message.includes('401')) {
  // Send notification about specific account needing reauth
  await sendNotification({
    type: 'auth_error',
    account: 'work@company.com',
    service: 'gmail'
  });
}
```

## Testing Multi-Account Setup

1. **Test each workflow independently**:
   - Trigger each workflow manually
   - Verify correct credentials are used
   - Check task context and metadata

2. **Test cross-account scenarios**:
   - Send an email from work to personal
   - Verify only one task is created
   - Check deduplication is working

3. **Monitor account-specific metrics**:
   - Tasks per account
   - Error rates by account
   - Sync frequency success

## Best Practices

1. **Naming Conventions**:
   - Prefix workflow names with account type
   - Use consistent webhook paths
   - Tag tasks with source account

2. **Security**:
   - Use separate webhook secrets per account
   - Store account mappings securely
   - Implement account-level access controls

3. **Maintenance**:
   - Schedule regular credential refresh
   - Monitor API quotas per account
   - Set up account-specific alerts

4. **Performance**:
   - Stagger sync schedules to avoid conflicts
   - Implement account-level rate limiting
   - Use parallel processing where possible

## Troubleshooting Multi-Account Issues

### "Mixed up tasks between accounts"
- Check credential assignments in each workflow
- Verify account metadata is being passed correctly
- Review deduplication logic

### "Work tasks showing as personal"
- Check context extraction rules
- Verify account type is being passed in webhook
- Review OpenAI prompts for proper context detection

### "Duplicate tasks across accounts"
- Implement cross-account deduplication
- Check email Message-ID tracking
- Review calendar event ID handling