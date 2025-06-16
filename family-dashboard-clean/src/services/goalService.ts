import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Goal, 
  Project, 
  Milestone, 
  GoalTask, 
  GoalStatus, 
  GoalProgress, 
  GoalMetrics,
  GoalFilters,
  SchedulableItem,
  TaskStatus,
  MilestoneStatus,
  ProjectStatus
} from '../types/goals';

// Utility function to clean data before saving to Firestore
const cleanData = (data: any): any => {
  if (data === null || data === undefined) return null;
  
  if (Array.isArray(data)) {
    return data.map(cleanData).filter(item => item !== undefined);
  }
  
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanData(value);
      }
    }
    return cleaned;
  }
  
  return data;
};

// Convert Firestore timestamps to ISO strings
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate().toISOString();
    }
  });
  
  return converted;
};

class GoalService {
  // Goals CRUD
  async createGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const cleanedData = cleanData({
        ...goalData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, 'goals'), cleanedData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<void> {
    try {
      const cleanedUpdates = cleanData({
        ...updates,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'goals', goalId), cleanedUpdates);
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  async deleteGoal(goalId: string): Promise<void> {
    try {
      // Delete all related projects, milestones, and tasks
      await this.deleteGoalCascade(goalId);
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  async getGoalById(goalId: string): Promise<Goal | null> {
    try {
      const docSnap = await getDoc(doc(db, 'goals', goalId));
      if (!docSnap.exists()) return null;

      const data = convertTimestamps(docSnap.data());
      return { id: docSnap.id, ...data } as Goal;
    } catch (error) {
      console.error('Error fetching goal:', error);
      throw error;
    }
  }

  async getGoalsByContext(contextId: string, filters?: GoalFilters): Promise<Goal[]> {
    try {
      let q = query(
        collection(db, 'goals'),
        where('contextId', '==', contextId)
      );

      if (filters?.status && filters.status.length > 0) {
        q = query(q, where('status', 'in', filters.status));
      }

      const querySnapshot = await getDocs(q);
      let goals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as Goal[];

      // Apply additional filters in memory
      if (filters) {
        goals = this.applyFilters(goals, filters);
      }

      return goals;
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }

  // Projects CRUD
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const cleanedData = cleanData({
        ...projectData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, 'projects'), cleanedData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const cleanedUpdates = cleanData({
        ...updates,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'projects', projectId), cleanedUpdates);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async getProjectsByContext(contextId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, 'projects'),
        where('contextId', '==', contextId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as Project[];
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  // Milestones CRUD
  async createMilestone(milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const cleanedData = cleanData({
        ...milestoneData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, 'milestones'), cleanedData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }

  async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<void> {
    try {
      const cleanedUpdates = cleanData({
        ...updates,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'milestones', milestoneId), cleanedUpdates);
    } catch (error) {
      console.error('Error updating milestone:', error);
      throw error;
    }
  }

  async getMilestonesByContext(contextId: string): Promise<Milestone[]> {
    try {
      const q = query(
        collection(db, 'milestones'),
        where('contextId', '==', contextId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as Milestone[];
    } catch (error) {
      console.error('Error fetching milestones:', error);
      throw error;
    }
  }

  // Tasks CRUD
  async createTask(taskData: Omit<GoalTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const cleanedData = cleanData({
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const docRef = await addDoc(collection(db, 'goal_tasks'), cleanedData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<GoalTask>): Promise<void> {
    try {
      const cleanedUpdates = cleanData({
        ...updates,
        updatedAt: serverTimestamp()
      });

      if (updates.status === 'completed' && !updates.completedAt) {
        cleanedUpdates.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'goal_tasks', taskId), cleanedUpdates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async getTasksByContext(contextId: string): Promise<GoalTask[]> {
    try {
      const q = query(
        collection(db, 'goal_tasks'),
        where('contextId', '==', contextId)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as GoalTask[];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  // Get unscheduled items for sidebar
  async getUnscheduledItems(contextId: string): Promise<SchedulableItem[]> {
    try {
      const [tasks, milestones] = await Promise.all([
        this.getTasksByContext(contextId),
        this.getMilestonesByContext(contextId)
      ]);

      const unscheduledItems: SchedulableItem[] = [];

      // Add unscheduled tasks
      tasks
        .filter(task => !task.scheduledDate && task.status !== 'completed')
        .forEach(task => {
          unscheduledItems.push({
            id: task.id,
            type: 'task',
            title: task.title,
            description: task.description,
            estimatedDuration: task.estimatedDuration,
            priority: task.priority,
            assignedTo: task.assignedTo,
            dueDate: task.dueDate,
            goalId: task.goalId,
            projectId: task.projectId,
            milestoneId: task.milestoneId,
            canSchedule: true,
            isRecurring: task.isRecurring,
            contextId: task.contextId,
            tags: task.tags || []
          });
        });

      // Add milestones that aren't fully scheduled
      milestones
        .filter(milestone => milestone.status !== 'completed')
        .forEach(milestone => {
          unscheduledItems.push({
            id: milestone.id,
            type: 'milestone',
            title: milestone.title,
            description: milestone.description,
            estimatedDuration: 60, // Default 1 hour for milestone review
            priority: 'high',
            dueDate: milestone.targetDate,
            goalId: milestone.goalId,
            projectId: milestone.projectId,
            canSchedule: true,
            isRecurring: false,
            contextId: milestone.contextId
          });
        });

      return this.sortSchedulableItems(unscheduledItems);
    } catch (error) {
      console.error('Error fetching unscheduled items:', error);
      throw error;
    }
  }

  // Get recurring scheduled items
  async getRecurringScheduledItems(contextId: string): Promise<GoalTask[]> {
    try {
      const tasks = await this.getTasksByContext(contextId);
      return tasks.filter(task => 
        task.isRecurring && 
        task.recurringPattern && 
        task.status !== 'completed' &&
        task.status !== 'cancelled'
      );
    } catch (error) {
      console.error('Error fetching recurring items:', error);
      throw error;
    }
  }

  // Auto-schedule recurring tasks for a specific week
  generateRecurringEvents(recurringTasks: GoalTask[], weekStart: string): any[] {
    const events: any[] = [];
    const startDate = new Date(weekStart);

    recurringTasks.forEach(task => {
      if (!task.recurringPattern || !task.scheduledTime) return;

      const pattern = task.recurringPattern;
      
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dayOfWeek = currentDate.getDay();

        let shouldSchedule = false;

        if (pattern.frequency === 'daily') {
          shouldSchedule = true;
        } else if (pattern.frequency === 'weekly' && pattern.daysOfWeek) {
          shouldSchedule = pattern.daysOfWeek.includes(dayOfWeek);
        }

        if (shouldSchedule) {
          const endTime = this.calculateEndTime(task.scheduledTime, task.estimatedDuration);
          
          events.push({
            id: `recurring-${task.id}-${currentDate.toISOString().split('T')[0]}`,
            title: task.title,
            description: task.description,
            date: currentDate.toISOString().split('T')[0],
            startTime: task.scheduledTime,
            endTime: endTime,
            duration: task.estimatedDuration,
            type: 'recurring_task',
            taskId: task.id,
            goalId: task.goalId,
            projectId: task.projectId,
            milestoneId: task.milestoneId,
            assignedTo: task.assignedTo,
            priority: task.priority,
            color: this.getPriorityColor(task.priority),
            contextId: task.contextId,
            canEdit: true,
            canDelete: true,
            isRecurring: true
          });
        }
      }
    });

    return events;
  }

  // Schedule a task to a specific time slot
  async scheduleTask(taskId: string, date: string, time: string): Promise<void> {
    try {
      await this.updateTask(taskId, {
        scheduledDate: date,
        scheduledTime: time,
        status: 'in_progress'
      });
    } catch (error) {
      console.error('Error scheduling task:', error);
      throw error;
    }
  }

  // Utility functions
  private applyFilters(goals: Goal[], filters: GoalFilters): Goal[] {
    return goals.filter(goal => {
      if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(goal.priority)) {
        return false;
      }
      
      if (filters.category && filters.category.length > 0 && !filters.category.includes(goal.category)) {
        return false;
      }
      
      if (filters.assignedTo && filters.assignedTo.length > 0) {
        const hasAssignedMember = goal.assignedMembers.some(member => 
          filters.assignedTo!.includes(member)
        );
        if (!hasAssignedMember) return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          goal.title.toLowerCase().includes(searchLower) ||
          (goal.description && goal.description.toLowerCase().includes(searchLower)) ||
          goal.tags.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }

  private sortSchedulableItems(items: SchedulableItem[]): SchedulableItem[] {
    return items.sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // Finally by title
      return a.title.localeCompare(b.title);
    });
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  }

  private async deleteGoalCascade(goalId: string): Promise<void> {
    // Delete all projects, milestones, and tasks related to this goal
    const [projects, milestones, tasks] = await Promise.all([
      this.getProjectsByContext(''), // We'll need to filter by goalId
      this.getMilestonesByContext(''),
      this.getTasksByContext('')
    ]);

    // Note: In a real implementation, you'd want to use Firestore's batch operations
    // For now, we'll do individual deletes
    const deletePromises: Promise<void>[] = [];

    projects.filter(p => p.goalId === goalId).forEach(project => {
      deletePromises.push(deleteDoc(doc(db, 'projects', project.id)));
    });

    milestones.filter(m => m.goalId === goalId).forEach(milestone => {
      deletePromises.push(deleteDoc(doc(db, 'milestones', milestone.id)));
    });

    tasks.filter(t => t.goalId === goalId).forEach(task => {
      deletePromises.push(deleteDoc(doc(db, 'goal_tasks', task.id)));
    });

    await Promise.all(deletePromises);
  }

  // Get tasks with specific tag
  async getTasksWithTag(contextId: string, tag: string): Promise<SchedulableItem[]> {
    try {
      const tasks = await this.getTasksByContext(contextId);
      return tasks
        .filter(task => task.tags?.includes(tag))
        .map(task => ({
          id: task.id,
          type: 'task' as const,
          title: task.title,
          description: task.description,
          estimatedDuration: task.estimatedDuration,
          priority: task.priority,
          assignedTo: task.assignedTo,
          dueDate: task.dueDate,
          scheduledDate: task.scheduledDate,
          scheduledTime: task.scheduledTime,
          goalId: task.goalId,
          projectId: task.projectId,
          milestoneId: task.milestoneId,
          canSchedule: true,
          isRecurring: task.isRecurring,
          contextId: task.contextId,
          tags: task.tags || [],
          status: task.status
        }));
    } catch (error) {
      console.error('Error getting tasks with tag:', error);
      throw error;
    }
  }

  // Get schedulable tasks (for dashboard)
  async getSchedulableTasks(contextId: string): Promise<SchedulableItem[]> {
    try {
      const tasks = await this.getTasksByContext(contextId);
      return tasks.map(task => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        description: task.description,
        estimatedDuration: task.estimatedDuration,
        priority: task.priority,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        scheduledDate: task.scheduledDate,
        scheduledTime: task.scheduledTime,
        goalId: task.goalId,
        projectId: task.projectId,
        milestoneId: task.milestoneId,
        canSchedule: true,
        isRecurring: task.isRecurring,
        contextId: task.contextId,
        tags: task.tags || [],
        status: task.status
      }));
    } catch (error) {
      console.error('Error getting schedulable tasks:', error);
      throw error;
    }
  }
}

export const goalService = new GoalService();