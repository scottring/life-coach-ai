-- Fix family_goals table schema - add missing timeframe column
-- This adds the timeframe column that exists in complete-schema.sql but is missing from the live database

-- Add the missing timeframe column to family_goals table
ALTER TABLE family_goals 
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20) DEFAULT 'month';

-- Also ensure all other columns are present from the complete schema
ALTER TABLE family_goals 
ADD COLUMN IF NOT EXISTS target_value NUMERIC;

ALTER TABLE family_goals 
ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;

ALTER TABLE family_goals 
ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

ALTER TABLE family_goals 
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

ALTER TABLE family_goals 
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'family_goals' 
ORDER BY ordinal_position;