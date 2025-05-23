-- Calendar events table to store synced Google Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
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
  
  -- Status and visibility
  status TEXT DEFAULT 'confirmed',
  visibility TEXT DEFAULT 'default',
  
  -- User-added metadata for learning
  event_type TEXT, -- meeting, flight, appointment, social, etc.
  project_id UUID REFERENCES projects(id),
  client_name TEXT,
  preparation_time INTEGER, -- minutes needed to prepare
  travel_time INTEGER, -- minutes to travel to location
  
  -- Learned patterns
  patterns JSONB DEFAULT '{}', -- Store learned patterns about this event type
  importance_score INTEGER DEFAULT 3 CHECK (importance_score BETWEEN 1 AND 5),
  
  -- Task generation preferences
  auto_create_task BOOLEAN DEFAULT true,
  task_lead_time INTEGER DEFAULT 0, -- days before event to create task
  task_template JSONB, -- Template for auto-generated tasks
  
  -- Metadata
  raw_data JSONB, -- Store complete Google Calendar data
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(google_event_id, calendar_id)
);

-- Index for performance
CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time);
CREATE INDEX idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);

-- Event metadata learning table
CREATE TABLE IF NOT EXISTS event_learning_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern matching
  event_pattern TEXT NOT NULL, -- e.g., "flight to", "meeting with", "1:1", etc.
  learned_type TEXT NOT NULL, -- what we learned this pattern means
  confidence_score FLOAT DEFAULT 0.5,
  
  -- Learned attributes
  typical_duration INTEGER, -- in minutes
  typical_preparation_time INTEGER,
  typical_importance INTEGER,
  requires_travel BOOLEAN DEFAULT false,
  
  -- Context clues
  keywords TEXT[], -- words that indicate this pattern
  attendee_patterns TEXT[], -- email domains, specific people
  location_patterns TEXT[], -- types of locations
  
  -- Usage stats
  times_seen INTEGER DEFAULT 1,
  times_confirmed INTEGER DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User event preferences
CREATE TABLE IF NOT EXISTS user_event_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Default preferences for different event types
  event_type TEXT NOT NULL,
  default_preparation_time INTEGER DEFAULT 15,
  default_travel_time INTEGER DEFAULT 30,
  default_importance INTEGER DEFAULT 3,
  auto_create_task BOOLEAN DEFAULT true,
  
  -- Notification preferences
  notify_before INTEGER[] DEFAULT ARRAY[15, 60], -- minutes before event
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, event_type)
);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_preferences ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
CREATE POLICY "Users can view their own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Learning data policies
CREATE POLICY "Users can manage their own learning data"
  ON event_learning_data FOR ALL
  USING (auth.uid() = user_id);

-- Preferences policies
CREATE POLICY "Users can manage their own preferences"
  ON user_event_preferences FOR ALL
  USING (auth.uid() = user_id);