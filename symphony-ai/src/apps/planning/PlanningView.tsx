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
  Squares2X2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  InboxIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { TaskDetailModal } from '../../shared/components/TaskDetailModal';
import { SOPTooltip } from '../../shared/components/SOPTooltip';
import { taskManager, UniversalTask } from '../../shared/services/taskManagerService';
import { sopService } from '../../shared/services/sopService';
import { goalService } from '../../shared/services/goalService';
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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Sidebar sections data
  const [sidebarData, setSidebarData] = useState({
    inbox: [] as SchedulableItem[],
    sops: [] as any[],
    projects: [] as any[],
    goals: [] as any[]
  });
  
  // Sidebar section expanded states
  const [expandedSections, setExpandedSections] = useState({
    inbox: true,
    sops: false,
    projects: false,
    goals: false
  });

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

  // Load all planning data including sidebar sections
  useEffect(() => {
    const loadPlanningData = async () => {
      try {
        console.log(`🔍 Loading planning data for contextId: ${contextId}`);
        
        // Get unscheduled tasks for inbox
        const unscheduledTasks = taskManager.getUnscheduledTasks(contextId);
        console.log(`🚀 Got ${unscheduledTasks.length} unscheduled tasks from taskManager`);
        
        // Convert to inbox items (only standalone tasks, not SOP/project/goal derived)
        const inboxItems: SchedulableItem[] = unscheduledTasks
          .filter(task => task.source === 'manual' || task.type === 'task')
          .map(task => ({
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

        // Load SOPs, Projects, and Goals
        const [sops, projects, goals] = await Promise.all([
          sopService.getSOPsForContext(contextId),
          goalService.getProjectsByContext(contextId),
          goalService.getGoalsByContext(contextId)
        ]);

        // Update sidebar data
        setSidebarData({
          inbox: inboxItems,
          sops: sops || [],
          projects: projects || [],
          goals: goals || []
        });

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

        setUnscheduledItems(inboxItems); // Keep for drag/drop compatibility
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
        await loadPlanningData();
      } catch (error) {
        console.log('⏳ Retrying task load in 2 seconds...');
        setTimeout(loadWithRetry, 2000);
      }
    };
    
    loadWithRetry();

    // Subscribe to real-time updates
    const unsubscribeFirestore = taskManager.subscribeToTasks(contextId);
    const unsubscribeLocal = taskManager.subscribe(() => loadPlanningData());
    
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

  const handleQuickAdd = async () => {
    const title = window.prompt('Enter task title:');
    if (!title?.trim()) return;

    try {
      const taskData = {
        id: `task_${Math.random().toString(36).substr(2, 8)}`,
        title: title.trim(),
        type: 'task' as const,
        status: 'pending' as const,
        priority: 'medium' as const,
        contextId: contextId,
        context: contextId as any,
        createdBy: 'user',
        source: 'manual' as const
      };

      await taskManager.createTask(taskData);
      console.log('✅ Quick add task created successfully');
    } catch (error) {
      console.error('Error creating quick add task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Create a task from SOP step by dragging
  const createTaskFromSOPStep = async (sop: any, step: any) => {
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
      assignedTo: sop.defaultAssignee,
      createdBy: sop.createdBy,
      source: 'import' as const,
      parentId: sop.id,
      parentTitle: sop.name
    };

    return await taskManager.createTask(taskData);
  };

  // Create a task from project task by dragging
  const createTaskFromProjectTask = async (project: any, task: any) => {
    const taskData = {
      id: `project_${Math.random().toString(36).substr(2, 8)}`,
      title: task.title,
      description: task.description,
      type: 'project' as const,
      status: 'pending' as const,
      priority: task.priority as any,
      contextId: contextId,
      context: contextId as any,
      duration: task.estimatedDuration || 30,
      assignedTo: task.assignedTo,
      createdBy: project.createdBy,
      source: 'import' as const,
      parentId: project.id,
      parentTitle: project.title
    };

    return await taskManager.createTask(taskData);
  };

  // Create a task from goal task by dragging
  const createTaskFromGoalTask = async (goal: any, task: any) => {
    const taskData = {
      id: `goal_${Math.random().toString(36).substr(2, 8)}`,
      title: task.title,
      description: task.description,
      type: 'task' as const,
      status: 'pending' as const,
      priority: task.priority as any,
      contextId: contextId,
      context: contextId as any,
      duration: task.estimatedDuration || 30,
      assignedTo: task.assignedTo,
      createdBy: goal.createdBy,
      source: 'import' as const,
      parentId: goal.id,
      parentTitle: goal.title
    };

    return await taskManager.createTask(taskData);
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
          
          <button 
            onClick={handleQuickAdd}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Expandable Sections */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 flex items-center">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                Unscheduled Items
              </h3>
              <p className="text-sm text-gray-500">Drag to schedule</p>
            </div>
            
            <div id="unscheduled-container" className="max-h-96 overflow-y-auto">
              
              {/* Inbox Section */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => toggleSection('inbox')}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <InboxIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Inbox</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {sidebarData.inbox.length}
                    </span>
                  </div>
                  {expandedSections.inbox ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.inbox && (
                  <div className="px-3 pb-3 space-y-2">
                    {sidebarData.inbox.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        data-task-id={item.id}
                        data-type={item.type}
                        data-title={item.title}
                        data-duration={item.duration}
                        className={`draggable-task p-2 border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow bg-white ${getPriorityColor(item.priority)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm">{getTypeIcon(item.type)}</span>
                              <h4 className="font-medium text-gray-900 text-sm truncate">{item.title}</h4>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-600">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getContextColor(item.context) }}
                              ></div>
                              <span className="capitalize">{item.context}</span>
                              {item.duration && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span>{item.duration}m</span>
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
                    
                    {sidebarData.inbox.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <InboxIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No tasks in inbox</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SOPs Section */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => toggleSection('sops')}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <ClipboardDocumentListIcon className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-gray-900">SOPs</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {sidebarData.sops.length}
                    </span>
                  </div>
                  {expandedSections.sops ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.sops && (
                  <div className="px-3 pb-3 space-y-2">
                    {sidebarData.sops.map((sop) => (
                      <div key={sop.id} className="space-y-1">
                        <h5 className="text-xs font-medium text-gray-700 px-2 py-1 bg-gray-50 rounded">
                          {sop.name} ({sop.steps?.length || 0} steps)
                        </h5>
                        {sop.steps?.map((step: any, index: number) => (
                          <div
                            key={step.id}
                            draggable
                            data-sop-id={sop.id}
                            data-step-id={step.id}
                            data-title={step.title}
                            data-duration={step.estimatedDuration || 30}
                            className="draggable-task p-2 ml-2 border border-purple-200 rounded-lg cursor-move hover:shadow-md transition-shadow bg-purple-50"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-purple-600 font-mono">#{index + 1}</span>
                              <span className="text-sm font-medium text-gray-900 truncate">{step.title}</span>
                            </div>
                            {step.estimatedDuration && (
                              <div className="text-xs text-gray-600 mt-1">
                                <ClockIcon className="w-3 h-3 inline mr-1" />
                                {step.estimatedDuration}m
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {sidebarData.sops.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <ClipboardDocumentListIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No SOPs available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Projects Section */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => toggleSection('projects')}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Projects</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {sidebarData.projects.length}
                    </span>
                  </div>
                  {expandedSections.projects ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.projects && (
                  <div className="px-3 pb-3 space-y-2">
                    {sidebarData.projects.map((project) => (
                      <div key={project.id} className="space-y-1">
                        <h5 className="text-xs font-medium text-gray-700 px-2 py-1 bg-gray-50 rounded">
                          {project.title} ({project.tasks?.length || 0} tasks)
                        </h5>
                        {project.tasks?.map((task: any) => (
                          <div
                            key={task.id}
                            draggable
                            data-project-id={project.id}
                            data-task-id={task.id}
                            data-title={task.title}
                            data-duration={task.estimatedDuration || 30}
                            className="draggable-task p-2 ml-2 border border-green-200 rounded-lg cursor-move hover:shadow-md transition-shadow bg-green-50"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                              {task.priority && (
                                <span className={`px-1 py-0.5 rounded text-xs ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.estimatedDuration && (
                                <>
                                  <ClockIcon className="w-3 h-3" />
                                  <span>{task.estimatedDuration}m</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {sidebarData.projects.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <FolderIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No projects available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Goals Section */}
              <div>
                <button
                  onClick={() => toggleSection('goals')}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <FlagIcon className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-gray-900">Goals</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      {sidebarData.goals.length}
                    </span>
                  </div>
                  {expandedSections.goals ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                
                {expandedSections.goals && (
                  <div className="px-3 pb-3 space-y-2">
                    {sidebarData.goals.map((goal) => (
                      <div key={goal.id} className="space-y-1">
                        <h5 className="text-xs font-medium text-gray-700 px-2 py-1 bg-gray-50 rounded">
                          {goal.title} ({goal.tasks?.length || 0} tasks)
                        </h5>
                        {goal.tasks?.map((task: any) => (
                          <div
                            key={task.id}
                            draggable
                            data-goal-id={goal.id}
                            data-task-id={task.id}
                            data-title={task.title}
                            data-duration={task.estimatedDuration || 30}
                            className="draggable-task p-2 ml-2 border border-orange-200 rounded-lg cursor-move hover:shadow-md transition-shadow bg-orange-50"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                              {task.priority && (
                                <span className={`px-1 py-0.5 rounded text-xs ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.estimatedDuration && (
                                <>
                                  <ClockIcon className="w-3 h-3" />
                                  <span>{task.estimatedDuration}m</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {sidebarData.goals.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <FlagIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No goals available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
        contextId={contextId}
      />
      
    </div>
  );
};