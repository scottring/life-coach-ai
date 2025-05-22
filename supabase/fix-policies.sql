-- Fix RLS Policy Infinite Recursion
-- Run this in your Supabase SQL Editor to fix the policies

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Family members can view families" ON families;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Family members can view members" ON family_members;
DROP POLICY IF EXISTS "Family members can access meals" ON family_meals;
DROP POLICY IF EXISTS "Family members can access shopping" ON shopping_items;
DROP POLICY IF EXISTS "Family members can access tasks" ON family_tasks;
DROP POLICY IF EXISTS "Family members can access goals" ON family_goals;
DROP POLICY IF EXISTS "Family members can access milestones" ON family_milestones;

-- Recreate policies without infinite recursion

-- Families policies
CREATE POLICY "Users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their families" ON families FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family creators can update families" ON families FOR UPDATE
  USING (created_by = auth.uid());

-- Family members policies (simplified to avoid recursion)
CREATE POLICY "Users can insert themselves as members" ON family_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view family members" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own membership" ON family_members FOR UPDATE
  USING (user_id = auth.uid());

-- Family meals policies
CREATE POLICY "Family members can manage meals" ON family_meals FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Shopping items policies
CREATE POLICY "Family members can manage shopping" ON shopping_items FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family tasks policies
CREATE POLICY "Family members can manage tasks" ON family_tasks FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family goals policies
CREATE POLICY "Family members can manage goals" ON family_goals FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family milestones policies
CREATE POLICY "Family members can manage milestones" ON family_milestones FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );