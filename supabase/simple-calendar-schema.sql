-- Simple calendar events table (no ML/learning features)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT 'default-user-id', -- Simplified for now
  
  -- Google Calendar fields
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL, -- To distinguish between calendars
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
  
  -- Simple user metadata (no learning)
  event_type TEXT, -- meeting, flight, appointment, etc.
  importance_score INTEGER DEFAULT 3 CHECK (importance_score BETWEEN 1 AND 5),
  preparation_time INTEGER DEFAULT 15, -- minutes
  
  -- Metadata
  raw_data JSONB, -- Store complete Google Calendar data
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(google_event_id, calendar_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);

-- Simple RLS policy (allow all for now)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all calendar events" ON calendar_events;
CREATE POLICY "Allow all calendar events"
  ON calendar_events FOR ALL
  USING (true);

-- Prepared documents table (simplified)
CREATE TABLE IF NOT EXISTS prepared_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  documents JSONB,
  prepared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow all for prepared documents too
ALTER TABLE prepared_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all prepared documents" ON prepared_documents;
CREATE POLICY "Allow all prepared documents"
  ON prepared_documents FOR ALL
  USING (true);