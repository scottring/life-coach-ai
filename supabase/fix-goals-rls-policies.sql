-- Fix RLS policies for goals table
-- This ensures authenticated users can manage their own goals

-- First, ensure RLS is enabled
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Create new policies for authenticated users
-- Allow users to view their own goals
CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow users to insert their own goals
CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own goals
CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own goals
CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Also ensure the tasks table has proper policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Tasks policies
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Verify the policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('goals', 'tasks')
ORDER BY tablename, policyname;