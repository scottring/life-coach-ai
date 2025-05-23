-- Add missing columns that are causing schema cache errors
-- Run this to ensure all required columns exist

-- Add missing columns to family_goals table
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Add missing columns to family_meals table  
ALTER TABLE family_meals ADD COLUMN IF NOT EXISTS dish VARCHAR(200);

-- Add missing columns to family_tasks table for hierarchy
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'task';
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS parent_type VARCHAR(20);
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Add missing columns to family_members table
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(20) DEFAULT '#3B82F6';
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Ensure family_reviews table has meal_feedback column
ALTER TABLE family_reviews ADD COLUMN IF NOT EXISTS meal_feedback JSONB;
ALTER TABLE family_reviews ADD COLUMN IF NOT EXISTS financial_data JSONB;

-- Update any NOT NULL constraints that might be missing
-- Make dish NOT NULL only if it doesn't have data yet
UPDATE family_meals SET dish = 'Unknown Dish' WHERE dish IS NULL;
ALTER TABLE family_meals ALTER COLUMN dish SET NOT NULL;

-- Make name NOT NULL only if it doesn't have data yet  
UPDATE family_members SET name = 'Family Member' WHERE name IS NULL;
ALTER TABLE family_members ALTER COLUMN name SET NOT NULL;