import { PlanningSession, PlanningSessionType, NextWeekTask, TaskReviewItem } from '../types/goals';
import { planningService } from './weeklyPlanningService';
import { goalService } from './goalService';
import { auth, db } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';

export interface TimeContext {
  type: PlanningSessionType;
  current: PlanningSession | null;
  previous: PlanningSession | null;
  completionRate: number;
  trend: 'improving' | 'declining' | 'stable';
  keyMetrics: {
    tasksCompleted: number;
    tasksTotal: number;
    avgCompletionTime: number; // days
    blockedTasks: number;
    overdueTasks: number;
  };
  recommendations: string[];
  nextActions: string[];
}

export interface ProgressInsight {
  type: 'achievement' | 'concern' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction?: string;
}

export interface SmartPopulation {
  suggestedTasks: NextWeekTask[];
  rolloverTasks: NextWeekTask[];
  priorityAdjustments: {
    taskId: string;
    currentPriority: string;
    suggestedPriority: string;
    reason: string;
  }[];
  timeEstimates: {
    taskId: string;
    estimatedMinutes: number;
    confidence: number; // 0-1
  }[];
}

class AITimeContextService {
  private firestoreEnabled = true;
  private insightCache: Map<string, ProgressInsight[]> = new Map();
  private contextCache: Map<string, TimeContext> = new Map();
  
  // Get comprehensive time context for any planning session type
  async getTimeContext(contextId: string, userId: string, type: PlanningSessionType): Promise<TimeContext> {
    try {
      console.log(`Getting time context for ${type} planning session`);
      
      const current = await planningService.getCurrentSession(contextId, userId, type);
      const previous = await this.getPreviousSession(contextId, userId, type);
      
      const keyMetrics = await this.calculateKeyMetrics(current, previous, type);
      const completionRate = keyMetrics.tasksTotal > 0 ? keyMetrics.tasksCompleted / keyMetrics.tasksTotal : 0;
      const trend = this.calculateTrend(current, previous);
      
      const recommendations = await this.generateRecommendations(keyMetrics, trend, type);
      const nextActions = await this.generateNextActions(current, keyMetrics, type);

      return {
        type,
        current,
        previous,
        completionRate,
        trend,
        keyMetrics,
        recommendations,
        nextActions
      };
    } catch (error) {
      console.error('Error getting time context:', error);
      return this.getEmptyTimeContext(type);
    }
  }

  // Smart population of tasks based on AI analysis
  async getSmartPopulation(contextId: string, userId: string, targetType: PlanningSessionType): Promise<SmartPopulation> {
    try {
      console.log(`Generating smart population for ${targetType} session`);
      
      const rolloverTasks = await this.getRolloverTasks(contextId, targetType);
      const suggestedTasks = await this.generateSuggestedTasks(contextId, targetType);
      const priorityAdjustments = await this.analyzePriorityAdjustments(contextId, targetType);
      const timeEstimates = await this.generateTimeEstimates(suggestedTasks, rolloverTasks);

      return {
        suggestedTasks,
        rolloverTasks,
        priorityAdjustments,
        timeEstimates
      };
    } catch (error) {
      console.error('Error generating smart population:', error);
      return {
        suggestedTasks: [],
        rolloverTasks: [],
        priorityAdjustments: [],
        timeEstimates: []
      };
    }
  }

  // Generate progress insights with AI analysis
  async generateProgressInsights(contextId: string, userId: string): Promise<ProgressInsight[]> {
    try {
      const insights: ProgressInsight[] = [];
      
      // Get contexts for all time periods - using only supported types
      const weeklyContext = await this.getTimeContext(contextId, userId, 'weekly');
      const monthlyContext = await this.getTimeContext(contextId, userId, 'monthly');
      
      // Create a daily context placeholder (since daily isn't a stored session type)
      const dailyContext: TimeContext = {
        type: 'weekly', // Use weekly as base for daily analysis
        current: weeklyContext.current,
        previous: weeklyContext.previous,
        completionRate: weeklyContext.completionRate,
        trend: weeklyContext.trend,
        keyMetrics: weeklyContext.keyMetrics,
        recommendations: [],
        nextActions: []
      };

      // Analyze completion patterns
      insights.push(...this.analyzeCompletionPatterns(dailyContext, weeklyContext, monthlyContext));
      
      // Analyze time management
      insights.push(...this.analyzeTimeManagement(dailyContext, weeklyContext));
      
      // Analyze goal alignment
      insights.push(...this.analyzeGoalAlignment(weeklyContext, monthlyContext));
      
      // Generate trend insights
      insights.push(...this.generateTrendInsights(weeklyContext, monthlyContext));

      return insights.sort((a, b) => this.prioritySort(a, b));
    } catch (error) {
      console.error('Error generating progress insights:', error);
      return [];
    }
  }

