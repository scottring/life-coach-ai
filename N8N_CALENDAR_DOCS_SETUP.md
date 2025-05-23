# n8n Calendar Sync & Document Preparation Setup

## Overview

This setup uses n8n for two key background automations:

1. **Calendar Synchronization** - Syncs Google Calendar events to Life Coach AI tasks
2. **Smart Document Preparation** - Proactively prepares relevant documents 2-4 hours before events

## Benefits of Using n8n

- **Runs in background** - No need to keep app open
- **API access** - Can fetch real flight data, weather, etc.
- **Scheduled execution** - Runs every hour automatically
- **Multiple integrations** - Google Calendar, Gmail, weather APIs, flight APIs
- **Push notifications** - Can send emails when documents are ready

## Workflows Created

### 1. Simple Calendar Sync (`calendar-sync-simple.json`)
- Fetches events from Google Calendar every hour
- Converts calendar events to tasks
- Syncs to Life Coach AI database
- Prevents duplicates by tracking calendar event IDs

### 2. Smart Document Preparation (`smart-document-prep.json`)
- Checks upcoming tasks every hour
- Detects task types (flight, meeting, medical, etc.)
- Prepares relevant documents 2-4 hours before task
- For flights:
  - Fetches real-time flight status
  - Gets destination weather
  - Creates packing checklist
- Sends email notification when documents are ready

## API Endpoints Created

1. **`/api/n8n/upcoming-tasks`** - Returns tasks in next 24 hours
2. **`/api/n8n/calendar-sync`** - Receives calendar events from n8n
3. **`/api/n8n/prepared-documents`** - Stores prepared documents

## Database Tables Needed

```sql
-- Table for storing prepared documents
CREATE TABLE prepared_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  documents JSONB,
  prepared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add calendar sync fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_event_id TEXT UNIQUE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
```

## How to Set Up in n8n

1. **Import Workflows**
   - Import `calendar-sync-simple.json`
   - Import `smart-document-prep.json`

2. **Configure Credentials**
   - Google Calendar OAuth
   - Gmail OAuth (for notifications)
   - API keys for flight/weather services (optional)

3. **Update Webhook URLs**
   - Already hardcoded to your Vercel deployment

4. **Activate Workflows**
   - Enable both workflows to run hourly

## Mobile App Integration

The mobile Daily Itinerary view now:
- Shows tasks synced from calendar
- Displays prepared documents from n8n
- Updates automatically as n8n prepares new documents

## Example Flow

1. **10:00 AM** - You have a flight at 2:00 PM in your Google Calendar
2. **11:00 AM** - n8n calendar sync creates a task in Life Coach AI
3. **11:00 AM** - Document prep workflow detects the flight task
4. **11:05 AM** - n8n fetches flight status, weather, creates checklists
5. **11:10 AM** - Documents saved to database, email notification sent
6. **11:15 AM** - You open Daily Itinerary, see prepared documents ready

## Future Enhancements

- Hotel booking confirmations
- Restaurant reservations
- Meeting agenda from previous notes
- Travel itinerary compilation
- Expense tracking integration