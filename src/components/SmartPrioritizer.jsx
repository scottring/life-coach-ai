import React, { useState } from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useUserContext } from '../providers/UserContextProvider';

function SmartPrioritizer() {
  const { reprioritizeTasks } = useTasks();
  const { context } = useUserContext();
  const [prioritizing, setPrioritizing] = useState(false);
  const [lastPrioritized, setLastPrioritized] = useState(null);

  const handlePrioritize = async () => {
    setPrioritizing(true);
    
    try {
      const results = await reprioritizeTasks(context);
      setLastPrioritized(new Date());
      
      if (results && results.length > 0) {
        // Show success message or update UI
        console.log('Tasks reprioritized successfully:', results);
      }
    } catch (error) {
      console.error('Error during prioritization:', error);
    } finally {
      setPrioritizing(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Smart Prioritization</h3>
          <p className="text-sm text-gray-500">
            AI-powered task prioritization based on your current context
          </p>
          {lastPrioritized && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastPrioritized.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <button
          onClick={handlePrioritize}
          disabled={prioritizing}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {prioritizing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Prioritizing...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Prioritize Tasks
            </>
          )}
        </button>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>Focus: {context.current_focus}</span>
          <span>Energy: {context.energy_level}</span>
          <span>Time: {context.available_time}min</span>
        </div>
      </div>
    </div>
  );
}

export default SmartPrioritizer;