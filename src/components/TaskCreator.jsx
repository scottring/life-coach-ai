import React, { useState } from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useAuthState } from '../hooks/useAuthState';

function TaskCreator({ onTaskCreated }) {
  const { createTask } = useTasks();
  const { user } = useAuthState();
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    context: 'Work',
    priority: 3
  });
  
  const [creating, setCreating] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim() || !user) return;
    
    setCreating(true);
    
    try {
      const createdTask = await createTask({
        ...newTask,
        user_id: user.id,
        status: 'pending'
      });
      
      if (createdTask) {
        // Reset form
        setNewTask({
          title: '',
          description: '',
          deadline: '',
          context: 'Work',
          priority: 3
        });
        
        // Notify parent component
        if (onTaskCreated) {
          onTaskCreated(createdTask);
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-800">Add New Task</h2>
      
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Task Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={newTask.title}
            onChange={handleInputChange}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="What needs to be done?"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={newTask.description}
            onChange={handleInputChange}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Any details about this task?"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
              Deadline (Optional)
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={newTask.deadline}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="context" className="block text-sm font-medium text-gray-700">
              Context
            </label>
            <select
              id="context"
              name="context"
              value={newTask.context}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            >
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Family">Family</option>
              <option value="Learning">Learning</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={newTask.priority}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value={5}>Highest (5)</option>
            <option value={4}>High (4)</option>
            <option value={3}>Medium (3)</option>
            <option value={2}>Low (2)</option>
            <option value={1}>Lowest (1)</option>
          </select>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={creating || !newTask.title.trim()}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
          >
            {creating ? 'Creating...' : 'Add Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskCreator;