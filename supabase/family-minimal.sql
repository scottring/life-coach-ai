-- Minimal Family Tables Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Families table
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
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Family meals
CREATE TABLE family_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL,
  dish_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping items
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family tasks
CREATE TABLE family_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  completed BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family goals
CREATE TABLE family_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  progress INTEGER DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family milestones
CREATE TABLE family_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  category VARCHAR(50),
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and basic policies
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_milestones ENABLE ROW LEVEL SECURITY;

-- Basic policies for families
CREATE POLICY "Users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family members can view families" ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Basic policies for family_members
CREATE POLICY "Users can join families" ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Family members can view members" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
    )
  );

-- Basic policies for other tables (allow family members to access)
CREATE POLICY "Family members can access meals" ON family_meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can access shopping" ON shopping_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can access tasks" ON family_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can access goals" ON family_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can access milestones" ON family_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );