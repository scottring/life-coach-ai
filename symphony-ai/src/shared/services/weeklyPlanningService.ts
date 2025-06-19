import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  PlanningSession,
  PlanningSessionType,
  PlanningSessionStatus,
  WeeklyPlanningSession, 
  TaskReviewItem, 
  UnscheduledItem, 
  NextWeekTask,
  LongTermGoalReview,
  SharedGoalReview,
  TaskReviewAction,
  Goal,
  GoalTask
} from '../types/goals';
import { goalService } from './goalService';

class PlanningService {
  // Get current session for given type
  async getCurrentSession(contextId: string, userId: string, type: PlanningSessionType = 'weekly'): Promise<PlanningSession | null> {
    console.log('getCurrentSession called with:', { contextId, userId, type });
    
    // Validate required parameters
    if (!contextId || !userId) {
      console.error('Invalid parameters for getCurrentSession:', { contextId, userId, type });
      throw new Error('contextId and userId are required');
    }
    
    if (type === 'weekly') {
      return this.getCurrentWeekSession(contextId, userId);
    } else if (type === 'monthly') {
      return this.getCurrentMonthSession(contextId, userId);
    }
    return null;
  }

  // Get current week session or create new one
  async getCurrentWeekSession(contextId: string, userId: string): Promise<WeeklyPlanningSession | null> {
    try {
      const now = new Date();
      const weekStart = this.getWeekStart(now);
      const weekEnd = this.getWeekEnd(now);

      const q = query(
        collection(db, 'planning_sessions'),
        where('contextId', '==', contextId),
        where('ownerId', '==', userId),
        where('type', '==', 'weekly'),
        where('periodStartDate', '>=', weekStart.toISOString()),
        where('periodEndDate', '<=', weekEnd.toISOString())
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.docs.length > 0) {
        const data = querySnapshot.docs[0].data();
        return {
          id: querySnapshot.docs[0].id,
          ...data,
          periodStartDate: data.periodStartDate instanceof Timestamp ? data.periodStartDate.toDate().toISOString() : data.periodStartDate,
          periodEndDate: data.periodEndDate instanceof Timestamp ? data.periodEndDate.toDate().toISOString() : data.periodEndDate,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as WeeklyPlanningSession;
      }

      return null;
    } catch (error) {
      console.error('Error getting current week session:', error);
      throw error;
    }
  }

  // Start new planning session
  async startNewSession(contextId: string, userId: string, type: PlanningSessionType = 'weekly'): Promise<PlanningSession> {
    if (type === 'weekly') {
      return this.startNewWeeklySession(contextId, userId);
    } else if (type === 'monthly') {
      return this.startNewMonthlySession(contextId, userId);
    }
    throw new Error(`Unsupported planning session type: ${type}`);
  }

  // Start new weekly planning session
  async startNewWeeklySession(contextId: string, userId: string): Promise<WeeklyPlanningSession> {
    try {
      const now = new Date();
      const weekStart = this.getWeekStart(now);
      const weekEnd = this.getWeekEnd(now);

      // Get tasks for review from the past week
      const taskReviews = await this.getTasksForReview(contextId);
      
      // Trickle down tasks from monthly planning (if exists)
      const monthlyTasks = await this.getTasksFromMonthlyPlanning(contextId, weekStart, weekEnd);

      const newSession = {
        ownerId: userId,
        contextId,
        type: 'weekly' as PlanningSessionType,
        periodStartDate: weekStart.toISOString(),
        periodEndDate: weekEnd.toISOString(),
        status: 'not_started' as PlanningSessionStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewPhase: {
          taskReviews,
          longTermGoalReviews: [],
          sharedGoalReviews: [],
          summary: {
            totalCompleted: 0,
            totalPushedForward: 0,
            totalMissed: 0,
            totalArchived: 0,
            totalClosed: 0
          }
        },
        planningPhase: {
          nextPeriodTasks: monthlyTasks, // Start with tasks from monthly planning
          recurringTasks: [],
          sharedGoalAssignments: [],
          calendarSyncStatus: {
            synced: false,
            syncedEvents: []
          }
        }
      };

      const docRef = await addDoc(collection(db, 'planning_sessions'), newSession);
      
      // Get the created session with converted timestamps
      return await this.getSessionById(docRef.id, 'weekly');
    } catch (error) {
      console.error('Error starting new session:', error);
      throw error;
    }
  }

  // Update session status
  async updateSessionStatus(sessionId: string, status: PlanningSessionStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'planning_sessions', sessionId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }

  // Update task review
  async updateTaskReview(sessionId: string, taskReview: TaskReviewItem): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');

      const taskIndex = session.reviewPhase.taskReviews.findIndex(t => t.taskId === taskReview.taskId);
      if (taskIndex === -1) {
        session.reviewPhase.taskReviews.push(taskReview);
      } else {
        session.reviewPhase.taskReviews[taskIndex] = taskReview;
      }

      // Update summary counts
      this.updateReviewSummary(session);

      await updateDoc(doc(db, 'planning_sessions', sessionId), {
        reviewPhase: session.reviewPhase,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task review:', error);
      throw error;
    }
  }

  // Add task to next week planning
  async addNextWeekTask(sessionId: string, task: NextWeekTask): Promise<void> {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) throw new Error('Session not found');

      session.planningPhase.nextPeriodTasks.push(task);

      await updateDoc(doc(db, 'planning_sessions', sessionId), {
        'planningPhase.nextPeriodTasks': session.planningPhase.nextPeriodTasks,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding next week task:', error);
      throw error;
    }
  }

  // Get tasks from monthly planning that should be included in this week
  private async getTasksFromMonthlyPlanning(contextId: string, weekStart: Date, weekEnd: Date): Promise<NextWeekTask[]> {
    try {
      // Get the current month's planning session
      const monthStart = this.getMonthStart(weekStart);
      const monthEnd = this.getMonthEnd(weekStart);
      
      const q = query(
        collection(db, 'planning_sessions'),
        where('contextId', '==', contextId),
        where('type', '==', 'monthly'),
        where('periodStartDate', '>=', monthStart.toISOString()),
        where('periodStartDate', '<=', monthEnd.toISOString())
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.log('No monthly planning session found for this period');
        return [];
      }
      
      const monthlySession = querySnapshot.docs[0].data() as PlanningSession;
      const monthlyTasks = monthlySession.planningPhase.nextPeriodTasks || [];
      
      // Filter tasks that should be worked on this week and convert project tasks
      const weekTasks: NextWeekTask[] = [];
      
      // Add monthly tasks that fall within this week
      monthlyTasks.forEach(task => {
        if (task.dueDate) {
          const taskDate = new Date(task.dueDate);
          if (taskDate >= weekStart && taskDate <= weekEnd) {
            weekTasks.push({
              taskId: task.taskId,
              priority: task.priority,
              dueDate: task.dueDate,
              timeSlot: task.timeSlot
            });
          }
        }
      });
      
      // Add project tasks from monthly planning
      if (monthlySession.planningPhase.projectPrioritization) {
        const projectTasks = await this.extractProjectTasksForWeek(
          monthlySession.planningPhase.projectPrioritization,
          weekStart,
          weekEnd
        );
        weekTasks.push(...projectTasks);
      }
      
      console.log(`Pulled ${weekTasks.length} tasks from monthly planning`);
      return weekTasks;
    } catch (error) {
      console.error('Error getting tasks from monthly planning:', error);
      return [];
    }
  }

  // Extract project tasks that should be worked on this week
  private async extractProjectTasksForWeek(
    projectPrioritization: any, 
    weekStart: Date, 
    weekEnd: Date
  ): Promise<NextWeekTask[]> {
    const weekTasks: NextWeekTask[] = [];
    
    if (projectPrioritization.activeProjects) {
      projectPrioritization.activeProjects.forEach((project: any) => {
        if (project.tasks) {
          project.tasks.forEach((task: any) => {
            // Include high priority tasks or tasks due this week
            if (task.dueDate) {
              const taskDate = new Date(task.dueDate);
              if (taskDate >= weekStart && taskDate <= weekEnd) {
                weekTasks.push({
                  taskId: task.id,
                  priority: task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low',
                  dueDate: task.dueDate
                });
              }
            } else if (task.priority === 'high') {
              // Include high priority tasks even without due dates
              weekTasks.push({
                taskId: task.id,
                priority: 'high',
                dueDate: weekEnd.toISOString() // Default to end of week
              });
            }
          });
        }
      });
    }
    
    return weekTasks;
  }

  // Get tasks for today from weekly planning (Daily Trickle-down)
  async getTodaysTasks(contextId: string, targetDate?: Date): Promise<NextWeekTask[]> {
    try {
      const today = targetDate || new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get current week's planning session
      const weekSession = await this.getCurrentWeekSession(contextId, 'system'); // Use system for lookup
      if (!weekSession) {
        console.log('No weekly planning session found for today');
        return [];
      }
      
      const weeklyTasks = weekSession.planningPhase.nextPeriodTasks || [];
      
      // Filter tasks for today
      const todaysTasks = weeklyTasks.filter(task => {
        if (task.dueDate) {
          const taskDate = task.dueDate.split('T')[0]; // Get YYYY-MM-DD part
          return taskDate === todayStr;
        }
        return false;
      });
      
      // Also include high priority tasks without specific dates (user can decide)
      const flexibleTasks = weeklyTasks.filter(task => {
        return !task.dueDate && task.priority === 'high';
      }).slice(0, 3); // Limit to 3 flexible high-priority tasks
      
      const allTodaysTasks = [...todaysTasks, ...flexibleTasks];
      console.log(`Found ${allTodaysTasks.length} tasks for today (${todayStr})`);
      
      return allTodaysTasks;
    } catch (error) {
      console.error('Error getting today\'s tasks:', error);
      return [];
    }
  }

  // Get this week's tasks from weekly planning (for weekly overview)
  async getThisWeeksTasks(contextId: string): Promise<NextWeekTask[]> {
    try {
      const weekSession = await this.getCurrentWeekSession(contextId, 'system');
      if (!weekSession) {
        console.log('No weekly planning session found');
        return [];
      }
      
      return weekSession.planningPhase.nextPeriodTasks || [];
    } catch (error) {
      console.error('Error getting this week\'s tasks:', error);
      return [];
    }
  }

  // Get unscheduled items for planning
  async getUnscheduledItems(contextId: string, sessionId?: string): Promise<UnscheduledItem[]> {
    try {
      const items: UnscheduledItem[] = [];

      // Get tasks from review phase that were pushed forward or need scheduling
      if (sessionId) {
        const session = await this.getSessionById(sessionId);
        if (session) {
          const pushedTasks = session.reviewPhase.taskReviews
            .filter(t => t.action === 'push_forward' || (!t.action && t.status === 'needs_review'))
            .map(t => ({
              id: t.taskId,
              type: 'task' as const,
              title: t.title,
              description: t.action === 'push_forward' ? 'Pushed forward from last week' : undefined,
              goalId: t.goalId,
              goalName: t.goalName,
              priority: t.priority
            }));
          
          items.push(...pushedTasks);
        }
      }

      // Get unscheduled tasks from goals
      const goals = await goalService.getGoalsByContext(contextId);
      goals.forEach(goal => {
        // Add tasks without scheduled dates
        goal.tasks.forEach(task => {
          if (!task.scheduledDate && task.status !== 'completed') {
            items.push({
              id: task.id,
              type: 'task',
              title: task.title,
              description: task.description,
              goalId: goal.id,
              goalName: goal.title,
              priority: task.priority
            });
          }
        });

        // Add milestones without target dates
        goal.milestones.forEach(milestone => {
          if (!milestone.targetDate) {
            items.push({
              id: milestone.id,
              type: 'milestone',
              title: milestone.title,
              description: milestone.description,
              goalId: goal.id,
              goalName: goal.title,
              priority: 'medium' // Default priority for milestones
            });
          }
        });
      });

      return items;
    } catch (error) {
      console.error('Error getting unscheduled items:', error);
      throw error;
    }
  }

  // Get goals that need review this week
  async getGoalsForReview(contextId: string): Promise<Goal[]> {
    try {
      const goals = await goalService.getGoalsByContext(contextId);
      const now = new Date();
      const weekStart = this.getWeekStart(now);
      const weekEnd = this.getWeekEnd(now);

      return goals.filter(goal => {
        // TODO: Add review scheduling logic based on goal properties
        // For now, return goals that haven't been reviewed recently
        return true; // Placeholder - implement actual review logic
      });
    } catch (error) {
      console.error('Error getting goals for review:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getSessionById(sessionId: string, type: PlanningSessionType = 'weekly'): Promise<PlanningSession> {
    const collectionName = 'planning_sessions';
    const docSnap = await getDoc(doc(db, collectionName, sessionId));
    if (!docSnap.exists()) throw new Error('Session not found');
    
    const data = docSnap.data();
    
    return {
      id: docSnap.id,
      ...data,
      periodStartDate: data.periodStartDate instanceof Timestamp ? data.periodStartDate.toDate().toISOString() : data.periodStartDate,
      periodEndDate: data.periodEndDate instanceof Timestamp ? data.periodEndDate.toDate().toISOString() : data.periodEndDate,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as PlanningSession;
  }

  private async getTasksForReview(contextId: string): Promise<TaskReviewItem[]> {
    try {
      const goals = await goalService.getGoalsByContext(contextId);
      const taskReviews: TaskReviewItem[] = [];

      goals.forEach(goal => {
        goal.tasks.forEach(task => {
          // Include tasks from the past week for review
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          
          const taskDate = task.scheduledDate ? new Date(task.scheduledDate) : new Date(task.createdAt);
          
          if (taskDate >= lastWeek) {
            taskReviews.push({
              taskId: task.id,
              title: task.title,
              status: task.status === 'completed' ? 'completed' : 'needs_review',
              originalDueDate: task.dueDate || task.createdAt,
              priority: task.priority,
              goalId: goal.id,
              goalName: goal.title
            });
          }
        });
      });

      return taskReviews;
    } catch (error) {
      console.error('Error getting tasks for review:', error);
      return [];
    }
  }

  private updateReviewSummary(session: WeeklyPlanningSession): void {
    const summary = session.reviewPhase.summary;
    const tasks = session.reviewPhase.taskReviews;

    summary.totalCompleted = tasks.filter(t => t.action === 'mark_completed').length;
    summary.totalPushedForward = tasks.filter(t => t.action === 'push_forward').length;
    summary.totalMissed = tasks.filter(t => t.action === 'mark_missed').length;
    summary.totalArchived = tasks.filter(t => t.action === 'archive').length;
    summary.totalClosed = tasks.filter(t => t.action === 'close').length;
  }

  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day; // Sunday = 0
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getWeekEnd(date: Date): Date {
    const end = new Date(this.getWeekStart(date));
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  // Get current month session
  async getCurrentMonthSession(contextId: string, userId: string): Promise<PlanningSession | null> {
    try {
      // Validate required parameters
      if (!contextId || !userId) {
        console.error('Invalid parameters for getCurrentMonthSession:', { contextId, userId });
        throw new Error('contextId and userId are required');
      }

      const now = new Date();
      const monthStart = this.getMonthStart(now);
      const monthEnd = this.getMonthEnd(now);

      const q = query(
        collection(db, 'planning_sessions'),
        where('contextId', '==', contextId),
        where('ownerId', '==', userId),
        where('type', '==', 'monthly'),
        where('periodStartDate', '>=', monthStart.toISOString()),
        where('periodEndDate', '<=', monthEnd.toISOString())
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.docs.length > 0) {
        const data = querySnapshot.docs[0].data();
        return {
          id: querySnapshot.docs[0].id,
          ...data,
          periodStartDate: data.periodStartDate instanceof Timestamp ? data.periodStartDate.toDate().toISOString() : data.periodStartDate,
          periodEndDate: data.periodEndDate instanceof Timestamp ? data.periodEndDate.toDate().toISOString() : data.periodEndDate,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as PlanningSession;
      }

      return null;
    } catch (error) {
      console.error('Error getting current month session:', error);
      throw error;
    }
  }

  // Start new monthly planning session
  async startNewMonthlySession(contextId: string, userId: string): Promise<PlanningSession> {
    try {
      // Validate required parameters
      if (!contextId || !userId) {
        console.error('Invalid parameters for startNewMonthlySession:', { contextId, userId });
        throw new Error('contextId and userId are required');
      }

      const now = new Date();
      const monthStart = this.getMonthStart(now);
      const monthEnd = this.getMonthEnd(now);

      const newSession = {
        ownerId: userId,
        contextId,
        type: 'monthly' as PlanningSessionType,
        periodStartDate: monthStart.toISOString(),
        periodEndDate: monthEnd.toISOString(),
        status: 'not_started' as PlanningSessionStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewPhase: {
          taskReviews: [],
          longTermGoalReviews: [],
          sharedGoalReviews: [],
          summary: {
            totalCompleted: 0,
            totalPushedForward: 0,
            totalMissed: 0,
            totalArchived: 0,
            totalClosed: 0
          },
          financialReview: {
            monthlyBudget: { income: 0, expenses: 0, savings: 0, categories: {} },
            expenditureReview: { largeExpenses: [], categoryOverages: [], savingsGoalProgress: 0 },
            upcomingBigItems: []
          },
          relationshipParentingReview: {
            relationshipGoals: [],
            parentingFocus: [],
            coupleTime: { lastMonthQuality: 5, upcomingOpportunities: [], scheduledDates: [] }
          },
          routineDelegationReview: {
            currentDelegations: [],
            newDelegationOpportunities: [],
            familyWorkloadBalance: []
          }
        },
        planningPhase: {
          nextPeriodTasks: [],
          recurringTasks: [],
          sharedGoalAssignments: [],
          calendarSyncStatus: { synced: false, syncedEvents: [] },
          projectPrioritization: { activeProjects: [], proposedProjects: [] },
          toolUpdates: [],
          shoppingListUpdates: [],
          biggerPictureConcerns: []
        }
      };

      const docRef = await addDoc(collection(db, 'planning_sessions'), newSession);
      
      // Get the created session with converted timestamps
      return await this.getSessionById(docRef.id, 'monthly');
    } catch (error) {
      console.error('Error starting new monthly session:', error);
      throw error;
    }
  }

  private getMonthStart(date: Date): Date {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getMonthEnd(date: Date): Date {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}

export const planningService = new PlanningService();
export const weeklyPlanningService = planningService; // Backward compatibility