// Centralized task management service for sharing tasks across views
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export interface UniversalTask {
  id: string;
  title: string;
  type: 'task' | 'event' | 'sop' | 'meal' | 'project' | 'note';
  context: 'work' | 'family' | 'personal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  
  // Scheduling
  scheduledDate?: Date;
  scheduledTime?: string;
  duration?: number;
  
  // Assignment & Metadata
  assignedTo?: string;
  createdBy: string;
  contextId: string;
  tags?: string[];
  notes?: string;
  
  // AI metadata
  confidence?: number;
  source: 'manual' | 'ai_capture' | 'import';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Firestore document ID
  docId?: string;
}

class TaskManagerService {
  private tasks: UniversalTask[] = [];
  private listeners: Set<() => void> = new Set();
  private unsubscribes: Map<string, () => void> = new Map();
  private readonly COLLECTION_NAME = 'tasks';
  private authInitialized = false;

  constructor() {
    // Start authentication initialization but don't block constructor
    this.initializeAuth().catch(console.error);
  }

  private async initializeAuth(): Promise<void> {
    if (!auth || this.authInitialized) return;
    
    return new Promise((resolve) => {
      try {
        // Listen for auth state changes
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            console.log('✅ User authenticated:', user.uid);
            this.authInitialized = true;
            resolve();
          } else {
            console.log('⚠️ User not authenticated, signing in anonymously...');
            try {
              await signInAnonymously(auth);
              console.log('✅ Anonymous sign-in successful');
            } catch (error) {
              console.error('Anonymous sign-in failed:', error);
              this.authInitialized = true; // Continue anyway
              resolve();
            }
          }
        });
      } catch (error) {
        console.error('Auth initialization failed:', error);
        this.authInitialized = true; // Continue anyway
        resolve();
      }
    });
  }

  // Subscribe to task changes
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  // Add tasks from AI capture
  async addTasksFromCapture(
    capturedItems: any[], 
    contextId: string, 
    userId: string
  ): Promise<UniversalTask[]> {
    if (!db) {
      console.warn('Firebase not available, using in-memory storage');
      return this.addTasksFromCaptureLocal(capturedItems, contextId, userId);
    }

    const newTasks: UniversalTask[] = [];
    
    for (const item of capturedItems) {
      try {
        const taskData = {
          id: item.id,
          title: item.title,
          type: item.type,
          context: item.context === 'auto-detected' ? 'personal' : item.context,
          priority: item.priority,
          status: 'pending',
          scheduledDate: item.scheduledDate ? Timestamp.fromDate(item.scheduledDate) : null,
          scheduledTime: item.scheduledTime,
          duration: item.duration,
          assignedTo: item.assignedTo,
          createdBy: userId,
          contextId,
          tags: item.tags || [],
          confidence: item.confidence,
          source: 'ai_capture',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, this.COLLECTION_NAME), taskData);
        
        const newTask: UniversalTask = {
          ...taskData,
          docId: docRef.id,
          scheduledDate: item.scheduledDate,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UniversalTask;
        
        newTasks.push(newTask);
      } catch (error) {
        console.error('Error adding task to Firestore:', error);
      }
    }
    
    return newTasks;
  }

  // Fallback for when Firebase is not available
  private addTasksFromCaptureLocal(
    capturedItems: any[], 
    contextId: string, 
    userId: string
  ): UniversalTask[] {
    const newTasks: UniversalTask[] = capturedItems.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      context: item.context === 'auto-detected' ? 'personal' : item.context,
      priority: item.priority,
      status: 'pending',
      scheduledDate: item.scheduledDate,
      scheduledTime: item.scheduledTime,
      duration: item.duration,
      assignedTo: item.assignedTo,
      createdBy: userId,
      contextId,
      tags: item.tags || [],
      confidence: item.confidence,
      source: 'ai_capture',
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    this.tasks.push(...newTasks);
    this.notifyListeners();
    
    return newTasks;
  }

  // Get all tasks
  getAllTasks(contextId?: string): UniversalTask[] {
    return contextId 
      ? this.tasks.filter(task => task.contextId === contextId)
      : this.tasks;
  }

  // Get today's tasks
  getTodayTasks(contextId: string): UniversalTask[] {
    const today = new Date();
    const todayStr = today.toDateString();
    
    return this.tasks.filter(task => 
      task.contextId === contextId && 
      (
        // Tasks scheduled for today
        (task.scheduledDate && task.scheduledDate.toDateString() === todayStr) ||
        // Overdue tasks
        (task.scheduledDate && task.scheduledDate < today && task.status !== 'completed') ||
        // Unscheduled pending tasks (show in today as well)
        (!task.scheduledDate && task.status === 'pending')
      )
    );
  }

  // Get unscheduled tasks for planning view
  getUnscheduledTasks(contextId: string): UniversalTask[] {
    return this.tasks.filter(task => 
      task.contextId === contextId && 
      !task.scheduledDate && 
      task.status === 'pending'
    );
  }

  // Get scheduled tasks for planning view (calendar events)
  getScheduledTasks(contextId: string): UniversalTask[] {
    return this.tasks.filter(task => 
      task.contextId === contextId && 
      task.scheduledDate && 
      task.status !== 'cancelled'
    );
  }

  // Update task
  async updateTask(taskId: string, updates: Partial<UniversalTask>): Promise<void> {
    if (!db) {
      console.warn('Firebase not available, using in-memory storage');
      return this.updateTaskLocal(taskId, updates);
    }

    try {
      // Find task by ID in local cache to get docId
      const task = this.tasks.find(t => t.id === taskId);
      if (!task?.docId) {
        console.error('Task not found or missing docId:', taskId);
        return;
      }

      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Convert dates to Timestamps for Firestore
      if (updates.scheduledDate) {
        updateData.scheduledDate = Timestamp.fromDate(updates.scheduledDate);
      }
      
      if (updates.status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, this.COLLECTION_NAME, task.docId), updateData);
    } catch (error) {
      console.error('Error updating task in Firestore:', error);
    }
  }

  // Fallback for when Firebase is not available
  private updateTaskLocal(taskId: string, updates: Partial<UniversalTask>): void {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = {
        ...this.tasks[taskIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      if (updates.status === 'completed') {
        this.tasks[taskIndex].completedAt = new Date();
      }
      
      this.notifyListeners();
    }
  }

  // Schedule task
  async scheduleTask(taskId: string, date: Date, time?: string): Promise<void> {
    await this.updateTask(taskId, {
      scheduledDate: date,
      scheduledTime: time
    });
  }

  // Unschedule task
  async unscheduleTask(taskId: string): Promise<void> {
    await this.updateTask(taskId, {
      scheduledDate: undefined,
      scheduledTime: undefined
    });
  }

  // Complete task
  async completeTask(taskId: string): Promise<void> {
    await this.updateTask(taskId, {
      status: 'completed'
    });
  }

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    if (!db) {
      console.warn('Firebase not available, using in-memory storage');
      this.tasks = this.tasks.filter(task => task.id !== taskId);
      this.notifyListeners();
      return;
    }

    try {
      const task = this.tasks.find(t => t.id === taskId);
      if (task?.docId) {
        await deleteDoc(doc(db, this.COLLECTION_NAME, task.docId));
      }
    } catch (error) {
      console.error('Error deleting task from Firestore:', error);
    }
  }

  // Get task by ID
  getTask(taskId: string): UniversalTask | undefined {
    return this.tasks.find(task => task.id === taskId);
  }

  // Create a single task directly
  async createTask(
    taskData: Omit<UniversalTask, 'docId' | 'createdAt' | 'updatedAt'>
  ): Promise<UniversalTask | null> {
    console.log('Creating task with data:', taskData);
    console.log('Firebase DB available:', !!db);
    
    if (!db) {
      console.warn('Firebase not available, using in-memory storage');
      const newTask: UniversalTask = {
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tasks.push(newTask);
      this.notifyListeners();
      console.log('Task created in memory:', newTask);
      return newTask;
    }

    try {
      // Clean the data - remove undefined values which Firestore doesn't allow
      const cleanedTaskData = Object.fromEntries(
        Object.entries(taskData).filter(([_, value]) => value !== undefined)
      );
      
      const firestoreData = {
        ...cleanedTaskData,
        scheduledDate: taskData.scheduledDate ? Timestamp.fromDate(taskData.scheduledDate) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), firestoreData);
      
      const newTask: UniversalTask = {
        ...taskData,
        docId: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add to local cache and notify listeners
      this.tasks.push(newTask);
      this.notifyListeners();
      
      console.log('Task created and added to cache:', newTask);
      
      return newTask;
    } catch (error) {
      console.error('Error creating task in Firestore:', error);
      console.error('Task data that failed:', taskData);
      console.error('Firebase error details:', error);
      
      // Fallback to in-memory storage if Firestore fails
      console.warn('Falling back to in-memory storage due to Firestore error');
      const newTask: UniversalTask = {
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tasks.push(newTask);
      this.notifyListeners();
      console.log('Task created in memory as fallback:', newTask);
      return newTask;
    }
  }

  // Subscribe to tasks for a specific context with real-time updates
  subscribeToTasks(contextId: string): () => void {
    if (!db) {
      console.warn('Firebase not available, no real-time updates');
      return () => {};
    }

    // If not authenticated yet, wait for it
    if (!this.authInitialized) {
      console.log('⏳ Waiting for authentication before subscribing...');
      this.initializeAuth().then(() => {
        if (this.authInitialized) {
          this.subscribeToTasks(contextId);
        }
      });
      return () => {};
    }

    // Unsubscribe from previous listener for this context
    const previousUnsubscribe = this.unsubscribes.get(contextId);
    if (previousUnsubscribe) {
      previousUnsubscribe();
    }

    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('contextId', '==', contextId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: UniversalTask[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const task: UniversalTask = {
          ...data,
          docId: doc.id,
          // Convert Firestore Timestamps back to Dates
          scheduledDate: data.scheduledDate?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || undefined
        } as UniversalTask;
        
        tasks.push(task);
      });

      // Update local cache
      this.tasks = this.tasks.filter(t => t.contextId !== contextId).concat(tasks);
      this.notifyListeners();
    }, (error) => {
      console.error('Error in task subscription:', error);
    });

    this.unsubscribes.set(contextId, unsubscribe);
    return unsubscribe;
  }

  // Load tasks initially (for contexts not yet subscribed)
  async loadTasks(contextId: string): Promise<void> {
    if (!db) {
      console.warn('Firebase not available, no data to load');
      return;
    }

    // Wait for authentication to complete
    if (!this.authInitialized) {
      console.log('⏳ Waiting for authentication...');
      await this.initializeAuth();
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('contextId', '==', contextId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const tasks: UniversalTask[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const task: UniversalTask = {
          ...data,
          docId: doc.id,
          scheduledDate: data.scheduledDate?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate() || undefined
        } as UniversalTask;
        
        tasks.push(task);
      });

      // Update local cache
      this.tasks = this.tasks.filter(t => t.contextId !== contextId).concat(tasks);
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }
}

// Export singleton instance
export const taskManager = new TaskManagerService();