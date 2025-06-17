import React, { useState, useEffect } from 'react';
import { taskManager } from '../services/taskManagerService';
import { db, hasFirebaseCredentials } from '../services/firebase';

interface TaskDebuggerProps {
  contextId: string;
}

export const TaskDebugger: React.FC<TaskDebuggerProps> = ({ contextId }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = () => {
      const allTasks = taskManager.getAllTasks(contextId);
      const todayTasks = taskManager.getTodayTasks(contextId);
      const unscheduledTasks = taskManager.getUnscheduledTasks(contextId);
      
      setTasks([
        { label: 'All Tasks', count: allTasks.length, tasks: allTasks },
        { label: 'Today Tasks', count: todayTasks.length, tasks: todayTasks },
        { label: 'Unscheduled Tasks', count: unscheduledTasks.length, tasks: unscheduledTasks }
      ]);
      setLoading(false);
      
      console.log('Task Debug Info:', {
        all: allTasks,
        today: todayTasks,
        unscheduled: unscheduledTasks
      });
    };

    // Load initially
    loadTasks();

    // Subscribe to changes
    const unsubscribe = taskManager.subscribe(loadTasks);
    
    return unsubscribe;
  }, [contextId]);

  if (loading) return <div>Loading debug info...</div>;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <h3 className="font-bold text-yellow-800 mb-2">🐛 Task Debug Info</h3>
      
      {/* Firebase Status */}
      <div className="mb-3 p-2 bg-white rounded text-sm">
        <strong>Firebase Status:</strong>
        <div className="ml-2">
          <div>Has Credentials: {hasFirebaseCredentials ? '✅' : '❌'}</div>
          <div>DB Connection: {db ? '✅' : '❌'}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        {tasks.map((category, index) => (
          <div key={index} className="text-sm">
            <strong className="text-yellow-700">{category.label}:</strong> 
            <span className="ml-2">{category.count} tasks</span>
            {category.tasks.length > 0 && (
              <div className="ml-4 mt-1 text-xs">
                {category.tasks.slice(0, 3).map((task: any) => (
                  <div key={task.id} className="text-gray-600">
                    • {task.title} ({task.status}) {task.type === 'sop' ? '📋' : ''}
                  </div>
                ))}
                {category.tasks.length > 3 && (
                  <div className="text-gray-500">... and {category.tasks.length - 3} more</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded"
      >
        Refresh Page
      </button>
    </div>
  );
};