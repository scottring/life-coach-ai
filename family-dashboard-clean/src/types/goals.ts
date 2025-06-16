export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalCategory = 'personal' | 'family' | 'work' | 'health' | 'financial' | 'education' | 'other';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface GoalTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: GoalPriority;
  assignedTo?: string;
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  dueDate?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  dependencies: string[]; // IDs of other tasks
  tags: string[];
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
    endDate?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  goalId: string;
  milestoneId?: string;
  projectId?: string;
  contextId: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  targetDate: string;
  completedDate?: string;
  progress: number; // 0-100
  tasks: GoalTask[];
  dependencies: string[]; // IDs of other milestones
  goalId: string;
  projectId?: string;
  contextId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  priority: GoalPriority;
  category: GoalCategory;
  startDate: string;
  targetEndDate: string;
  actualEndDate?: string;
  progress: number; // 0-100
  budget?: number;
  actualCost?: number;
  milestones: Milestone[];
  tasks: GoalTask[];
  tags: string[];
  assignedMembers: string[];
  goalId?: string; // Optional parent goal
  contextId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  category: GoalCategory;
  startDate: string;
  targetDate: string;
  completedDate?: string;
  progress: number; // 0-100
  milestones: Milestone[];
  projects: Project[];
  tasks: GoalTask[];
  tags: string[];
  assignedMembers: string[];
  isPublic: boolean;
  parentGoalId?: string; // For hierarchical goals
  childGoalIds: string[];
  contextId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goalId: string;
  totalTasks: number;
  completedTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  overdueTasks: number;
  overdueMilestones: number;
  averageTaskCompletion: number; // days
  estimatedCompletion: string; // ISO date
  lastUpdated: string;
}

export interface GoalInsight {
  goalId: string;
  type: 'warning' | 'success' | 'info' | 'error';
  message: string;
  recommendation?: string;
  createdAt: string;
}

export interface GoalFilters {
  status?: GoalStatus[];
  priority?: GoalPriority[];
  category?: GoalCategory[];
  assignedTo?: string[];
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface GoalMetrics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overallProgress: number;
  onTrackGoals: number;
  atRiskGoals: number;
  overdueGoals: number;
  averageCompletionTime: number; // days
  categoryBreakdown: Record<GoalCategory, number>;
  priorityBreakdown: Record<GoalPriority, number>;
}

// For drag and drop integration with calendar
export interface SchedulableItem {
  id: string;
  type: 'goal' | 'milestone' | 'project' | 'task' | 'sop';
  title: string;
  description?: string;
  estimatedDuration: number;
  priority: GoalPriority;
  assignedTo?: string;
  dueDate?: string;
  goalId?: string;
  projectId?: string;
  milestoneId?: string;
  canSchedule: boolean;
  isRecurring: boolean;
  contextId: string;
  tags?: string[];
  status?: TaskStatus;
}