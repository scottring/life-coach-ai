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

-- Family Tables

-- Family groups
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'parent', 'child', 'member'
  avatar_color VARCHAR(20) DEFAULT '#3B82F6',
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Family meals
CREATE TABLE family_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL, -- 'breakfast', 'lunch', 'dinner'
  dish VARCHAR(200) NOT NULL,
  notes TEXT,
  assigned_to UUID REFERENCES family_members(id),
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, date, meal_type)
);

-- Shopping list items
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  item VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  quantity VARCHAR(50),
  is_checked BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family tasks (extends regular tasks for family context)
CREATE TABLE family_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type VARCHAR(20) DEFAULT 'task', -- 'task', 'chore'
  priority INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending',
  deadline TIMESTAMPTZ,
  assigned_to UUID REFERENCES family_members(id),
  created_by UUID REFERENCES family_members(id),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB, -- {type: 'weekly', days: ['monday'], interval: 1}
  points INTEGER DEFAULT 0, -- For gamification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family goals
CREATE TABLE family_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit VARCHAR(50), -- 'dollars', 'days', 'points', etc.
  timeframe VARCHAR(20) DEFAULT 'month',
  status VARCHAR(20) DEFAULT 'active',
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family milestones
CREATE TABLE family_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  category VARCHAR(50), -- 'birthday', 'anniversary', 'graduation', 'vacation', etc.
  is_completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family activity log
CREATE TABLE family_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES family_members(id),
  activity_type VARCHAR(50) NOT NULL, -- 'task_completed', 'chore_done', 'goal_progress', etc.
  description TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for Family Tables

-- Families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view families they belong to" ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family admins can update families" ON families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('admin', 'parent')
    )
  );

-- Family Members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family members" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family admins can manage members" ON family_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.role IN ('admin', 'parent')
    )
  );

-- Family Meals
ALTER TABLE family_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view meals" ON family_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage meals" ON family_meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Shopping Items
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view shopping items" ON shopping_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage shopping items" ON shopping_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Family Tasks
ALTER TABLE family_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view family tasks" ON family_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family tasks" ON family_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Family Goals
ALTER TABLE family_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view family goals" ON family_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family goals" ON family_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Family Milestones
ALTER TABLE family_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view family milestones" ON family_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family milestones" ON family_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Family Activities
ALTER TABLE family_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view activities" ON family_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_activities.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can create activities" ON family_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_activities.family_id 
      AND family_members.user_id = auth.uid()
    )
  );