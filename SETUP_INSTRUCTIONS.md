# Setup Instructions for Calendar Sync & Learning System

## 1. Database Setup (Required)

Go to your Supabase dashboard and run this SQL:

```sql
-- Calendar events table to store synced Google Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
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
  
  -- Status and visibility
  status TEXT DEFAULT 'confirmed',
  visibility TEXT DEFAULT 'default',
  
  -- User-added metadata for learning
  event_type TEXT,
  project_id UUID,
  client_name TEXT,
  preparation_time INTEGER DEFAULT 15,
  travel_time INTEGER DEFAULT 0,
  
  -- Learned patterns
  patterns JSONB DEFAULT '{}',
  importance_score INTEGER DEFAULT 3 CHECK (importance_score BETWEEN 1 AND 5),
  
  -- Task generation preferences
  auto_create_task BOOLEAN DEFAULT true,
  task_lead_time INTEGER DEFAULT 0,
  task_template JSONB,
  
  -- Metadata
  raw_data JSONB,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(google_event_id, calendar_id)
);

-- Event metadata learning table
CREATE TABLE IF NOT EXISTS event_learning_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern matching
  event_pattern TEXT NOT NULL,
  learned_type TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  
  -- Learned attributes
  typical_duration INTEGER,
  typical_preparation_time INTEGER,
  typical_importance INTEGER,
  requires_travel BOOLEAN DEFAULT false,
  
  -- Context clues
  keywords TEXT[],
  attendee_patterns TEXT[],
  location_patterns TEXT[],
  
  -- Usage stats
  times_seen INTEGER DEFAULT 1,
  times_confirmed INTEGER DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prepared documents table (if not exists)
CREATE TABLE IF NOT EXISTS prepared_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  documents JSONB,
  prepared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_learning_data ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
DROP POLICY IF EXISTS "Users can view their own calendar events" ON calendar_events;
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar events" ON calendar_events;
CREATE POLICY "Users can update their own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar events" ON calendar_events;
CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Learning data policies
DROP POLICY IF EXISTS "Users can manage their own learning data" ON event_learning_data;
CREATE POLICY "Users can manage their own learning data"
  ON event_learning_data FOR ALL
  USING (auth.uid() = user_id);
```

## 2. n8n Configuration (Required)

### Import Workflows
1. Go to your n8n instance
2. Import `/n8n-workflows/dual-calendar-sync.json`

### Configure Credentials
You need to set up OAuth for both Google accounts:

1. **Personal Calendar Credential**
   - Name: `Google Calendar - Personal (smkaufman@gmail.com)`
   - Account: smkaufman@gmail.com
   - Scopes: https://www.googleapis.com/auth/calendar.readonly

2. **Work Calendar Credential**  
   - Name: `Google Calendar - Work (scott@mobileaccord.com)`
   - Account: scott@mobileaccord.com
   - Scopes: https://www.googleapis.com/auth/calendar.readonly

### Activate Workflow
1. Enable the "Dual Calendar Sync" workflow
2. It will run every 30 minutes automatically

## 3. Environment Variables (Optional)

Add these to your `.env` if you want enhanced features:

```bash
# n8n webhook secret (already set)
VITE_N8N_WEBHOOK_SECRET=my-secret-key-2024

# Weather API (for travel documents)
VITE_WEATHER_API_KEY=your_weather_api_key

# Flight API (for flight status)
VITE_AVIATION_API_KEY=your_aviation_api_key
```

## 4. Deploy Updated Code

Deploy your updated app to Vercel:

```bash
npm run build
# or if using Vercel CLI: vercel --prod
```

## 5. Test the System

1. **Calendar Sync**: 
   - Add an event to your Google Calendar
   - Wait up to 30 minutes or manually run the n8n workflow
   - Check the calendar view in your app

2. **Event Learning**:
   - Click on any synced event
   - Add metadata (type, importance, etc.)
   - The system will learn from your input

3. **Pattern Recognition**:
   - After a few corrections, the system will get better at auto-categorizing

## What Works Without Configuration

- Mobile daily itinerary view
- Manual task management
- Basic calendar display
- Event detail modal

## What Needs Configuration

- Google Calendar sync (requires n8n setup)
- Automatic document preparation
- Pattern learning (requires events to learn from)

Let me know when you've completed the database setup and I can help with the n8n configuration!