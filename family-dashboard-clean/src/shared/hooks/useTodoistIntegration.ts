import { useState, useEffect, useCallback } from 'react';
import { todoistService, TodoistTask, TodoistProject } from '../services/todoistService';

/**
 * Enhanced Todoist Integration Hook with Persistent Connection
 * 
 * Features:
 * - Automatically restores connection from localStorage on page refresh
 * - Persists API token, selected project, and connection status
 * - Graceful error handling and connection recovery
 * - Smart loading states and connection status tracking
 * 
 * localStorage keys used:
 * - 'todoist_api_token': The user's Todoist API token
 * - 'todoist_selected_project': The currently selected project ID
 * - 'todoist_connection_status': Tracks if connection was previously successful
 */

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
  const [loading, setLoading] = useState(true); // Start as loading to show we're checking connection
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async (): Promise<void> => {
    try {
      const projectList = await todoistService.getProjects();
      setProjects(projectList);
      
      // Auto-select the first project if none selected and projects exist
      setSelectedProjectState(prev => {
        if (!prev && projectList.length > 0) {
          return projectList[0].id;
        }
        return prev;
      });
      setError(null);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    }
  }, []);

  const refreshTasks = useCallback(async (): Promise<void> => {
    try {
      const taskList = await todoistService.getTasks(selectedProject || undefined);
      // Filter to active tasks only
      setTasks(taskList.filter(task => !task.is_completed));
      setError(null);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
    }
  }, [selectedProject]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await todoistService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        // Save connection status to localStorage
        localStorage.setItem('todoist_connection_status', 'connected');
        
        try {
          const projectList = await todoistService.getProjects();
          setProjects(projectList);
          
          // Auto-select the first project if none selected and projects exist
          setSelectedProjectState(prev => {
            const newProject = prev || (projectList.length > 0 ? projectList[0].id : '');
            if (newProject && newProject !== prev) {
              localStorage.setItem('todoist_selected_project', newProject);
            }
            return newProject;
          });
          
          // Load tasks for the selected project
          const currentProject = selectedProject || (projectList.length > 0 ? projectList[0].id : undefined);
          if (currentProject) {
            const taskList = await todoistService.getTasks(currentProject);
            setTasks(taskList.filter(task => !task.is_completed));
          }
          
          setError(null);
        } catch (err) {
          console.error('Error loading Todoist data:', err);
          setError('Failed to load projects and tasks');
        }
      } else {
        // Remove connection status if not connected
        localStorage.removeItem('todoist_connection_status');
      }
      
      setLoading(false);
      return connected;
    } catch (err) {
      console.error('Todoist connection test failed:', err);
      setIsConnected(false);
      setError('Failed to connect to Todoist');
      localStorage.removeItem('todoist_connection_status');
      setLoading(false);
      return false;
    }
  }, [selectedProject]);

  // Initialize connection on mount
  useEffect(() => {
    const initializeConnection = async () => {
      setLoading(true);
      
      const savedToken = localStorage.getItem('todoist_api_token');
      const savedProject = localStorage.getItem('todoist_selected_project');
      const lastConnectionStatus = localStorage.getItem('todoist_connection_status');
      
      if (savedProject) {
        setSelectedProjectState(savedProject);
      }
      
      if (savedToken) {
        todoistService.setApiToken(savedToken);
        
        // If we had a successful connection before, try to reconnect
        if (lastConnectionStatus === 'connected') {
          const connected = await testConnection();
          if (connected) {
            console.log('Todoist: Successfully restored connection from localStorage');
          } else {
            console.log('Todoist: Failed to restore connection, token may be invalid');
            localStorage.removeItem('todoist_connection_status');
          }
        } else {
          // Just test the connection without trying to load data
          await testConnection();
        }
      } else {
        setLoading(false);
      }
    };
    
    initializeConnection();
  }, [testConnection]);

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
        localStorage.removeItem('todoist_connection_status');
      } else {
        localStorage.setItem('todoist_connection_status', 'connected');
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
    localStorage.removeItem('todoist_selected_project');
    localStorage.removeItem('todoist_connection_status');
    setIsConnected(false);
    setTasks([]);
    setProjects([]);
    setSelectedProjectState('');
    setError(null);
    setLoading(false);
  }, []);


  const setSelectedProject = useCallback((projectId: string) => {
    setSelectedProjectState(projectId);
    localStorage.setItem('todoist_selected_project', projectId);
  }, []);

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
      const loadTasks = async () => {
        try {
          const taskList = await todoistService.getTasks(selectedProject);
          setTasks(taskList.filter(task => !task.is_completed));
          setError(null);
        } catch (err) {
          console.error('Error loading tasks:', err);
          setError('Failed to load tasks');
        }
      };
      loadTasks();
    }
  }, [selectedProject, isConnected]);

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