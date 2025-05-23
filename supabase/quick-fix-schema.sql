-- Quick fix for missing columns that are causing errors
-- Run this in Supabase SQL Editor to fix immediate issues

-- Add missing columns to family_goals table
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Add missing columns to family_meals table  
ALTER TABLE family_meals ADD COLUMN IF NOT EXISTS dish VARCHAR(200);

-- Add missing columns to family_tasks table for hierarchy
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'task';
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS parent_type VARCHAR(20);
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Create family_reviews table if it doesn't exist
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

-- Enable RLS on family_reviews
ALTER TABLE family_reviews ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for family_reviews
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

-- Add any missing columns to family_members table
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#3B82F6';
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;