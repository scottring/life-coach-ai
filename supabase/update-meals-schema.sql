-- Update family_meals table to include people planning data
-- Run this in your Supabase SQL Editor

ALTER TABLE family_meals 
ADD COLUMN IF NOT EXISTS people_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS planned_for_members JSONB DEFAULT '[]'::jsonb;

-- Add helpful comment
COMMENT ON COLUMN family_meals.people_count IS 'Number of people this meal is planned for';
COMMENT ON COLUMN family_meals.planned_for_members IS 'Array of family member user_ids who will eat this meal';