import axios from 'axios';

// Todoist API Integration Service
const TODOIST_API_BASE_URL = 'https://api.todoist.com/rest/v2';

export interface TodoistTask {
  id: string;
  content: string;
  description?: string;
  project_id: string;
  section_id?: string;
  parent_id?: string;
  order: number;
  labels: string[];
  priority: 1 | 2 | 3 | 4; // 1 = normal, 4 = urgent
  due?: {
    date: string;
    string: string;
    datetime?: string;
    timezone?: string;
    recurring?: boolean;
  };
  url: string;
  comment_count: number;
  created_at: string;
  creator_id: string;
  assignee_id?: string;
  assigner_id?: string;
  is_completed: boolean;
}

export interface TodoistProject {
  id: string;
  name: string;
  comment_count: number;
  order: number;
  color: string;
  is_shared: boolean;
  is_favorite: boolean;
  is_inbox_project: boolean;
  is_team_inbox: boolean;
  view_style: string;
  url: string;
  parent_id?: string;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number;
  is_favorite: boolean;
}

export interface CreateTaskRequest {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  parent_id?: string;
  order?: number;
  labels?: string[];
  priority?: 1 | 2 | 3 | 4;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  assignee_id?: string;
}

class TodoistService {
  private apiToken: string | null = null;

  constructor() {
    this.apiToken = process.env.REACT_APP_TODOIST_API_TOKEN || null;
  }

  setApiToken(token: string) {
    this.apiToken = token;
  }

  private getHeaders() {
    if (!this.apiToken) {
      throw new Error('Todoist API token not configured. Please set REACT_APP_TODOIST_API_TOKEN in your environment variables or call setApiToken().');
    }
    
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Get all projects
  async getProjects(): Promise<TodoistProject[]> {
    try {
      const response = await axios.get(`${TODOIST_API_BASE_URL}/projects`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Todoist projects:', error);
      throw error;
    }
  }

  // Get all active tasks
  async getTasks(projectId?: string, labelId?: string, filter?: string): Promise<TodoistTask[]> {
    try {
      const params: any = {};
      if (projectId) params.project_id = projectId;
      if (labelId) params.label_id = labelId;
      if (filter) params.filter = filter;

      const response = await axios.get(`${TODOIST_API_BASE_URL}/tasks`, {
        headers: this.getHeaders(),
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Todoist tasks:', error);
      throw error;
    }
  }

  // Get a specific task
  async getTask(taskId: string): Promise<TodoistTask> {
    try {
      const response = await axios.get(`${TODOIST_API_BASE_URL}/tasks/${taskId}`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Todoist task:', error);
      throw error;
    }
  }

  // Create a new task
  async createTask(task: CreateTaskRequest): Promise<TodoistTask> {
    try {
      const response = await axios.post(`${TODOIST_API_BASE_URL}/tasks`, task, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Todoist task:', error);
      throw error;
    }
  }

  // Update a task
  async updateTask(taskId: string, updates: Partial<CreateTaskRequest>): Promise<TodoistTask> {
    try {
      const response = await axios.post(`${TODOIST_API_BASE_URL}/tasks/${taskId}`, updates, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error updating Todoist task:', error);
      throw error;
    }
  }

  // Complete a task
  async completeTask(taskId: string): Promise<boolean> {
    try {
      await axios.post(`${TODOIST_API_BASE_URL}/tasks/${taskId}/close`, {}, {
        headers: this.getHeaders()
      });
      return true;
    } catch (error) {
      console.error('Error completing Todoist task:', error);
      throw error;
    }
  }

  // Reopen a task
  async reopenTask(taskId: string): Promise<boolean> {
    try {
      await axios.post(`${TODOIST_API_BASE_URL}/tasks/${taskId}/reopen`, {}, {
        headers: this.getHeaders()
      });
      return true;
    } catch (error) {
      console.error('Error reopening Todoist task:', error);
      throw error;
    }
  }

  // Delete a task
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await axios.delete(`${TODOIST_API_BASE_URL}/tasks/${taskId}`, {
        headers: this.getHeaders()
      });
      return true;
    } catch (error) {
      console.error('Error deleting Todoist task:', error);
      throw error;
    }
  }

  // Get all labels
  async getLabels(): Promise<TodoistLabel[]> {
    try {
      const response = await axios.get(`${TODOIST_API_BASE_URL}/labels`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Todoist labels:', error);
      throw error;
    }
  }

  // Helper method to create meal planning tasks
  async createMealPlanningTask(mealName: string, date: string, familyId: string, projectId?: string): Promise<TodoistTask> {
    const taskContent = `Prepare ${mealName}`;
    const taskDescription = `Meal planning task for family ${familyId}`;
    
    const task: CreateTaskRequest = {
      content: taskContent,
      description: taskDescription,
      due_date: date,
      labels: ['meal-planning', 'family'],
      priority: 2
    };

    if (projectId) {
      task.project_id = projectId;
    }

    return this.createTask(task);
  }

  // Helper method to create shopping list tasks
  async createShoppingListTask(items: string[], familyId: string, projectId?: string): Promise<TodoistTask> {
    const taskContent = `Shopping: ${items.length} items`;
    const taskDescription = `Shopping list:\n${items.map(item => `• ${item}`).join('\n')}`;
    
    const task: CreateTaskRequest = {
      content: taskContent,
      description: taskDescription,
      labels: ['shopping', 'family'],
      priority: 3
    };

    if (projectId) {
      task.project_id = projectId;
    }

    return this.createTask(task);
  }

  // Helper method to sync family tasks
  async syncFamilyTasks(familyTasks: any[], familyId: string, projectId?: string): Promise<TodoistTask[]> {
    const createdTasks: TodoistTask[] = [];

    for (const familyTask of familyTasks) {
      try {
        const task: CreateTaskRequest = {
          content: familyTask.title || familyTask.name,
          description: familyTask.description || `Family task for ${familyId}`,
          due_date: familyTask.dueDate,
          priority: this.mapPriorityToTodoist(familyTask.priority),
          labels: ['family', ...(familyTask.labels || [])]
        };

        if (projectId) {
          task.project_id = projectId;
        }

        const createdTask = await this.createTask(task);
        createdTasks.push(createdTask);
      } catch (error) {
        console.error(`Error creating task for ${familyTask.title}:`, error);
      }
    }

    return createdTasks;
  }

  // Helper method to map priority levels
  private mapPriorityToTodoist(priority: string | number): 1 | 2 | 3 | 4 {
    if (typeof priority === 'string') {
      switch (priority.toLowerCase()) {
        case 'urgent':
        case 'high':
          return 4;
        case 'medium':
          return 3;
        case 'low':
          return 2;
        default:
          return 1;
      }
    }
    
    // Assume numeric priority 1-4
    return Math.max(1, Math.min(4, priority || 1)) as 1 | 2 | 3 | 4;
  }

  // Test connection to Todoist
  async testConnection(): Promise<boolean> {
    try {
      await this.getProjects();
      return true;
    } catch (error) {
      console.error('Todoist connection test failed:', error);
      return false;
    }
  }
}

export const todoistService = new TodoistService();