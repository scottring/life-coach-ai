import React, { useState } from 'react';
import { useTaskDeduplication } from '../hooks/useTaskDeduplication';

export default function DuplicateTaskManager({ tasks, userId, onTasksChanged }) {
  const { duplicateGroups, mergeDuplicates, dismissDuplicateGroup } = useTaskDeduplication(tasks, userId);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleMergeDuplicates = async (groupId, keepTaskId) => {
    const success = await mergeDuplicates(groupId, keepTaskId);
    if (success && onTasksChanged) {
      onTasksChanged(); // Trigger refresh of task list
    }
  };

  const handleRemoveAllButNewest = async (group) => {
    // Find the newest task (most recent created_at)
    const allTasks = [group.original, ...group.duplicates];
    const newestTask = allTasks.reduce((newest, task) => {
      return new Date(task.created_at) > new Date(newest.created_at) ? task : newest;
    });

    const success = await mergeDuplicates(group.id, newestTask.id);
    if (success && onTasksChanged) {
      onTasksChanged(); // Trigger refresh of task list
    }
  };

  if (duplicateGroups.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Potential Duplicate Tasks Found
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            We found {duplicateGroups.length} group(s) of potentially duplicate tasks from your calendar and email integrations. Use "Remove Duplicates" to keep the newest and delete the rest, or expand each group to choose which one to keep.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {duplicateGroups.map((group) => (
          <div key={group.id} className="bg-white border border-yellow-300 rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <svg 
                    className={`h-4 w-4 transform transition-transform ${
                      expandedGroups.has(group.id) ? 'rotate-90' : ''
                    }`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    "{group.original.title}"
                  </h4>
                  <p className="text-xs text-gray-600">
                    {group.totalCount} similar tasks • {group.confidence}% confidence
                    {group.sources.length > 0 && (
                      <span className="ml-2">
                        Sources: {group.sources.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleRemoveAllButNewest(group)}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  Remove Duplicates
                </button>
                <button
                  onClick={() => dismissDuplicateGroup(group.id)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Ignore
                </button>
              </div>
            </div>

            {expandedGroups.has(group.id) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-600 mb-3">
                  Choose which task to keep. The others will be permanently deleted from your task list.
                </p>
                
                {[group.original, ...group.duplicates].map((task, index) => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      <div className="text-xs text-gray-600">
                        {task.description && (
                          <span className="block">{task.description.substring(0, 100)}...</span>
                        )}
                        <span className="inline-flex items-center space-x-2 mt-1">
                          {task.source && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {task.source}
                            </span>
                          )}
                          {task.priority && (
                            <span className={`px-2 py-1 rounded text-xs ${
                              task.priority <= 2 ? 'bg-red-100 text-red-800' :
                              task.priority <= 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              Priority {task.priority}
                            </span>
                          )}
                          <span className="text-gray-500">
                            Created {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMergeDuplicates(group.id, task.id)}
                      className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Keep This One
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}