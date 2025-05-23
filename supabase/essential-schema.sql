-- Essential schema for Life Coach AI application
-- This creates only the tables needed for the family management features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Family groups table
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  avatar_color VARCHAR(20) DEFAULT '#3B82F6',
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Family goals table
CREATE TABLE IF NOT EXISTS family_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit VARCHAR(50),
  timeframe VARCHAR(20) DEFAULT 'month',
  status VARCHAR(20) DEFAULT 'active',
  progress_percentage INTEGER DEFAULT 0,
  deadline TIMESTAMPTZ,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family tasks table
CREATE TABLE IF NOT EXISTS family_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type VARCHAR(20) DEFAULT 'task',
  priority INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending',
  deadline TIMESTAMPTZ,
  assigned_to UUID REFERENCES family_members(id),
  created_by UUID REFERENCES family_members(id),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB,
  points INTEGER DEFAULT 0,
  item_type VARCHAR(20) DEFAULT 'task',
  parent_type VARCHAR(20),
  parent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family meals table
CREATE TABLE IF NOT EXISTS family_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  dish VARCHAR(200) NOT NULL,
  notes TEXT,
  assigned_to UUID REFERENCES family_members(id),
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, date, meal_type)
);

-- Family reviews table
CREATE TABLE IF NOT EXISTS family_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  accomplishments TEXT[],
  challenges TEXT[],
  goal_progress JSONB,
  next_week_focus TEXT[],
  family_feedback JSONB,
  commitments JSONB,
  ai_insights JSONB,
  financial_data JSONB,
  meal_feedback JSONB,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, week_ending)
);

-- Shopping items table
CREATE TABLE IF NOT EXISTS shopping_items (
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

-- Family milestones table
CREATE TABLE IF NOT EXISTS family_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  category VARCHAR(50),
  is_completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_milestones ENABLE ROW LEVEL SECURITY;

-- Security Policies for Families
CREATE POLICY IF NOT EXISTS "Users can view families they belong to" ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "Family admins can update families" ON families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('admin', 'parent')
    )
  );

-- Security Policies for Family Members
CREATE POLICY IF NOT EXISTS "Users can view family members" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family admins can manage members" ON family_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.role IN ('admin', 'parent')
    )
  );

-- Security Policies for Family Goals
CREATE POLICY IF NOT EXISTS "Family members can view family goals" ON family_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family members can manage family goals" ON family_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Tasks
CREATE POLICY IF NOT EXISTS "Family members can view family tasks" ON family_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family members can manage family tasks" ON family_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Meals
CREATE POLICY IF NOT EXISTS "Family members can view meals" ON family_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family members can manage meals" ON family_meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Reviews
CREATE POLICY IF NOT EXISTS "Family members can view family reviews" ON family_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_reviews.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family members can manage family reviews" ON family_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_reviews.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Shopping Items
CREATE POLICY IF NOT EXISTS "Family members can view shopping items" ON shopping_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family members can manage shopping items" ON shopping_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Milestones
CREATE POLICY IF NOT EXISTS "Family members can view family milestones" ON family_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Family members can manage family milestones" ON family_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );