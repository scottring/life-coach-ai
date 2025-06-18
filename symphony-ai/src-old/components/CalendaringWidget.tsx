import React, { useState } from 'react';
import DailyItineraryView from './DailyItineraryView';
import WeeklyPlanningView from './WeeklyPlanningView';
import { calendarService } from '../services/calendarService';
import { SOPSchedulingRequest } from '../types/calendar';

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
  const [isDragOver, setIsDragOver] = useState(false);

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return endDate.toTimeString().slice(0, 5);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.types.includes('application/json');
    if (data) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only hide drag over if leaving the widget entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const transferData = e.dataTransfer.getData('application/json');
      if (transferData) {
        const parsed = JSON.parse(transferData);
        if (parsed.type === 'sop_item') {
          const sopData = parsed.data;
          
          // For now, schedule for next available time (could be enhanced with modal later)
          const now = new Date();
          const schedulingRequest: SOPSchedulingRequest = {
            sopId: sopData.id,
            preferredDate: now.toISOString().split('T')[0], // Today
            preferredTime: '09:00', // Default to 9 AM
            assignedTo: sopData.defaultAssignee || userId,
            isRecurring: sopData.isRecurring,
            recurrencePattern: sopData.isRecurring && sopData.recurrence ? {
              frequency: sopData.recurrence.frequency === 'monthly' ? 'weekly' : sopData.recurrence.frequency as 'daily' | 'weekly',
              daysOfWeek: sopData.recurrence.daysOfWeek,
              endDate: undefined // Can be enhanced later with modal
            } : undefined
          };

          await calendarService.scheduleSOPEvent(
            contextId,
            sopData, // The full SOP data
            schedulingRequest,
            userId
          );

          console.log('SOP successfully scheduled:', sopData.name);
          
          // Refresh views
          onDataChange?.();
          onInboxRefresh?.();
        } else if (parsed.type === 'project_item') {
          const projectItem = parsed.data;
          
          // Schedule project item for next available time
          const now = new Date();
          const endTime = calculateEndTime('09:00', projectItem.estimatedDuration || 30);
          
          const calendarEvent = {
            contextId,
            type: 'manual' as const,
            title: `${projectItem.title} (${projectItem.projectName})`,
            description: `Project: ${projectItem.projectName}`,
            color: '#3B82F6', // Blue color for project items
            date: now.toISOString().split('T')[0], // Today
            startTime: '09:00', // Default to 9 AM
            endTime,
            duration: projectItem.estimatedDuration || 30,
            assignedTo: userId,
            status: 'scheduled' as const,
            isDraggable: true,
            isResizable: true,
            createdBy: userId
          };

          const createdEvent = await calendarService.createEvent(calendarEvent);
          
          console.log('Project item successfully scheduled:', projectItem.title);
          
          // Mark project item as scheduled
          const projectItemScheduleEvent = new CustomEvent('projectItemScheduled', {
            detail: { 
              projectItemId: projectItem.id,
              eventId: createdEvent.id 
            }
          });
          window.dispatchEvent(projectItemScheduleEvent);
          
          // Refresh views
          onDataChange?.();
          onInboxRefresh?.();
        }
      }
    } catch (error) {
      console.error('Error scheduling SOP:', error);
      // Could show user-friendly error message here
    }
  };

  return (
    <div 
      className={`relative ${isDragOver ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-300 rounded-lg">
          <div className="text-center">
            <div className="text-blue-600 text-lg font-medium mb-1">📋 Drop to Schedule</div>
            <div className="text-blue-500 text-sm">Release to add SOPs or project items to your calendar</div>
          </div>
        </div>
      )}
      
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