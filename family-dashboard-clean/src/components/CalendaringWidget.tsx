import React, { useState } from 'react';
import DailyItineraryView from './DailyItineraryView';
import WeeklyPlanningView from './WeeklyPlanningView';

interface CalendaringWidgetProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

type CalendarView = 'daily' | 'weekly';

const CalendaringWidget: React.FC<CalendaringWidgetProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange
}) => {
  const [currentView, setCurrentView] = useState<CalendarView>('daily');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Calendar & Planning</h2>
          
          {/* Internal View Switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('daily')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'daily'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setCurrentView('weekly')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6">
        {currentView === 'daily' && (
          <DailyItineraryView
            contextId={contextId}
            userId={userId}
            refreshTrigger={refreshTrigger}
            onDataChange={onDataChange}
          />
        )}

        {currentView === 'weekly' && (
          <WeeklyPlanningView
            contextId={contextId}
            userId={userId}
            refreshTrigger={refreshTrigger}
            onDataChange={onDataChange}
          />
        )}
      </div>
    </div>
  );
};

export default CalendaringWidget;