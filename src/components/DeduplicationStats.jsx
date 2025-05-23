import React, { useState, useEffect } from 'react';
import { DeduplicationService } from '../lib/deduplicationService';
import { useAuthState } from '../hooks/useAuthState';

export default function DeduplicationStats() {
  const { user } = useAuthState();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7 days');

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id, timeframe]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const deduplicationStats = await DeduplicationService.getDeduplicationStats(user.id, timeframe);
      setStats(deduplicationStats);
    } catch (error) {
      console.error('Error loading deduplication stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Duplicate Prevention</h3>
        <p className="text-gray-600">Unable to load deduplication statistics</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Duplicate Prevention</h3>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="1 day">Last 24 hours</option>
          <option value="7 days">Last week</option>
          <option value="30 days">Last month</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalTasks}</div>
          <div className="text-sm text-blue-800">Total Tasks Created</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.duplicatesAvoided}</div>
          <div className="text-sm text-green-800">Duplicates Prevented</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.deduplicationRate}%</div>
          <div className="text-sm text-purple-800">Efficiency Rate</div>
        </div>
      </div>

      {Object.keys(stats.sources).length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">By Source</h4>
          <div className="space-y-2">
            {Object.entries(stats.sources).map(([source, data]) => (
              <div key={source} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium capitalize">{source}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{data.count} tasks</span>
                  {data.duplicates > 0 && (
                    <span className="text-green-600">{data.duplicates} duplicates avoided</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 mb-2">How it works:</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Shared calendar events are automatically deduplicated</li>
          <li>• Forwarded emails are detected and prevented from creating duplicate tasks</li>
          <li>• Similar task titles and descriptions are compared for content overlap</li>
          <li>• Each email and calendar event can only create one task per user</li>
        </ul>
      </div>
    </div>
  );
}