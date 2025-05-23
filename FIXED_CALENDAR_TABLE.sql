-- Simple calendar events table (fixed UUID issue)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT DEFAULT 'default-user-id', -- Changed to TEXT for now
  
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