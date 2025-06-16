import React, { useState } from 'react';
import DailyItineraryView from './DailyItineraryView';
import WeeklyPlanningView from './WeeklyPlanningView';

interface CalendaringWidgetProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
  onInboxRefresh?: () => void;
}

type CalendarView = 'daily' | 'weekly';

const CalendaringWidget: React.FC<CalendaringWidgetProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange,
  onInboxRefresh
}) => {
  const [currentView, setCurrentView] = useState<CalendarView>('daily');

  return (
    <div>
      {currentView === 'daily' && (
        <DailyItineraryView
          contextId={contextId}
          userId={userId}
          refreshTrigger={refreshTrigger}
          onDataChange={onDataChange}
          showViewToggle={true}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      )}

      {currentView === 'weekly' && (
        <WeeklyPlanningView
          contextId={contextId}
          userId={userId}
          refreshTrigger={refreshTrigger}
          onDataChange={onDataChange}
          onInboxRefresh={onInboxRefresh}
          showViewToggle={true}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      )}
    </div>
  );
};

export default CalendaringWidget;