  // Track and update progress automatically
  async trackProgress(contextId: string, userId: string, taskUpdate: {
    taskId: string;
    status: 'completed' | 'blocked' | 'in_progress' | 'cancelled';
    timeSpent?: number;
    notes?: string;
  }): Promise<void> {
    try {
      console.log('Tracking progress update:', taskUpdate);
      
      // Update the task in the current session
      await this.updateTaskInCurrentSession(contextId, userId, taskUpdate);
      
      // Generate insights from the update
      const insights = await this.generateUpdateInsights(contextId, taskUpdate);
      
      // Store insights for future recommendations
      await this.storeProgressInsights(contextId, insights);
      
      // Check if this update triggers any workflow automations
      await this.checkWorkflowTriggers(contextId, taskUpdate);
      
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  }

  // Get rollover tasks from previous sessions
  private async getRolloverTasks(contextId: string, targetType: PlanningSessionType): Promise<NextWeekTask[]> {
    const rolloverTasks: NextWeekTask[] = [];
    
    try {
      let sourceType: PlanningSessionType;
      
      // Determine source based on target
      switch (targetType) {
        case 'weekly':
          sourceType = 'monthly';
          break;
        case 'monthly':
          sourceType = 'seasonal';
          break;
        case 'seasonal':
          sourceType = 'annual';
          break;
        default:
          return rolloverTasks;
      }

      const sourceSession = await planningService.getCurrentSession(contextId, 'system', sourceType);
      if (!sourceSession) return rolloverTasks;

      // Get incomplete tasks from source session
      const incompleteTasks = sourceSession.planningPhase.nextPeriodTasks.filter(task => {
        // Check if task is still relevant and incomplete
        const taskDate = task.dueDate ? new Date(task.dueDate) : null;
        const now = new Date();
        
        return !taskDate || taskDate >= now; // Future tasks or tasks without dates
      });

      // Apply AI logic to determine which tasks should roll over
      for (const task of incompleteTasks) {
        const shouldRollover = await this.evaluateTaskRollover(task, targetType);
        if (shouldRollover) {
          rolloverTasks.push({
            ...task,
            priority: this.adjustPriorityForRollover(task.priority),
            dueDate: this.adjustDueDateForTarget(task.dueDate, targetType)
          });
        }
      }

    } catch (error) {
      console.error('Error getting rollover tasks:', error);
    }

    return rolloverTasks;
  }

  // Generate AI-suggested tasks based on goals and patterns
  private async generateSuggestedTasks(contextId: string, targetType: PlanningSessionType): Promise<NextWeekTask[]> {
    const suggestedTasks: NextWeekTask[] = [];
    
    try {
      // Get user's goals and analyze patterns
      const goals = await goalService.getGoalsByContext(contextId);
      const timeWindow = this.getTimeWindowForType(targetType);
      
      for (const goal of goals) {
        // Generate tasks based on goal progress and timeline
        const goalTasks = await this.generateTasksFromGoal(goal, targetType, timeWindow);
        suggestedTasks.push(...goalTasks);
      }

      // Add routine maintenance tasks based on type
      const routineTasks = this.generateRoutineTasks(targetType);
      suggestedTasks.push(...routineTasks);

      // Sort by AI-determined priority
      return suggestedTasks.sort((a, b) => this.prioritySort(a, b));
      
    } catch (error) {
      console.error('Error generating suggested tasks:', error);
      return [];
    }
  }

  // Calculate key metrics for time context
  private async calculateKeyMetrics(current: PlanningSession | null, previous: PlanningSession | null, type: PlanningSessionType) {
    const metrics = {
      tasksCompleted: 0,
      tasksTotal: 0,
      avgCompletionTime: 0,
      blockedTasks: 0,
      overdueTasks: 0
    };

    if (!current) return metrics;

    // Analyze current session
    const tasks = current.planningPhase.nextPeriodTasks;
    metrics.tasksTotal = tasks.length;

    // Count completion status from review phase
    if (current.reviewPhase.taskReviews) {
      metrics.tasksCompleted = current.reviewPhase.taskReviews.filter(r => r.status === 'completed').length;
      metrics.blockedTasks = current.reviewPhase.taskReviews.filter(r => r.status === 'needs_review').length;
    }

    // Calculate overdue tasks
    const now = new Date();
    metrics.overdueTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < now;
    }).length;

