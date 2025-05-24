-- Enhanced Travel Planning Schema

-- Travel documents storage
CREATE TABLE IF NOT EXISTS travel_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'boarding_pass', 'hotel_confirmation', 'visa', 'insurance', etc.
  document_name TEXT NOT NULL,
  file_url TEXT,
  external_link TEXT,
  traveler_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enhanced trips table with more details
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_city TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type TEXT, -- 'leisure', 'business', 'family_vacation', etc.
  travelers JSONB NOT NULL DEFAULT '[]', -- Array of family member IDs and details
  transportation_mode TEXT, -- 'flight', 'car', 'train', etc.
  accommodation_type TEXT, -- 'hotel', 'airbnb', 'family', etc.
  activities JSONB DEFAULT '[]',
  weather_data JSONB DEFAULT '{}',
  preparation_status JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Smart packing lists
CREATE TABLE IF NOT EXISTS packing_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  list_name TEXT NOT NULL,
  is_master BOOLEAN DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]', -- Array of packing items with quantities and assignees
  shared_with JSONB DEFAULT '[]', -- Family members who can view/edit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Travel preparation tasks
CREATE TABLE IF NOT EXISTS travel_prep_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_category TEXT NOT NULL, -- 'documents', 'health', 'booking', 'packing', etc.
  due_days_before INT DEFAULT 7, -- How many days before trip
  is_completed BOOLEAN DEFAULT false,
  completed_by TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Travel preferences and history for learning
CREATE TABLE IF NOT EXISTS travel_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  family_member_id TEXT,
  preference_type TEXT NOT NULL, -- 'packing_items', 'activities', 'food', etc.
  preferences JSONB NOT NULL DEFAULT '{}',
  learned_from_trips JSONB DEFAULT '[]', -- Trip IDs this was learned from
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, family_member_id, preference_type)
);

-- Events within trips (weddings, conferences, tours, etc.)
CREATE TABLE IF NOT EXISTS trip_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'wedding', 'conference', 'tour', 'dinner', 'show', etc.
  event_date DATE NOT NULL,
  event_time TIME,
  venue_name TEXT,
  venue_address TEXT,
  dress_code TEXT,
  attendees JSONB DEFAULT '[]', -- Which family members are attending
  event_details JSONB DEFAULT '{}', -- Additional details specific to event type
  preparation_requirements JSONB DEFAULT '{}', -- AI-generated prep requirements
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Event-specific documents
CREATE TABLE IF NOT EXISTS event_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES trip_events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'invitation', 'itinerary', 'dress_code', 'menu', etc.
  document_name TEXT NOT NULL,
  file_url TEXT,
  external_link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Event preparation tasks (specific to event types)
CREATE TABLE IF NOT EXISTS event_prep_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES trip_events(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_category TEXT NOT NULL, -- 'attire', 'gifts', 'transportation', 'grooming', etc.
  task_description TEXT NOT NULL,
  assigned_to TEXT, -- Family member ID
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_travel_documents_trip ON travel_documents(trip_id);
CREATE INDEX idx_travel_documents_user ON travel_documents(user_id);
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_packing_lists_trip ON packing_lists(trip_id);
CREATE INDEX idx_travel_prep_trip ON travel_prep_tasks(trip_id);
CREATE INDEX idx_travel_preferences_user ON travel_preferences(user_id);
CREATE INDEX idx_trip_events_trip ON trip_events(trip_id);
CREATE INDEX idx_trip_events_date ON trip_events(event_date);
CREATE INDEX idx_event_documents_event ON event_documents(event_id);
CREATE INDEX idx_event_prep_tasks_event ON event_prep_tasks(event_id);

-- Enable RLS
ALTER TABLE travel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_prep_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their travel documents"
  ON travel_documents FOR ALL
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their trips"
  ON trips FOR ALL
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their packing lists"
  ON packing_lists FOR ALL
  USING (auth.uid()::text = user_id OR shared_with @> jsonb_build_array(auth.uid()::text));

CREATE POLICY "Users can manage their travel prep tasks"
  ON travel_prep_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = travel_prep_tasks.trip_id 
      AND trips.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their travel preferences"
  ON travel_preferences FOR ALL
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their trip events"
  ON trip_events FOR ALL
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their event documents"
  ON event_documents FOR ALL
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their event prep tasks"
  ON event_prep_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trip_events 
      WHERE trip_events.id = event_prep_tasks.event_id 
      AND trip_events.user_id = auth.uid()::text
    )
  );