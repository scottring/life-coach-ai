import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTasks } from '../providers/TaskProvider';
import { supabase } from '../lib/supabaseClient';

function DailyItinerary() {
  const { tasks } = useTasks();
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [preparedDocuments, setPreparedDocuments] = useState({});
  const [loading, setLoading] = useState(true);

  // Filter today's tasks
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filtered = tasks.filter(task => {
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        return deadline >= today && deadline < tomorrow;
      }
      return false;
    });

    setTodaysTasks(filtered.sort((a, b) => 
      new Date(a.deadline) - new Date(b.deadline)
    ));
  }, [tasks]);

  // Fetch prepared documents from database
  useEffect(() => {
    const fetchPreparedDocuments = async () => {
      if (todaysTasks.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Fetch prepared documents for today's tasks
        const taskIds = todaysTasks.map(t => t.id);
        const { data, error } = await supabase
          .from('prepared_documents')
          .select('*')
          .in('task_id', taskIds);

        if (error) throw error;

        // Convert to map for easy lookup
        const docsMap = {};
        data?.forEach(doc => {
          docsMap[doc.task_id] = {
            taskId: doc.task_id,
            documents: doc.documents || [],
            preparedAt: doc.prepared_at
          };
        });

        setPreparedDocuments(docsMap);
      } catch (error) {
        console.error('Error fetching prepared documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreparedDocuments();
  }, [todaysTasks]);


  const getTimeUntilTask = (deadline) => {
    const now = new Date();
    const taskTime = new Date(deadline);
    const diff = taskTime - now;
    
    if (diff < 0) return 'Past due';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      5: 'bg-red-100 text-red-800 border-red-300',
      4: 'bg-orange-100 text-orange-800 border-orange-300',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      2: 'bg-green-100 text-green-800 border-green-300',
      1: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[priority] || colors[3];
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Preparing your day...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {format(new Date(), 'EEEE, MMMM d')}
          </h1>
          <p className="text-sm text-gray-600">
            {todaysTasks.length} tasks scheduled today
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm font-medium text-gray-600">Next Task</p>
          <p className="text-lg font-semibold text-gray-900">
            {todaysTasks[0] ? getTimeUntilTask(todaysTasks[0].deadline) : 'None'}
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm font-medium text-gray-600">Prepared Docs</p>
          <p className="text-lg font-semibold text-gray-900">
            {Object.keys(preparedDocuments).length}
          </p>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="space-y-4 p-4">
        {todaysTasks.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">No tasks scheduled for today</p>
          </div>
        ) : (
          todaysTasks.map(task => {
            const docs = preparedDocuments[task.id];
            
            return (
              <div
                key={task.id}
                className={`rounded-lg bg-white p-4 shadow transition-all ${
                  getPriorityColor(task.priority)
                } border-l-4`}
              >
                {/* Task Header */}
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {task.description && (
                      <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(task.deadline), 'h:mm a')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {getTimeUntilTask(task.deadline)}
                    </p>
                  </div>
                </div>

                {/* Context and Type Badges */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    {task.context}
                  </span>
                  {docs?.taskType && docs.taskType !== 'general' && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      {docs.taskType === 'flight' && '✈️ Flight'}
                      {docs.taskType === 'hotel' && '🏨 Hotel'}
                      {docs.taskType === 'meeting' && '📅 Meeting'}
                      {docs.taskType === 'medical' && '🏥 Medical'}
                      {docs.taskType === 'dining' && '🍽️ Dining'}
                    </span>
                  )}
                </div>

                {/* Prepared Documents */}
                {docs && docs.documents.length > 0 && (
                  <div className="mt-3 rounded-md bg-gray-50 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      📋 Prepared Documents
                    </p>
                    <div className="space-y-1">
                      {docs.documents.map((doc, index) => (
                        <button
                          key={index}
                          className="block w-full rounded bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-gray-50"
                          onClick={() => {
                            // Handle document view/action
                            console.log('View document:', doc);
                          }}
                        >
                          <span className="mr-2">{doc.icon}</span>
                          <span className="font-medium">{doc.title}</span>
                          {doc.content && (
                            <span className="ml-2 text-xs text-gray-500">
                              {doc.content.substring(0, 30)}...
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                    Mark Complete
                  </button>
                  <button className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                    Reschedule
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

export default DailyItinerary;