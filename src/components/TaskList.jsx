import React, { useState } from 'react';
import Task from './Task';
import { supabase } from '../lib/supabaseClient';

function TaskList({ tasks: initialTasks, limit, showAddTask = true }) {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  
  const handleStatusChange = (taskId, newStatus) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };
  
  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) return;
    
    setAddingTask(true);
    
    try {
      // Add task to Supabase
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: supabase.auth.user()?.id,
            title: newTaskTitle,
            status: 'pending',
            source: 'manual',
            priority: 3, // Default medium priority
            context: 'Work', // Default context
            created_at: new Date(),
            updated_at: new Date()
          }
        ])
        .select();
        
      if (error) throw error;
      
      if (data) {
        setTasks([...tasks, data[0]]);
        setNewTaskTitle('');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      
      // For development, create a mock task
      const mockTask = {
        id: `mock-${Date.now()}`,
        title: newTaskTitle,
        status: 'pending',
        priority: 3,
        context: 'Work',
        source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setTasks([...tasks, mockTask]);
      setNewTaskTitle('');
    } finally {
      setAddingTask(false);
    }
  };
  
  const displayTasks = limit ? tasks.slice(0, limit) : tasks;

  return (
    <div className="task-list space-y-4">
      {displayTasks.length === 0 ? (
        <p className="text-center text-gray-500">No tasks to display</p>
      ) : (
        displayTasks.map(task => (
          <Task 
            key={task.id} 
            task={task} 
            onStatusChange={handleStatusChange} 
          />
        ))
      )}
      
      {showAddTask && (
        <form onSubmit={handleAddTask} className="mt-4">
          <div className="flex rounded border border-gray-300">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full rounded-l border-none p-2 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="rounded-r bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {addingTask ? '...' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Add Task component to TaskList for usage in other components
TaskList.Task = Task;

export default TaskList;