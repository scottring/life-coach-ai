import React from 'react';
import { useUserContext } from '../providers/UserContextProvider';

function ContextManager() {
  const { context, updateContextField, loading, saving } = useUserContext();
  
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-3/4 rounded bg-gray-200"></div>
          <div className="mt-4 space-y-3">
            <div className="h-4 rounded bg-gray-200"></div>
            <div className="h-4 rounded bg-gray-200"></div>
            <div className="h-4 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Your Current Context</h2>
      
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="current_focus" className="block text-sm font-medium text-gray-700">
            Current Focus
          </label>
          <select
            id="current_focus"
            value={context.current_focus}
            onChange={(e) => updateContextField('current_focus', e.target.value)}
            disabled={saving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Family">Family</option>
            <option value="Learning">Learning</option>
            <option value="All">All Areas</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="energy_level" className="block text-sm font-medium text-gray-700">
            Energy Level
          </label>
          <select
            id="energy_level"
            value={context.energy_level}
            onChange={(e) => updateContextField('energy_level', e.target.value)}
            disabled={saving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="available_time" className="block text-sm font-medium text-gray-700">
            Available Time (minutes)
          </label>
          <input
            type="number"
            id="available_time"
            min="15"
            max="480"
            step="15"
            value={context.available_time}
            onChange={(e) => updateContextField('available_time', parseInt(e.target.value, 10))}
            disabled={saving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        {saving && (
          <div className="flex items-center text-sm text-blue-600">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-r-transparent"></div>
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
}

export default ContextManager;