-- Production Database Setup for Life Coach AI
-- Run this in your Supabase SQL Editor to set up all required tables

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  email_notifications BOOLEAN DEFAULT true,
  email_sync_enabled BOOLEAN DEFAULT false,
  calendar_sync_enabled BOOLEAN DEFAULT false,
  last_email_sync TIMESTAMPTZ,
  last_calendar_sync TIMESTAMPTZ,
  last_notion_sync TIMESTAMPTZ,
  n8n_url TEXT,
  n8n_webhooks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- TASK MANAGEMENT
-- ============================================

-- Tasks table with deduplication support
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  context TEXT DEFAULT 'Work',
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,
  source_id TEXT,
  email_id TEXT,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT unique_user_task_source UNIQUE(user_id, title, source_id)
);

-- Goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'personal',
  deadline TIMESTAMPTZ,
  progress INTEGER DEFAULT 0,
  parent_goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task-Goal relationships
CREATE TABLE IF NOT EXISTS public.task_goals (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, goal_id)
);

-- ============================================
-- FAMILY FEATURES
-- ============================================

-- Families table
CREATE TABLE IF NOT EXISTS public.families (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members
CREATE TABLE IF NOT EXISTS public.family_members (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Family goals
CREATE TABLE IF NOT EXISTS public.family_goals (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  target_date TIMESTAMPTZ,
  progress INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  timeframe VARCHAR(20) DEFAULT 'month',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit VARCHAR(50),
  progress_percentage INTEGER DEFAULT 0,
  deadline TIMESTAMPTZ
);

-- Family meals
CREATE TABLE IF NOT EXISTS public.family_meals (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  recipe TEXT,
  ingredients TEXT[],
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER DEFAULT 4,
  leftovers_plan TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, date, meal_type)
);

-- Family tasks/chores
CREATE TABLE IF NOT EXISTS public.family_tasks (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.users(id),
  due_date DATE,
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  priority TEXT DEFAULT 'medium',
  completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family milestones
CREATE TABLE IF NOT EXISTS public.family_milestones (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  category TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping items
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity TEXT,
  category TEXT DEFAULT 'other',
  purchased BOOLEAN DEFAULT false,
  purchased_by UUID REFERENCES public.users(id),
  purchased_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTEGRATION TABLES
-- ============================================

-- Integration credentials
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  credentials JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for integration credentials
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_credentials_unique 
ON integration_credentials(user_id, service, (credentials->>'account_email'));

-- User contexts for AI
CREATE TABLE IF NOT EXISTS public.user_contexts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily notes
CREATE TABLE IF NOT EXISTS public.daily_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT,
  mood INTEGER,
  highlights TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source, source_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_goals_family_id ON family_goals(family_id);
CREATE INDEX IF NOT EXISTS idx_family_meals_date ON family_meals(family_id, date);
CREATE INDEX IF NOT EXISTS idx_family_tasks_assigned ON family_tasks(assigned_to);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only see their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own task_goals" ON task_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_goals.task_id AND tasks.user_id = auth.uid())
);

-- Family policies (members can access family data)
CREATE POLICY "Family members can view family" ON families FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = families.id AND family_members.user_id = auth.uid())
);

CREATE POLICY "Family members can view family goals" ON family_goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = family_goals.family_id AND family_members.user_id = auth.uid())
);

CREATE POLICY "Family members can manage family goals" ON family_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = family_goals.family_id AND family_members.user_id = auth.uid())
);

CREATE POLICY "Family members can manage meals" ON family_meals FOR ALL USING (
  EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = family_meals.family_id AND family_members.user_id = auth.uid())
);

CREATE POLICY "Family members can manage tasks" ON family_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = family_tasks.family_id AND family_members.user_id = auth.uid())
);

CREATE POLICY "Family members can manage shopping" ON shopping_items FOR ALL USING (
  EXISTS (SELECT 1 FROM family_members WHERE family_members.family_id = shopping_items.family_id AND family_members.user_id = auth.uid())
);

-- Integration and personal data policies
CREATE POLICY "Users can manage own integrations" ON integration_credentials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contexts" ON user_contexts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notes" ON daily_notes FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_goals_updated_at BEFORE UPDATE ON family_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_meals_updated_at BEFORE UPDATE ON family_meals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_tasks_updated_at BEFORE UPDATE ON family_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================

-- List all tables to verify setup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;