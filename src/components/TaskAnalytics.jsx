import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLearningSystem } from '../hooks/useLearningSystem';

function TaskAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { analyzeCompletionPatterns, analyzing } = useLearningSystem();
  
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // In a production app, we would load saved analytics from Supabase
        // For now, generate them on demand
        const result = await analyzeCompletionPatterns();
        setAnalytics(result);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, []);
  
  const handleRefreshAnalytics = async () => {
    setLoading(true);
    const result = await analyzeCompletionPatterns();
    setAnalytics(result);
    setLoading(false);
  };
  
  if (loading || analyzing) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Analyzing your productivity patterns...</p>
        </div>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-gray-500">No analytics available yet. Complete more tasks to generate insights.</p>
          <button
            onClick={handleRefreshAnalytics}
            className="mt-4 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Generate Analytics
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Your Productivity Insights</h2>
        <button
          onClick={handleRefreshAnalytics}
          className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>
      
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Best Times of Day */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium uppercase text-gray-500">Best Times of Day</h3>
          
          <div className="mt-3 space-y-2">
            {analytics.bestTimes && Object.entries(analytics.bestTimes).map(([time, activities]) => (
              <div key={time} className="flex items-start">
                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800">
                  {time.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{time.charAt(0).toUpperCase() + time.slice(1)}</p>
                  <p className="text-sm text-gray-600">{activities.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Day Patterns */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium uppercase text-gray-500">Weekly Patterns</h3>
          
          <div className="mt-3 space-y-2">
            {analytics.dayPatterns && Object.entries(analytics.dayPatterns).map(([pattern, days]) => (
              <div key={pattern} className="flex items-start">
                <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-800">
                  {pattern.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{pattern.charAt(0).toUpperCase() + pattern.slice(1)} Days</p>
                  <p className="text-sm text-gray-600">{days.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Context Switching */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium uppercase text-gray-500">Context Switching</h3>
          
          <div className="mt-3">
            <p className="text-gray-700">{analytics.contextSwitching}</p>
          </div>
        </div>
        
        {/* Completion Rates */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium uppercase text-gray-500">Completion Rates</h3>
          
          <div className="mt-3 space-y-2">
            {analytics.completionRates && Object.entries(analytics.completionRates).map(([rate, categories]) => (
              <div key={rate} className="flex items-start">
                <div className={`mr-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  rate === 'high' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {rate.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{rate.charAt(0).toUpperCase() + rate.slice(1)} Completion</p>
                  <p className="text-sm text-gray-600">{categories.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-medium uppercase text-blue-700">Personalized Recommendations</h3>
        
        <div className="mt-3">
          <ul className="space-y-2 text-blue-700">
            {analytics.recommendations && analytics.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <svg className="mr-1.5 mt-0.5 h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TaskAnalytics;