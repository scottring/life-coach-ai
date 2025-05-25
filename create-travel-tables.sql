-- Create trip_events table
CREATE TABLE IF NOT EXISTS trip_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID,
  user_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  venue_name TEXT,
  venue_address TEXT,
  dress_code TEXT,
  attendees JSONB DEFAULT '[]',
  event_details JSONB DEFAULT '{}',
  preparation_requirements JSONB DEFAULT '{}',
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_events_user ON trip_events(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_events_date ON trip_events(event_date);

-- Enable RLS
ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage their trip events" ON trip_events;
CREATE POLICY "Users can manage their trip events"
  ON trip_events FOR ALL
  USING (auth.uid()::text = user_id);

-- Create event_documents table
CREATE TABLE IF NOT EXISTS event_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES trip_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT,
  external_link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_documents_event ON event_documents(event_id);
CREATE INDEX IF NOT EXISTS idx_event_documents_user ON event_documents(user_id);

-- Enable RLS
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage their event documents" ON event_documents;
CREATE POLICY "Users can manage their event documents"
  ON event_documents FOR ALL
  USING (auth.uid()::text = user_id);

-- Create event_prep_tasks table
CREATE TABLE IF NOT EXISTS event_prep_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES trip_events(id) ON DELETE CASCADE,
  task_category TEXT NOT NULL,
  task_description TEXT NOT NULL,
  assigned_to TEXT,
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_prep_tasks_event ON event_prep_tasks(event_id);

-- Enable RLS
ALTER TABLE event_prep_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can manage their event prep tasks" ON event_prep_tasks;
CREATE POLICY "Users can manage their event prep tasks"
  ON event_prep_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trip_events 
      WHERE trip_events.id = event_prep_tasks.event_id 
      AND trip_events.user_id = auth.uid()::text
    )
  );

-- Create travel_brain_dumps table for iterative AI brain dump sessions
CREATE TABLE IF NOT EXISTS travel_brain_dumps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  trip_destination TEXT NOT NULL,
  brain_dump_text TEXT NOT NULL,
  generated_task_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for brain dumps
CREATE INDEX IF NOT EXISTS idx_travel_brain_dumps_user_destination 
ON travel_brain_dumps(user_id, trip_destination);

CREATE INDEX IF NOT EXISTS idx_travel_brain_dumps_created_at 
ON travel_brain_dumps(created_at);

-- Enable RLS for brain dumps
ALTER TABLE travel_brain_dumps ENABLE ROW LEVEL SECURITY;

-- Create policies for brain dumps
DROP POLICY IF EXISTS "Users can manage their own travel brain dumps" ON travel_brain_dumps;
CREATE POLICY "Users can manage their own travel brain dumps"
  ON travel_brain_dumps FOR ALL
  USING (auth.uid()::text = user_id);