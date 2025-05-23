# Simple Calendar Sync Setup

## What You Get
- Both work and personal Google Calendars synced to your app
- Clickable events to add basic metadata (type, importance, prep time)
- Clean calendar view with work/personal distinction
- Mobile-friendly daily itinerary

## Setup Steps

### 1. Database Setup (5 minutes)
Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Simple calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT 'default-user-id',
  
  -- Google Calendar fields
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_type TEXT NOT NULL CHECK (calendar_type IN ('work', 'personal')),
  
  -- Event basic info
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Time fields
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  timezone TEXT,
  
  -- Attendees and organizer
  organizer_email TEXT,
  attendees JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'confirmed',
  
  -- Simple user metadata
  event_type TEXT,
  importance_score INTEGER DEFAULT 3 CHECK (importance_score BETWEEN 1 AND 5),
  preparation_time INTEGER DEFAULT 15,
  
  -- Metadata
  raw_data JSONB,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(google_event_id, calendar_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);

-- Simple RLS policy
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all calendar events" ON calendar_events;
CREATE POLICY "Allow all calendar events"
  ON calendar_events FOR ALL
  USING (true);
```

### 2. n8n Setup (10 minutes)

#### Import Workflow
1. Go to your n8n instance
2. Click "Import from File"
3. Upload `n8n-workflows/simple-calendar-sync.json`

#### Configure Credentials
You need OAuth for both Google accounts:

**Personal Calendar:**
- Name: `Google Calendar - Personal`
- Account: smkaufman@gmail.com
- Scopes: `https://www.googleapis.com/auth/calendar.readonly`

**Work Calendar:**
- Name: `Google Calendar - Work` 
- Account: scott@mobileaccord.com
- Scopes: `https://www.googleapis.com/auth/calendar.readonly`

#### Activate
1. Enable the "Simple Calendar Sync" workflow
2. It runs every hour automatically

### 3. Deploy (2 minutes)
```bash
npm run build
# Deploy to Vercel
```

## That's It!

After setup:
- ✅ Events sync from both calendars every hour
- ✅ Click any event to add type/importance/notes
- ✅ Mobile daily itinerary works
- ✅ Clean calendar view with work/personal colors

## What's NOT included (for now):
- ❌ Machine learning/pattern recognition
- ❌ Automatic document preparation
- ❌ Complex task generation
- ❌ Advanced notifications

These features can be added later once the basic sync is working reliably.