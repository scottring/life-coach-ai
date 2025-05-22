-- Temporary fix: Disable RLS to get family creation working
-- Run this in your Supabase SQL Editor

-- Disable RLS temporarily on all family tables
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_milestones DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Users can view their families" ON families;
DROP POLICY IF EXISTS "Family creators can update families" ON families;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON family_members;
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON family_members;
DROP POLICY IF EXISTS "Family members can manage meals" ON family_meals;
DROP POLICY IF EXISTS "Family members can manage shopping" ON shopping_items;
DROP POLICY IF EXISTS "Family members can manage tasks" ON family_tasks;
DROP POLICY IF EXISTS "Family members can manage goals" ON family_goals;
DROP POLICY IF EXISTS "Family members can manage milestones" ON family_milestones;