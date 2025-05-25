-- Travel brain dumps table for storing iterative AI brain dump sessions
CREATE TABLE IF NOT EXISTS travel_brain_dumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_destination TEXT NOT NULL,
  brain_dump_text TEXT NOT NULL,
  generated_task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_travel_brain_dumps_user_destination 
ON travel_brain_dumps(user_id, trip_destination);

CREATE INDEX IF NOT EXISTS idx_travel_brain_dumps_created_at 
ON travel_brain_dumps(created_at);

-- Enable RLS
ALTER TABLE travel_brain_dumps ENABLE ROW LEVEL SECURITY;

-- RLS Policy - users can only access their own brain dumps
DROP POLICY IF EXISTS "Users can manage their own travel brain dumps" ON travel_brain_dumps;
CREATE POLICY "Users can manage their own travel brain dumps"
  ON travel_brain_dumps FOR ALL
  USING (auth.uid() = user_id);