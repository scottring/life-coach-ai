-- Family Tables Schema
-- Run this in your Supabase SQL Editor to create the family tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);

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
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'parent', 'child', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
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
  dish_name VARCHAR(200) NOT NULL,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, date, meal_type)
);

-- Shopping list items
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  quantity VARCHAR(50),
  purchased BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family tasks
CREATE TABLE family_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family goals
CREATE TABLE family_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  target_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies

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
    user_id = auth.uid() OR
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

CREATE POLICY "Family members can view tasks" ON family_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage tasks" ON family_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Family Goals
ALTER TABLE family_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view goals" ON family_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage goals" ON family_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Family Milestones
ALTER TABLE family_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view milestones" ON family_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage milestones" ON family_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );