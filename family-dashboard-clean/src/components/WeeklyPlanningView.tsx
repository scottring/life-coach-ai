import React, { useState } from 'react';
import EnhancedWeeklyCalendarWidget from './EnhancedWeeklyCalendarWidget';

interface WeeklyPlanningViewProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

const WeeklyPlanningView: React.FC<WeeklyPlanningViewProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange
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