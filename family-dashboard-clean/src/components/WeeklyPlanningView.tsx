import React, { useState } from 'react';
import EnhancedWeeklyCalendarWidget from './EnhancedWeeklyCalendarWidget';

interface WeeklyPlanningViewProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
  showViewToggle?: boolean;
  currentView?: 'daily' | 'weekly';
  onViewChange?: (view: 'daily' | 'weekly') => void;
}

const WeeklyPlanningView: React.FC<WeeklyPlanningViewProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange,
  showViewToggle = false,
  currentView = 'weekly',
  onViewChange
}) => {
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  const handleCreateEvent = (date: string, time: string) => {
    console.log('Create event:', date, time);
  };

  const handleCreateTask = () => {
    console.log('Create task');
  };

  const handleCreateGoal = () => {
    console.log('Create goal');
  };

  const handleCreateProject = () => {
    console.log('Create project');
  };

  return (
    <div className="h-full">
      {/* Header with toggles */}
      {showViewToggle && onViewChange && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewChange('daily')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                currentView === 'daily'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => onViewChange('weekly')}
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
      )}
      
      {/* Enhanced Calendar with Sidebar */}
      <div className="h-full">
        <EnhancedWeeklyCalendarWidget
          contextId={contextId}
          userId={userId}
          onCreateEvent={handleCreateEvent}
          onCreateTask={handleCreateTask}
          onCreateGoal={handleCreateGoal}
          onCreateProject={handleCreateProject}
          refreshTrigger={sidebarRefreshTrigger}
          onItemScheduled={() => {
            setSidebarRefreshTrigger(prev => prev + 1);
            onDataChange?.();
          }}
          externalRefreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default WeeklyPlanningView;