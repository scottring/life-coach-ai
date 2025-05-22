-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  context VARCHAR(50),
  priority INTEGER,
  priority_reason TEXT,
  scheduling_note TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  source VARCHAR(20), -- 'email', 'calendar', 'notion', 'manual'
  source_id VARCHAR(255), -- ID in the original system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  timeframe VARCHAR(20), -- 'life', 'year', 'quarter', 'month', 'week'
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task-Goal relationships
CREATE TABLE task_goals (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, goal_id)
);

-- User contexts
CREATE TABLE user_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  current_focus VARCHAR(50),
  energy_level VARCHAR(20),
  available_time INTEGER,
  location VARCHAR(50),
  active_from TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable vector embeddings for learning
CREATE EXTENSION IF NOT EXISTS vector;

-- User behavior patterns
CREATE TABLE user_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(50),
  embedding vector(1536), -- For OpenAI embeddings
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings and preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email_sync_enabled BOOLEAN DEFAULT TRUE,
  calendar_sync_enabled BOOLEAN DEFAULT TRUE,
  notion_sync_enabled BOOLEAN DEFAULT FALSE,
  last_email_sync TIMESTAMPTZ,
  last_calendar_sync TIMESTAMPTZ,
  last_notion_sync TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{"morning_briefing": true, "task_reminders": true}',
  ui_preferences JSONB DEFAULT '{"theme": "light", "compact_view": false}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration credentials (encrypted)
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  service VARCHAR(50) NOT NULL,
  account_label VARCHAR(100), -- 'Work', 'Personal', 'john@work.com', etc.
  account_email VARCHAR(255), -- The actual Google account email
  credentials JSONB NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE, -- Mark one account as primary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service, account_email) -- Prevent duplicate accounts
);

-- Stored insights and recommendations
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50), -- 'productivity', 'pattern', 'suggestion'
  content TEXT,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies

-- Tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks" 
  ON tasks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" 
  ON tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
  ON tasks FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
  ON tasks FOR DELETE 
  USING (auth.uid() = user_id);

-- Goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" 
  ON goals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" 
  ON goals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" 
  ON goals FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
  ON goals FOR DELETE 
  USING (auth.uid() = user_id);

-- Task-Goal relationships
ALTER TABLE task_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task_goals" 
  ON task_goals FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_goals.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own task_goals" 
  ON task_goals FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_goals.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task_goals" 
  ON task_goals FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_goals.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- User contexts
ALTER TABLE user_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contexts" 
  ON user_contexts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contexts" 
  ON user_contexts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contexts" 
  ON user_contexts FOR UPDATE 
  USING (auth.uid() = user_id);

-- User patterns
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patterns" 
  ON user_patterns FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns" 
  ON user_patterns FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- User preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

-- Integration credentials
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credentials" 
  ON integration_credentials FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" 
  ON integration_credentials FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" 
  ON integration_credentials FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" 
  ON integration_credentials FOR DELETE 
  USING (auth.uid() = user_id);

-- Insights
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights" 
  ON insights FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" 
  ON insights FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
  ON insights FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create vector similarity function for pattern matching
CREATE OR REPLACE FUNCTION match_user_patterns(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  action_type VARCHAR,
  embedding vector(1536),
  result TEXT,
  created_at TIMESTAMPTZ,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_patterns.id,
    user_patterns.action_type,
    user_patterns.embedding,
    user_patterns.result,
    user_patterns.created_at,
    1 - (user_patterns.embedding <=> query_embedding) AS similarity
  FROM user_patterns
  WHERE 1 - (user_patterns.embedding <=> query_embedding) > match_threshold
  AND user_patterns.user_id = auth.uid()
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;