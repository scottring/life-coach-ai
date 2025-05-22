import React, { useState } from 'react';
import { useFamily } from '../providers/FamilyProvider';

function FamilyTasks({ familyId }) {
  const {
    familyTasks,
    familyMembers,
    loading,
    error,
    createFamilyTask,
    updateFamilyTask
  } = useFamily();

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    is_recurring: false,
    recurrence_pattern: null
  });

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await createFamilyTask({
        family_id: familyId,
        ...newTask,
        assigned_to: newTask.assigned_to || null,
        due_date: newTask.due_date || null
      });
      setNewTask({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        priority: 'medium',
        is_recurring: false,
        recurrence_pattern: null
      });
      setShowAddTask(false);
    } catch (err) {
      console.error('Error creating family task:', err);
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await updateFamilyTask(task.id, {
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null
      });
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAssigneeName = (userId) => {
    const member = familyMembers.find(m => m.user_id === userId);
    return member ? `User ${member.user_id.substring(0, 8)}` : 'Unassigned';
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-red-800">Error loading family tasks: {error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Shared Family Tasks</h3>
            <p className="text-sm text-gray-500">Tasks and chores for the whole family</p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      <div className="p-4">
        {showAddTask && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add New Family Task</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assign to</label>
                  <select
                    value={newTask.assigned_to}
                    onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Anyone</option>
                    {familyMembers.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        User {member.user_id.substring(0, 8)} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddTask}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Add Task
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {familyTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No family tasks yet</div>
              <p className="text-sm text-gray-400 mt-1">Add a task to get started with family collaboration</p>
            </div>
          ) : (
            familyTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg border p-4 ${task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.is_recurring && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                            <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <p className={`mt-1 text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>Assigned to: {getAssigneeName(task.assigned_to)}</span>
                      {task.due_date && (
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                      {task.completed_at && (
                        <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default FamilyTasks;