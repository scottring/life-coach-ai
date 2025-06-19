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
  WeeklyPlanningSession, 
  TaskReviewItem, 
  UnscheduledItem, 
  NextWeekTask,
  LongTermGoalReview,
  SharedGoalReview,
  WeeklySessionStatus,
  TaskReviewAction,
  Goal,
  GoalTask
} from '../types/goals';
import { goalService } from './goalService';

class WeeklyPlanningService {
  // Get current week session or create new one
  async getCurrentWeekSession(contextId: string, userId: string): Promise<WeeklyPlanningSession | null> {
    try {
      const now = new Date();
      const weekStart = this.getWeekStart(now);
      const weekEnd = this.getWeekEnd(now);

      const q = query(
        collection(db, 'weekly_planning_sessions'),
        where('contextId', '==', contextId),
        where('ownerId', '==', userId),
        where('weekStartDate', '>=', weekStart.toISOString()),
        where('weekEndDate', '<=', weekEnd.toISOString())
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.docs.length > 0) {
        const data = querySnapshot.docs[0].data();
        return {
          id: querySnapshot.docs[0].id,
          ...data,
          weekStartDate: data.weekStartDate instanceof Timestamp ? data.weekStartDate.toDate().toISOString() : data.weekStartDate,
          weekEndDate: data.weekEndDate instanceof Timestamp ? data.weekEndDate.toDate().toISOString() : data.weekEndDate,
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

  // Start new weekly planning session
  async startNewSession(contextId: string, userId: string): Promise<WeeklyPlanningSession> {
    try {
      const now = new Date();
      const weekStart = this.getWeekStart(now);
      const weekEnd = this.getWeekEnd(now);

      // Get tasks for review from the past week
      const taskReviews = await this.getTasksForReview(contextId);

      const newSession = {
        ownerId: userId,
        contextId,
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
        status: 'not_started' as WeeklySessionStatus,
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
          nextWeekTasks: [],
          recurringTasks: [],
          sharedGoalAssignments: [],
          calendarSyncStatus: {
            synced: false,
            syncedEvents: []
          }
        }
      };

      const docRef = await addDoc(collection(db, 'weekly_planning_sessions'), newSession);
      
      // Get the created session with converted timestamps
      return await this.getSessionById(docRef.id);
    } catch (error) {
      console.error('Error starting new session:', error);
      throw error;
    }
  }

  // Update session status
  async updateSessionStatus(sessionId: string, status: WeeklySessionStatus): Promise<void> {
    try {
      await updateDoc(doc(db, 'weekly_planning_sessions', sessionId), {
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

      await updateDoc(doc(db, 'weekly_planning_sessions', sessionId), {
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

      session.planningPhase.nextWeekTasks.push(task);

      await updateDoc(doc(db, 'weekly_planning_sessions', sessionId), {
        'planningPhase.nextWeekTasks': session.planningPhase.nextWeekTasks,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding next week task:', error);
      throw error;
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
  private async getSessionById(sessionId: string): Promise<WeeklyPlanningSession> {
    const docSnap = await getDoc(doc(db, 'weekly_planning_sessions', sessionId));
    if (!docSnap.exists()) throw new Error('Session not found');
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      weekStartDate: data.weekStartDate instanceof Timestamp ? data.weekStartDate.toDate().toISOString() : data.weekStartDate,
      weekEndDate: data.weekEndDate instanceof Timestamp ? data.weekEndDate.toDate().toISOString() : data.weekEndDate,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    } as WeeklyPlanningSession;
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
}

export const weeklyPlanningService = new WeeklyPlanningService();