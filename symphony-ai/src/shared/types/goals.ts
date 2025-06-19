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

// Planning Types (based on goal-todo approach)
export type TaskReviewAction = 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close';
export type TaskReviewStatus = 'completed' | 'missed' | 'needs_review' | 'pushed_forward';
export type PlanningSessionType = 'weekly' | 'monthly' | 'seasonal' | 'annual';
export type PlanningSessionStatus = 'not_started' | 'review_phase' | 'planning_phase' | 'completed';

export interface TaskReviewItem {
  taskId: string;
  title: string;
  status: TaskReviewStatus;
  originalDueDate: string;
  priority: GoalPriority;
  action?: TaskReviewAction;
  completedDate?: string;
  goalId?: string;
  goalName?: string;
}

export interface UnscheduledItem {
  id: string;
  type: 'task' | 'routine' | 'milestone';
  title: string;
  description?: string;
  goalId?: string;
  goalName?: string;
  priority?: GoalPriority;
  suggestedDate?: string;
}

export interface NextWeekTask {
  taskId: string;
  priority: GoalPriority;
  dueDate: string;
  timeSlot?: {
    start: string;
    end: string;
  };
}

export interface CalendarEvent {
  eventId: string;
  taskId: string;
  startTime: string;
  endTime: string;
}

export interface LongTermGoalReview {
  goalId: string;
  madeProgress: boolean;
  adjustments?: string;
  nextReviewDate?: string;
}

export interface SharedGoalReview {
  goalId: string;
  completedTasks: string[];
  pendingTasks: string[];
  assignedTasks: { taskId: string; userId: string }[];
}

// Monthly Planning Specific Types
export interface FinancialReview {
  monthlyBudget: {
    income: number;
    expenses: number;
    savings: number;
    categories: { [category: string]: { budgeted: number; actual: number } };
  };
  expenditureReview: {
    largeExpenses: { item: string; amount: number; category: string; necessary: boolean }[];
    categoryOverages: string[];
    savingsGoalProgress: number;
  };
  upcomingBigItems: {
    item: string;
    estimatedCost: number;
    targetMonth: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface ProjectTask {
  id: string;
  title: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  estimatedHours: number;
  completedAt?: string;
}

export interface ProjectPrioritization {
  activeProjects: {
    projectId: string;
    title: string;
    priority: number;
    progress: number;
    blockers: string[];
    nextMonthGoals: string[];
    tasks?: ProjectTask[];
  }[];
  proposedProjects: {
    title: string;
    description: string;
    estimatedEffort: 'small' | 'medium' | 'large';
    urgency: 'high' | 'medium' | 'low';
    dependencies: string[];
  }[];
}

export interface RelationshipParentingReview {
  relationshipGoals: {
    area: string;
    currentState: string;
    desiredState: string;
    nextMonthActions: string[];
  }[];
  parentingFocus: {
    childName: string;
    currentChallenges: string[];
    wins: string[];
    nextMonthPriorities: string[];
  }[];
  coupleTime: {
    lastMonthQuality: number; // 1-10 scale
    upcomingOpportunities: string[];
    scheduledDates: string[];
  };
}

export interface RoutineDelegationReview {
  currentDelegations: {
    task: string;
    assignedTo: string;
    effectiveness: number; // 1-10 scale
    adjustmentsNeeded: string[];
  }[];
  newDelegationOpportunities: {
    task: string;
    potentialAssignee: string;
    estimatedTimesSaved: number;
  }[];
  familyWorkloadBalance: {
    memberName: string;
    currentLoad: number; // 1-10 scale
    satisfaction: number; // 1-10 scale
  }[];
}

// Base Planning Session (supports both weekly and monthly)
export interface PlanningSession {
  id: string;
  type: PlanningSessionType;
  ownerId: string;
  contextId: string;
  periodStartDate: string;
  periodEndDate: string;
  status: PlanningSessionStatus;
  createdAt: string;
  updatedAt: string;
  
  reviewPhase: {
    taskReviews: TaskReviewItem[];
    longTermGoalReviews: LongTermGoalReview[];
    sharedGoalReviews: SharedGoalReview[];
    summary: {
      totalCompleted: number;
      totalPushedForward: number;
      totalMissed: number;
      totalArchived: number;
      totalClosed: number;
    };
    // Monthly-specific reviews
    financialReview?: FinancialReview;
    relationshipParentingReview?: RelationshipParentingReview;
    routineDelegationReview?: RoutineDelegationReview;
  };
  
  planningPhase: {
    nextPeriodTasks: NextWeekTask[]; // For weekly: next week, for monthly: next month
    recurringTasks: any[];
    sharedGoalAssignments: any[];
    calendarSyncStatus: {
      synced: boolean;
      syncedEvents: CalendarEvent[];
      lastSyncedAt?: string;
    };
    // Monthly-specific planning
    projectPrioritization?: ProjectPrioritization;
    toolUpdates?: string[];
    shoppingListUpdates?: string[];
    biggerPictureConcerns?: string[];
  };
}

// Keep the old WeeklyPlanningSession for backward compatibility
export type WeeklyPlanningSession = PlanningSession;

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
  scheduledDate?: string;
  scheduledTime?: string;
  goalId?: string;
  projectId?: string;
  milestoneId?: string;
  canSchedule: boolean;
  isRecurring: boolean;
  contextId: string;
  tags?: string[];
  status?: TaskStatus;
}