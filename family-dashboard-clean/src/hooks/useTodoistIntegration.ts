import { useState, useEffect, useCallback } from 'react';
import { todoistService, TodoistTask, TodoistProject } from '../services/todoistService';

export interface UseTodoistIntegrationReturn {
  isConnected: boolean;
  tasks: TodoistTask[];
  projects: TodoistProject[];
  selectedProject: string;
  loading: boolean;
  error: string | null;
  connectTodoist: (apiToken: string) => Promise<boolean>;
  disconnectTodoist: () => void;
  setSelectedProject: (projectId: string) => void;
  refreshTasks: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  createTask: (content: string, options?: {
    description?: string;
    dueDate?: string;
    priority?: 1 | 2 | 3 | 4;
    labels?: string[];
  }) => Promise<TodoistTask | null>;
  completeTask: (taskId: string) => Promise<boolean>;
  testConnection: () => Promise<boolean>;
}

export function useTodoistIntegration(): UseTodoistIntegrationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState<TodoistTask[]>([]);
  const [projects, setProjects] = useState<TodoistProject[]>([]);
  const [selectedProject, setSelectedProjectState] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize connection on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('todoist_api_token');
    if (savedToken) {
      todoistService.setApiToken(savedToken);
      testConnection();
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await todoistService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        await refreshProjects();
        await refreshTasks();
      }
      
      return connected;
    } catch (err) {
      console.error('Todoist connection test failed:', err);
      setIsConnected(false);
      setError('Failed to connect to Todoist');
      return false;
    }
  }, []);

  const connectTodoist = useCallback(async (apiToken: string): Promise<boolean> => {
    if (!apiToken.trim()) {
      setError('API token is required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Save token and configure service
      localStorage.setItem('todoist_api_token', apiToken);
      todoistService.setApiToken(apiToken);
      
      // Test the connection
      const connected = await testConnection();
      
      if (!connected) {
        setError('Invalid API token. Please check and try again.');
        localStorage.removeItem('todoist_api_token');
      }
      
      return connected;
    } catch (err) {
      setError('Failed to connect to Todoist. Please check your API token.');
      setIsConnected(false);
      localStorage.removeItem('todoist_api_token');
      return false;
    } finally {
      setLoading(false);
    }
  }, [testConnection]);

  const disconnectTodoist = useCallback(() => {
    localStorage.removeItem('todoist_api_token');
    setIsConnected(false);
    setTasks([]);
    setProjects([]);
    setSelectedProjectState('');
    setError(null);
  }, []);

  const refreshProjects = useCallback(async (): Promise<void> => {
    if (!isConnected) return;

    setLoading(true);
    try {
      const projectList = await todoistService.getProjects();
      setProjects(projectList);
      
      // Auto-select the first project if none selected
      if (!selectedProject && projectList.length > 0) {
        setSelectedProjectState(projectList[0].id);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedProject]);

  const refreshTasks = useCallback(async (): Promise<void> => {
    if (!isConnected) return;

    setLoading(true);
    try {
      const taskList = await todoistService.getTasks(selectedProject || undefined);
      // Filter to active tasks only
      setTasks(taskList.filter(task => !task.is_completed));
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [isConnected, selectedProject]);

  const setSelectedProject = useCallback((projectId: string) => {
    setSelectedProjectState(projectId);
    // Auto-refresh tasks when project changes
    if (isConnected) {
      refreshTasks();
    }
  }, [isConnected, refreshTasks]);

  const createTask = useCallback(async (
    content: string, 
    options: {
      description?: string;
      dueDate?: string;
      priority?: 1 | 2 | 3 | 4;
      labels?: string[];
    } = {}
  ): Promise<TodoistTask | null> => {
    if (!isConnected) {
      setError('Not connected to Todoist');
      return null;
    }

    try {
      const task = await todoistService.createTask({
        content,
        description: options.description,
        project_id: selectedProject || undefined,
        due_date: options.dueDate,
        priority: options.priority || 1,
        labels: options.labels || []
      });

      // Refresh tasks to include the new one
      await refreshTasks();
      setError(null);
      return task;
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
      return null;
    }
  }, [isConnected, selectedProject, refreshTasks]);

  const completeTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!isConnected) {
      setError('Not connected to Todoist');
      return false;
    }

    try {
      const success = await todoistService.completeTask(taskId);
      if (success) {
        // Remove the completed task from our local state
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        setError(null);
      }
      return success;
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to complete task');
      return false;
    }
  }, [isConnected]);

  // Refresh tasks when selected project changes
  useEffect(() => {
    if (isConnected && selectedProject) {
      refreshTasks();
    }
  }, [selectedProject, isConnected, refreshTasks]);

  return {
    isConnected,
    tasks,
    projects,
    selectedProject,
    loading,
    error,
    connectTodoist,
    disconnectTodoist,
    setSelectedProject,
    refreshTasks,
    refreshProjects,
    createTask,
    completeTask,
    testConnection
  };
}