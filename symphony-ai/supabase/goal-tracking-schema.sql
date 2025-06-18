-- Goal tracking system schema for Firestore (as SQL reference)
-- This file serves as documentation for the Firestore collections structure

-- Goals Collection
-- Collection: goals
-- Document Structure:
/*
{
  id: string (auto-generated),
  title: string,
  description?: string,
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'critical',
  category: 'personal' | 'family' | 'work' | 'health' | 'financial' | 'education' | 'other',
  startDate: string (ISO date),
  targetDate: string (ISO date),
  completedDate?: string (ISO date),
  progress: number (0-100),
  milestones: string[] (milestone IDs),
  projects: string[] (project IDs),
  tasks: string[] (task IDs),
  tags: string[],
  assignedMembers: string[] (user IDs),
  isPublic: boolean,
  parentGoalId?: string,
  childGoalIds: string[],
  contextId: string,
  createdBy: string (user ID),
  createdAt: timestamp,
  updatedAt: timestamp
}
*/

-- Projects Collection
-- Collection: projects
-- Document Structure:
/*
{
  id: string (auto-generated),
  title: string,
  description?: string,
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'critical',
  category: 'personal' | 'family' | 'work' | 'health' | 'financial' | 'education' | 'other',
  startDate: string (ISO date),
  targetEndDate: string (ISO date),
  actualEndDate?: string (ISO date),
  progress: number (0-100),
  budget?: number,
  actualCost?: number,
  milestones: string[] (milestone IDs),
  tasks: string[] (task IDs),
  tags: string[],
  assignedMembers: string[] (user IDs),
  goalId?: string (parent goal ID),
  contextId: string,
  createdBy: string (user ID),
  createdAt: timestamp,
  updatedAt: timestamp
}
*/

-- Milestones Collection
-- Collection: milestones
-- Document Structure:
/*
{
  id: string (auto-generated),
  title: string,
  description?: string,
  status: 'pending' | 'in_progress' | 'completed' | 'overdue',
  targetDate: string (ISO date),
  completedDate?: string (ISO date),
  progress: number (0-100),
  tasks: string[] (task IDs),
  dependencies: string[] (milestone IDs),
  goalId: string,
  projectId?: string,
  contextId: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
*/

-- Goal Tasks Collection
-- Collection: goal_tasks
-- Document Structure:
/*
{
  id: string (auto-generated),
  title: string,
  description?: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'critical',
  assignedTo?: string (user ID),
  estimatedDuration: number (minutes),
  actualDuration?: number (minutes),
  dueDate?: string (ISO date),
  scheduledDate?: string (ISO date),
  scheduledTime?: string (HH:MM format),
  dependencies: string[] (task IDs),
  tags: string[],
  isRecurring: boolean,
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: number,
    daysOfWeek?: number[] (0-6, Sunday-Saturday),
    endDate?: string (ISO date)
  },
  goalId: string,
  milestoneId?: string,
  projectId?: string,
  contextId: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt?: timestamp
}
*/

-- Firestore Indexes (to be created in Firebase Console)
-- Goals:
-- - contextId ASC, status ASC
-- - contextId ASC, priority ASC
-- - contextId ASC, category ASC
-- - contextId ASC, createdAt DESC
-- - assignedMembers ARRAY, contextId ASC

-- Projects:
-- - contextId ASC, status ASC
-- - contextId ASC, goalId ASC
-- - contextId ASC, createdAt DESC

-- Milestones:
-- - contextId ASC, status ASC
-- - goalId ASC, targetDate ASC
-- - projectId ASC, targetDate ASC
-- - contextId ASC, targetDate ASC

-- Goal Tasks:
-- - contextId ASC, status ASC
-- - goalId ASC, status ASC
-- - milestoneId ASC, status ASC
-- - projectId ASC, status ASC
-- - contextId ASC, scheduledDate ASC
-- - contextId ASC, dueDate ASC
-- - assignedTo ASC, status ASC
-- - contextId ASC, isRecurring ASC

-- Security Rules Notes:
-- 1. All documents must belong to a context that the user has access to
-- 2. Users can only read/write documents in contexts they're members of
-- 3. Context admins have additional permissions for management
-- 4. Private goals (isPublic: false) are only visible to assigned members and creators