    return metrics;
  }

  // Calculate trend based on current vs previous performance
  private calculateTrend(current: PlanningSession | null, previous: PlanningSession | null): 'improving' | 'declining' | 'stable' {
    if (!current || !previous) return 'stable';

    const currentRate = current.reviewPhase.summary?.totalCompleted || 0;
    const previousRate = previous.reviewPhase.summary?.totalCompleted || 0;

    const difference = currentRate - previousRate;
    
    if (difference > 2) return 'improving';
    if (difference < -2) return 'declining';
    return 'stable';
  }

  // Generate contextual recommendations
  private async generateRecommendations(metrics: any, trend: string, type: PlanningSessionType): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.completionRate < 0.7) {
      recommendations.push(`Your completion rate is ${(metrics.completionRate * 100).toFixed(0)}%. Consider reducing task load or breaking down large tasks.`);
    }

    if (metrics.overdueTasks > 0) {
      recommendations.push(`You have ${metrics.overdueTasks} overdue tasks. Review and reschedule or delegate these items.`);
    }

    if (trend === 'declining') {
      recommendations.push('Your completion trend is declining. Consider reviewing your planning approach and identifying blockers.');
    }

    if (type === 'monthly' && metrics.blockedTasks > 3) {
      recommendations.push('Multiple blocked tasks detected. Schedule time to address dependencies and remove blockers.');
    }

    return recommendations;
  }

  // Generate next actions based on context
  private async generateNextActions(current: PlanningSession | null, metrics: any, type: PlanningSessionType): Promise<string[]> {
    const actions: string[] = [];

    if (!current) {
      actions.push(`Start a new ${type} planning session`);
      return actions;
    }

    if (current.status === 'review_phase') {
      actions.push('Complete the review phase by addressing all pending task reviews');
    }

    if (current.status === 'planning_phase') {
      actions.push('Add tasks to your planning phase and schedule them appropriately');
    }

    if (metrics.overdueTasks > 0) {
      actions.push('Review and reschedule overdue tasks');
    }

    return actions;
  }

  // Helper methods
  private async getPreviousSession(contextId: string, userId: string, type: PlanningSessionType): Promise<PlanningSession | null> {
    // This would query for the previous session of the same type
    // Implementation depends on how sessions are stored and queried
    return null; // Placeholder
  }

  private getEmptyTimeContext(type: PlanningSessionType): TimeContext {
    return {
      type,
      current: null,
      previous: null,
      completionRate: 0,
      trend: 'stable',
      keyMetrics: {
        tasksCompleted: 0,
        tasksTotal: 0,
        avgCompletionTime: 0,
        blockedTasks: 0,
        overdueTasks: 0
      },
      recommendations: [`No ${type} session found. Consider starting a new planning session.`],
      nextActions: [`Create a new ${type} planning session`]
    };
  }

  private async evaluateTaskRollover(task: NextWeekTask, targetType: PlanningSessionType): Promise<boolean> {
    // AI logic to determine if a task should roll over
    // Consider priority, due date, completion history, etc.
    return task.priority === 'high' || task.priority === 'critical';
  }

  private adjustPriorityForRollover(priority: any): any {
    // Slightly increase priority for rolled over tasks
    if (priority === 'low') return 'medium';
    if (priority === 'medium') return 'high';
    return priority;
  }

  private adjustDueDateForTarget(dueDate: string | undefined, targetType: PlanningSessionType): string {
    if (!dueDate) {
      // Set default due date based on target type
      const now = new Date();
      switch (targetType) {
        case 'weekly':
          now.setDate(now.getDate() + 7);
          return now.toISOString();
        case 'monthly':
          now.setMonth(now.getMonth() + 1);
          return now.toISOString();
        case 'seasonal':
          now.setMonth(now.getMonth() + 3);
          return now.toISOString();
        case 'annual':
          now.setFullYear(now.getFullYear() + 1);
          return now.toISOString();
        default:
          return now.toISOString();
      }
    }
    return dueDate;
  }

  private getTimeWindowForType(type: PlanningSessionType): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (type) {
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'seasonal':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'annual':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setDate(end.getDate() + 7);
    }

    return { start, end };
  }

  private async generateTasksFromGoal(goal: any, targetType: PlanningSessionType, timeWindow: { start: Date; end: Date }): Promise<NextWeekTask[]> {
    // AI logic to break down goals into time-appropriate tasks
    const tasks: NextWeekTask[] = [];
    
    // This would implement AI analysis of goals and generate appropriate tasks
    // For now, return empty array
    return tasks;
  }

  private generateRoutineTasks(targetType: PlanningSessionType): NextWeekTask[] {
    const tasks: NextWeekTask[] = [];
    
    // Generate routine tasks based on the planning type
    switch (targetType) {
      case 'weekly':
        // Weekly maintenance tasks
        tasks.push({
          taskId: 'weekly_review',
          priority: 'medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;
      case 'monthly':
        // Monthly planning tasks
        tasks.push({
          taskId: 'monthly_goals_review',
          priority: 'high',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;
      case 'seasonal':
        // Seasonal review tasks
        tasks.push({
          taskId: 'seasonal_review',
          priority: 'high',
          dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;
      case 'annual':
        // Annual planning tasks
        tasks.push({
          taskId: 'annual_review',
          priority: 'high',
          dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
        break;
    }
    
    return tasks;
  }

  private prioritySort(a: any, b: any): number {
    const priorityOrder: { [key: string]: number } = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  }

  // Additional helper methods for progress tracking
  private async analyzePriorityAdjustments(contextId: string, targetType: PlanningSessionType) {
    // Analyze historical patterns to suggest priority adjustments
    return [];
  }

  private async generateTimeEstimates(suggestedTasks: NextWeekTask[], rolloverTasks: NextWeekTask[]) {
    // Generate AI-based time estimates for tasks
    return [];
  }

  private analyzeCompletionPatterns(daily: TimeContext, weekly: TimeContext, monthly: TimeContext): ProgressInsight[] {
    // Analyze patterns across time contexts
    return [];
  }

  private analyzeTimeManagement(daily: TimeContext, weekly: TimeContext): ProgressInsight[] {
    // Analyze time management effectiveness
    return [];
  }

  private analyzeGoalAlignment(weekly: TimeContext, monthly: TimeContext): ProgressInsight[] {
    // Analyze alignment between weekly and monthly goals
    return [];
  }

  private generateTrendInsights(weekly: TimeContext, monthly: TimeContext): ProgressInsight[] {
    // Generate insights based on trends
    return [];
  }

  private async updateTaskInCurrentSession(contextId: string, userId: string, taskUpdate: any): Promise<void> {
    // Update task status in current session
  }

  private async generateUpdateInsights(contextId: string, taskUpdate: any): Promise<ProgressInsight[]> {
    // Generate insights from task updates
    return [];
  }

  private async storeProgressInsights(contextId: string, insights: ProgressInsight[]): Promise<void> {
    if (!this.firestoreEnabled || !auth.currentUser || insights.length === 0) return;
    
    try {
      const docRef = doc(db, 'ai_progress_insights', `${contextId}_${auth.currentUser.uid}`);
      await setDoc(docRef, {
        contextId,
        userId: auth.currentUser.uid,
        insights,
        generatedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }, { merge: true });
    } catch (error) {
      console.error('Error storing progress insights:', error);
    }
  }

  private async checkWorkflowTriggers(contextId: string, taskUpdate: any): Promise<void> {
    // Check if task update triggers any automated workflows
  }

  // Firestore persistence methods
  private async saveTimeContext(cacheKey: string, context: TimeContext): Promise<void> {
    if (!this.firestoreEnabled || !auth.currentUser) return;

    try {
      const docRef = doc(db, 'ai_time_context_cache', cacheKey);
      await setDoc(docRef, {
        ...context,
        userId: auth.currentUser.uid,
        cachedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }, { merge: true });
    } catch (error) {
      console.error('Error saving time context:', error);
    }
  }

  private async loadTimeContext(cacheKey: string): Promise<TimeContext | null> {
    if (!this.firestoreEnabled || !auth.currentUser) return null;

    try {
      const docRef = doc(db, 'ai_time_context_cache', cacheKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if cache is expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          await deleteDoc(docRef);
          return null;
        }
        
        // Remove metadata fields
        const { userId, cachedAt, expiresAt, ...context } = data;
        return context as TimeContext;
      }
    } catch (error) {
      console.error('Error loading time context:', error);
    }
    
    return null;
  }

  private async saveProgressInsightsCache(cacheKey: string, insights: ProgressInsight[]): Promise<void> {
    if (!this.firestoreEnabled || !auth.currentUser || insights.length === 0) return;

    try {
      const docRef = doc(db, 'ai_progress_insights_cache', cacheKey);
      await setDoc(docRef, {
        insights,
        userId: auth.currentUser.uid,
        cachedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }, { merge: true });
    } catch (error) {
      console.error('Error saving progress insights:', error);
    }
  }

  private async loadProgressInsights(cacheKey: string): Promise<ProgressInsight[] | null> {
    if (!this.firestoreEnabled || !auth.currentUser) return null;

    try {
      const docRef = doc(db, 'ai_progress_insights_cache', cacheKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if cache is expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          await deleteDoc(docRef);
          return null;
        }
        
        return data.insights as ProgressInsight[];
      }
    } catch (error) {
      console.error('Error loading progress insights:', error);
    }
    
    return null;
  }

  private async saveProgressUpdate(contextId: string, userId: string, taskUpdate: any): Promise<void> {
    if (!this.firestoreEnabled || !auth.currentUser) return;

    try {
      const docRef = doc(collection(db, 'ai_progress_updates'));
      await setDoc(docRef, {
        contextId,
        userId: auth.currentUser.uid,
        taskUpdate,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving progress update:', error);
    }
  }

  private invalidateContextCache(contextId: string, userId: string): void {
    // Remove all cached contexts for this user/context
    const keysToDelete: string[] = [];
    
    this.contextCache.forEach((_, key) => {
      if (key.startsWith(`${contextId}_${userId}`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.contextCache.delete(key));
    
    // Also invalidate insights cache
    const insightKey = `insights_${contextId}_${userId}`;
    this.insightCache.delete(insightKey);
  }

  // Load user's progress history
  async loadProgressHistory(contextId: string, userId: string, limit: number = 50): Promise<any[]> {
    if (!this.firestoreEnabled || !auth.currentUser) return [];

    try {
      const q = query(
        collection(db, 'ai_progress_updates'),
        where('userId', '==', auth.currentUser.uid),
        where('contextId', '==', contextId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const updates: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        updates.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      
      return updates.slice(0, limit);
    } catch (error) {
      console.error('Error loading progress history:', error);
      return [];
    }
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    if (!this.firestoreEnabled || !auth.currentUser) return;

    try {
      const collections = ['ai_time_context_cache', 'ai_progress_insights_cache'];
      
      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', auth.currentUser.uid),
          where('expiresAt', '<', new Date())
        );
        
        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
    }
  }
}

export const aiTimeContextService = new AITimeContextService();