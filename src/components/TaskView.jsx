import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import TaskList from './TaskList';

function TaskView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeContext, setActiveContext] = useState('all');
  
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', supabase.auth.user()?.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      // Apply status filter
      if (activeFilter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (activeFilter === 'completed') {
        query = query.eq('status', 'completed');
      }
      
      // Apply context filter
      if (activeContext !== 'all') {
        query = query.eq('context', activeContext);
      }
      
      const { data, error } = await query;
      
      if (!error) {
        setTasks(data || []);
      } else {
        console.error('Error fetching tasks:', error);
        // Set mock tasks for development
        setTasks([
          { 
            id: '1', 
            title: 'Finish MVP prototype', 
            priority: 5, 
            context: 'Work',
            status: 'pending',
            deadline: new Date().toISOString() 
          },
          { 
            id: '2', 
            title: 'Schedule customer interviews', 
            priority: 4, 
            context: 'Work',
            status: 'pending',
            deadline: new Date().toISOString() 
          },
          { 
            id: '3', 
            title: 'Prepare presentation for team', 
            priority: 3, 
            context: 'Work',
            status: 'pending',
            deadline: new Date().toISOString() 
          },
          { 
            id: '4', 
            title: 'Pick up groceries', 
            priority: 2, 
            context: 'Personal',
            status: 'pending',
            deadline: new Date().toISOString() 
          },
          { 
            id: '5', 
            title: 'Schedule dentist appointment', 
            priority: 3, 
            context: 'Personal',
            status: 'completed',
            deadline: new Date().toISOString() 
          }
        ]);
      }
      
      setLoading(false);
    };
    
    fetchTasks();
  }, [activeFilter, activeContext]);
  
  const handleStatusChange = (taskId, newStatus) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        
        <div className="flex space-x-4">
          <div>
            <select
              value={activeContext}
              onChange={(e) => setActiveContext(e.target.value)}
              className="rounded border-gray-300 text-sm"
            >
              <option value="all">All Contexts</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
              <option value="Family">Family</option>
              <option value="Learning">Learning</option>
            </select>
          </div>
          
          <div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="rounded border-gray-300 text-sm"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        {loading ? (
          <div className="text-center text-gray-500">Loading tasks...</div>
        ) : (
          <TaskList 
            tasks={tasks} 
            onStatusChange={handleStatusChange} 
            showAddTask={true}
          />
        )}
      </div>
    </div>
  );
}

export default TaskView;