import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuthState } from '../hooks/useAuthState';
import { supabase } from '../lib/supabaseClient';
import { Task } from '../models/Task';
import { prioritizeTasks } from '../lib/taskPrioritizer';
import { DeduplicationService } from '../lib/deduplicationService';

// Create context
const TaskContext = createContext();

// Provider component
export const TaskProvider = ({ children }) => {
  const { user } = useAuthState();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'pending',
    context: 'all',
    search: ''
  });
  
  const userId = user?.id;
  
  // Load tasks when filters change or user changes
  useEffect(() => {
    const loadTasks = async () => {
      if (!userId) {
        setTasks(getMockTasks(filters));
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // Start with basic query
        let query = supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });
        
        // Apply filters
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        
        if (filters.context && filters.context !== 'all') {
          query = query.eq('context', filters.context);
        }
        
        if (filters.search && filters.search.trim()) {
          query = query.ilike('title', `%${filters.search}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Convert to Task models
        const fetchedTasks = (data || []).map(task => Task.fromDB(task));
        setTasks(fetchedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
        // Fall back to mock data on error
        setTasks(getMockTasks(filters));
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, [filters, userId]);
  
  // Create a new task
  const createTask = async (taskData) => {
    if (!userId) return null;
    
    try {
      const task = new Task({
        ...taskData,
        user_id: userId
      });
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([task.toDB()])
        .select()
        .single();
        
      if (error) throw error;
      
      const newTask = Task.fromDB(data);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  };

  // Create a new task with deduplication checking
  const createTaskWithDeduplication = async (taskData, source = 'manual', sourceId = null) => {
    if (!userId) return null;
    
    try {
      // Use deduplication service if source and sourceId provided
      if (source !== 'manual' && sourceId) {
        const savedTask = await DeduplicationService.createTaskIfUnique(
          userId,
          taskData,
          source,
          sourceId
        );
        
        if (savedTask) {
          const newTask = Task.fromDB(savedTask);
          setTasks(prev => [newTask, ...prev]);
          return newTask;
        } else {
          console.log('Task was identified as duplicate and not created');
          return null;
        }
      } else {
        // For manual tasks, use regular creation
        return await createTask(taskData);
      }
    } catch (error) {
      console.error('Error creating task with deduplication:', error);
      return null;
    }
  };
  
  // Update a task
  const updateTask = async (taskId, updates) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      
      const updatedTask = Task.fromDB(data);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  };
  
  // Mark a task as complete
  const completeTask = async (taskId) => {
    return updateTask(taskId, { status: 'completed' });
  };
  
  // Delete a task
  const deleteTask = async (taskId) => {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      setTasks(prev => prev.filter(task => task.id !== taskId));
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  };
  
  // Reprioritize tasks using OpenAI
  const reprioritizeTasks = async (userContext) => {
    try {
      const pendingTasks = tasks.filter(task => task.status === 'pending');
      
      if (pendingTasks.length === 0) return [];
      
      // Use OpenAI for intelligent prioritization
      const prioritizedTasks = await prioritizeTasks(pendingTasks, userContext);
      
      // Refresh tasks from database to get updated priorities
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const updatedTasks = (data || []).map(task => Task.fromDB(task));
      
      // Update local state with prioritized tasks
      setTasks(prev => prev.map(task => {
        const updated = updatedTasks.find(ut => ut.id === task.id);
        return updated || task;
      }));
      
      return prioritizedTasks;
    } catch (error) {
      console.error('Error reprioritizing tasks:', error);
      
      // Fallback to simple deadline-based prioritization
      const pendingTasks = tasks.filter(task => task.status === 'pending');
      const prioritized = pendingTasks
        .sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        })
        .map((task, index) => ({
          id: task.id,
          priority: Math.max(1, 5 - index),
          priority_reason: index < 3 ? 'High priority due to deadline' : 'Standard priority'
        }));
      
      // Update tasks in database
      for (const update of prioritized) {
        await updateTask(update.id, {
          priority: update.priority,
          priority_reason: update.priority_reason
        });
      }
      
      return prioritized;
    }
  };
  
  // Update filters
  const updateFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  // Refresh tasks from database
  const refreshTasks = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const fetchedTasks = (data || []).map(task => Task.fromDB(task));
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };
  
  // Provider value
  const value = {
    tasks,
    loading,
    filters,
    createTask,
    createTaskWithDeduplication,
    updateTask,
    completeTask,
    deleteTask,
    reprioritizeTasks,
    updateFilters,
    refreshTasks
  };
  
  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

// Custom hook to use the task context
export const useTasks = () => {
  const context = useContext(TaskContext);
  
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  
  return context;
};

// Mock data helper (fallback when no auth or Supabase errors)
function getMockTasks(filters = {}) {
  const mockTasks = [
    { 
      id: '1', 
      title: 'Complete project proposal',
      description: 'Finalize the project proposal document including budget, timeline, and deliverables.',
      priority: 5, 
      context: 'Work',
      status: 'pending',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString() 
    },
    { 
      id: '2', 
      title: 'Schedule customer interviews',
      description: 'Reach out to 5 potential customers to schedule feedback sessions.',
      priority: 4, 
      context: 'Work',
      status: 'pending',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString() 
    },
    { 
      id: '3', 
      title: 'Pick up groceries',
      description: 'Get items for dinner and weekly meal prep.',
      priority: 2, 
      context: 'Personal',
      status: 'pending',
      deadline: new Date().toISOString(),
      created_at: new Date().toISOString() 
    }
  ].map(task => Task.fromDB(task));
  
  // Apply filters
  let filteredTasks = mockTasks;
  
  if (filters.status && filters.status !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.status === filters.status);
  }
  
  if (filters.context && filters.context !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.context === filters.context);
  }
  
  if (filters.search && filters.search.trim()) {
    filteredTasks = filteredTasks.filter(task => 
      task.title.toLowerCase().includes(filters.search.toLowerCase())
    );
  }
  
  return filteredTasks;
}