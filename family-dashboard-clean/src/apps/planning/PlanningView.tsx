import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  CalendarIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserGroupIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { TaskDetailModal } from '../../shared/components/TaskDetailModal';
import { SOPTooltip } from '../../shared/components/SOPTooltip';
import { taskManager, UniversalTask } from '../../shared/services/taskManagerService';
import { sopService } from '../../shared/services/sopService';
import './planning-calendar.css';

interface PlanningViewProps {
  contextId: string;
  userId: string;
}

interface SchedulableItem {
  id: string;
  title: string;
  type: 'task' | 'event' | 'sop' | 'meal' | 'project' | 'note';
  scheduledDate?: Date;
  scheduledTime?: string;
  duration?: number;
  status: 'pending' | 'scheduled' | 'completed' | 'in_progress' | 'cancelled';
  context: 'work' | 'family' | 'personal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  parentTitle?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    type: string;
    duration?: number;
    priority?: string;
    assignedTo?: string;
    taskId?: string;
  };
}

export const PlanningView: React.FC<PlanningViewProps> = ({ contextId }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [unscheduledItems, setUnscheduledItems] = useState<SchedulableItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentView, setCurrentView] = useState('timeGridWeek');

  // Initialize draggable functionality
  useEffect(() => {
    let draggableInstance: any = null;
    
    const initializeDraggable = () => {
      const draggableEl = document.getElementById('unscheduled-container');
      if (draggableEl && unscheduledItems.length > 0) {
        draggableInstance = new Draggable(draggableEl, {
          itemSelector: '.draggable-task',
          eventData: function(eventEl) {
            return {
              title: eventEl.getAttribute('data-title') || 'Untitled Task',
              duration: eventEl.getAttribute('data-duration') || '30'
            };
          }
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeDraggable, 100);

    return () => {
      clearTimeout(timer);
      if (draggableInstance) {
        draggableInstance.destroy();
      }
    };
  }, [unscheduledItems]);

  // Load tasks from task manager
  useEffect(() => {
    const loadPlanningData = () => {
      try {
        console.log(`🔍 Loading planning data for contextId: ${contextId}`);
        // Get unscheduled tasks
        const unscheduledTasks = taskManager.getUnscheduledTasks(contextId);
        console.log(`🚀 Got ${unscheduledTasks.length} unscheduled tasks from taskManager`);
        const unscheduledItems: SchedulableItem[] = unscheduledTasks.map(task => ({
          id: task.id,
          title: task.title,
          type: task.type,
          status: task.status,
          context: task.context,
          priority: task.priority,
          duration: task.duration,
          assignedTo: task.assignedTo,
          scheduledDate: task.scheduledDate,
          scheduledTime: task.scheduledTime
        }));

        // Get scheduled tasks and convert to calendar events
        const scheduledTasks = taskManager.getScheduledTasks(contextId);
        const calendarEvents: CalendarEvent[] = scheduledTasks
          .filter(task => task.scheduledDate)
          .map(task => {
            const startDate = new Date(task.scheduledDate!);
            if (task.scheduledTime) {
              const [hours, minutes] = task.scheduledTime.split(':').map(Number);
              startDate.setHours(hours, minutes, 0, 0);
            }
            
            const endDate = new Date(startDate);
            if (task.duration) {
              endDate.setMinutes(endDate.getMinutes() + task.duration);
            } else {
              endDate.setMinutes(endDate.getMinutes() + 30); // Default 30 min
            }

            return {
              id: task.id,
              title: task.title,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              backgroundColor: getContextColor(task.context),
              borderColor: getContextColor(task.context),
              textColor: '#ffffff',
              extendedProps: {
                type: task.type,
                duration: task.duration,
                priority: task.priority,
                assignedTo: task.assignedTo,
                taskId: task.id
              }
            };
          });

        setUnscheduledItems(unscheduledItems);
        setCalendarEvents(calendarEvents);
        setLoading(false);
      } catch (error) {
        console.error('Error loading planning data:', error);
        setLoading(false);
      }
    };

    // Load tasks initially and set up real-time subscription with retry
    const loadWithRetry = async () => {
      try {
        await taskManager.loadTasks(contextId);
        loadPlanningData();
      } catch (error) {
        console.log('⏳ Retrying task load in 2 seconds...');
        setTimeout(loadWithRetry, 2000);
      }
    };
    
    loadWithRetry();

    // Subscribe to real-time updates
    const unsubscribeFirestore = taskManager.subscribeToTasks(contextId);
    const unsubscribeLocal = taskManager.subscribe(loadPlanningData);
    
    return () => {
      unsubscribeFirestore();
      unsubscribeLocal();
    };
  }, [contextId]);

  const handleEventClick = (info: any) => {
    const eventData = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      type: info.event.extendedProps?.type,
      context: 'family', // You might want to get this from the task
      assignedTo: info.event.extendedProps?.assignedTo
    };
    
    setSelectedEvent(eventData);
  };

  const handleDateSelect = async (info: any) => {
    // For now, just log - could implement quick task creation here
    console.log('Date selected:', info.start, info.end);
  };

  const handleEventDrop = async (info: any) => {
    try {
      const taskId = info.event.extendedProps?.taskId || info.event.id;
      const newStart = info.event.start;
      const newTime = newStart.toTimeString().slice(0, 5); // HH:MM format
      
      // Update in task manager
      await taskManager.scheduleTask(taskId, newStart, newTime);
      
      console.log('✅ Task rescheduled successfully');
    } catch (error) {
      console.error('Error moving event:', error);
      info.revert(); // Revert the move if it failed
    }
  };

  const handleExternalDrop = async (info: any) => {
    try {
      console.log('Drop info:', info);
      console.log('Dragged element:', info.draggedEl);
      console.log('Dataset:', info.draggedEl.dataset);
      
      const taskId = info.draggedEl.getAttribute('data-task-id');
      
      if (!taskId) {
        console.error('No task ID found in dragged element');
        console.log('Available data attributes:', Object.keys(info.draggedEl.dataset));
        return;
      }

      const dropDate = info.date;
      const dropTime = dropDate.toTimeString().slice(0, 5); // HH:MM format
      
      console.log('Scheduling task:', taskId, 'for', dropDate, 'at', dropTime);
      
      // Wait a moment for task to sync, then schedule
      let attempts = 0;
      const maxAttempts = 10;
      
      const trySchedule = async () => {
        try {
          await taskManager.scheduleTask(taskId, dropDate, dropTime);
          // Let React handle DOM updates instead of manually removing
          console.log('✅ Task scheduled, React will update DOM');
          return true;
        } catch (error) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`⏳ Scheduling attempt ${attempts}, retrying in 500ms...`);
            setTimeout(trySchedule, 500);
          } else {
            console.error('Failed to schedule task after', maxAttempts, 'attempts');
            throw error;
          }
        }
      };
      
      await trySchedule();
      
      console.log('✅ Task scheduled successfully');
    } catch (error) {
      console.error('Error scheduling task:', error);
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    try {
      await taskManager.deleteTask(taskId);
      console.log('✅ Task removed successfully');
    } catch (error) {
      console.error('Error removing task:', error);
    }
  };

  const handleImportSOPSteps = async () => {
    try {
      console.log(`🔄 Starting SOP import for contextId: ${contextId}`);
      // Get all SOPs for the context
      const sops = await sopService.getSOPsForContext(contextId);
      
      if (sops.length === 0) {
        alert('No SOPs found to import steps from.');
        return;
      }

      // Show selection dialog
      const sopNames = sops.map(sop => `${sop.name} (${sop.steps?.length || 0} steps)`);
      const selectedIndex = window.prompt(
        `Select SOP to import steps from:\n${sopNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nEnter number (1-${sops.length}):`
      );

      if (!selectedIndex || isNaN(Number(selectedIndex))) return;
      
      const sopIndex = Number(selectedIndex) - 1;
      if (sopIndex < 0 || sopIndex >= sops.length) return;

      const selectedSOP = sops[sopIndex];
      if (!selectedSOP.steps || selectedSOP.steps.length === 0) {
        alert('Selected SOP has no steps to import.');
        return;
      }

      // Create tasks for each step
      for (const step of selectedSOP.steps) {
        const taskData = {
          id: `sop_${Math.random().toString(36).substr(2, 8)}`,
          title: step.title,
          description: step.description,
          type: 'sop' as const,
          status: 'pending' as const,
          priority: 'medium' as const,
          contextId: contextId,
          context: contextId as any,
          duration: step.estimatedDuration || 30,
          assignedTo: selectedSOP.defaultAssignee,
          createdBy: selectedSOP.createdBy,
          source: 'import' as const,
          parentId: selectedSOP.id,
          parentTitle: selectedSOP.name
        };

        await taskManager.createTask(taskData);
      }

      console.log(`✅ Imported ${selectedSOP.steps.length} steps from SOP: ${selectedSOP.name}`);
      console.log(`📋 Tasks created with contextId: ${contextId}`);
      
      // Debug: Check tasks immediately after import
      setTimeout(() => {
        console.log('🔍 Checking unscheduled tasks immediately after import...');
        const unscheduledTasks = taskManager.getUnscheduledTasks(contextId);
        console.log('📋 Unscheduled tasks after import:', unscheduledTasks.length);
      }, 100);
      
      alert(`Successfully imported ${selectedSOP.steps.length} tasks from "${selectedSOP.name}"`);
    } catch (error) {
      console.error('Error importing SOP steps:', error);
      alert('Failed to import SOP steps. Please try again.');
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'work': return '#059669'; // green
      case 'family': return '#3b82f6'; // blue
      case 'personal': return '#8b5cf6'; // purple
      default: return '#6b7280'; // gray
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-red-500';
      case 'high': return 'border-l-4 border-orange-500';
      case 'medium': return 'border-l-4 border-yellow-500';
      default: return 'border-l-4 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sop': return '📋';
      case 'task': return '✅';
      case 'event': return '📅';
      case 'meal': return '🍽️';
      case 'project': return '📁';
      default: return '📝';
    }
  };

  const getDisplayName = (assignedTo?: string) => {
    if (!assignedTo) return null;
    // If it looks like a Firebase UID or system ID, hide it
    if (assignedTo.length > 15 || /^[a-zA-Z0-9_-]{10,}$/.test(assignedTo) || assignedTo.includes('demo-') || assignedTo.includes('user-')) {
      return null;
    }
    return assignedTo;
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planning</h1>
          <p className="text-gray-500 mt-1">Schedule and organize your time</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 border border-gray-300 bg-white px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            <span>Filters</span>
          </button>
          
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Unscheduled Items */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <UserGroupIcon className="w-5 h-5 mr-2" />
                  Unscheduled Items
                </h3>
                <button
                  onClick={handleImportSOPSteps}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  title="Import SOP steps as tasks"
                >
                  + SOP
                </button>
              </div>
              <p className="text-sm text-gray-500">Drag to schedule</p>
            </div>
            
            <div id="unscheduled-container" className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {unscheduledItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  data-task-id={item.id}
                  data-type={item.type}
                  data-title={item.title}
                  data-duration={item.duration}
                  className={`draggable-task p-3 border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow bg-white ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getTypeIcon(item.type)}</span>
                        <h4 className="font-medium text-gray-900 text-sm truncate max-w-full">{item.title}</h4>
                      </div>
                      {item.parentTitle && getDisplayName(item.parentTitle) && (
                        <p className="text-xs text-gray-500 mb-2">{getDisplayName(item.parentTitle)}</p>
                      )}
                      
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getContextColor(item.context) }}
                        ></div>
                        <span className="capitalize">{item.context}</span>
                        {item.duration && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {item.duration}m
                            </span>
                          </>
                        )}
                        {getDisplayName(item.assignedTo) && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{getDisplayName(item.assignedTo)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveTask(item.id)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                      title="Remove task"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              
              {unscheduledItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All caught up!</p>
                  <p className="text-xs">No unscheduled tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar - Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              initialView={currentView}
              viewDidMount={(info) => setCurrentView(info.view.type)}
              height={600}
              events={calendarEvents}
              editable={true}
              selectable={true}
              selectMirror={true}
              droppable={true}
              weekends={true}
              dayMaxEvents={true}
              businessHours={{
                startTime: '09:00',
                endTime: '17:00'
              }}
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
              slotDuration="00:15:00"
              snapDuration="00:15:00"
              allDaySlot={false}
              nowIndicator={true}
              scrollTime={(() => {
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}:00`;
              })()}
              dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
              slotLabelFormat={{
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: false,
                meridiem: 'short'
              }}
              expandRows={true}
              eventClick={handleEventClick}
              select={handleDateSelect}
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop}
              drop={handleExternalDrop}
              eventClassNames={(arg) => {
                const type = arg.event.extendedProps?.type;
                return [
                  'fc-event-custom',
                  type ? `fc-event-${type}` : ''
                ].filter(Boolean);
              }}
            />
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
      
    </div>
  );
};