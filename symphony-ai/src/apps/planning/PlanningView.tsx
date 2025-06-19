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
  FlagIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  CogIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';
import { TaskDetailModal } from '../../shared/components/TaskDetailModal';
import { SOPTooltip } from '../../shared/components/SOPTooltip';
import { taskManager, UniversalTask } from '../../shared/services/taskManagerService';
import { sopService } from '../../shared/services/sopService';
import { goalService } from '../../shared/services/goalService';
import { aiPlanningService, PlanningContext, PlanningSession, ContextualItems } from '../../shared/services/aiPlanningService';
import WeeklyPlanningFlow from '../../components/WeeklyPlanningFlow';
import { MonthlyPlanningFlow } from '../../components/MonthlyPlanningFlow';
import './planning-calendar.css';

interface PlanningViewProps {
  contextId: string;
  userId?: string;
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

export const PlanningView: React.FC<PlanningViewProps> = ({ contextId, userId }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [unscheduledItems, setUnscheduledItems] = useState<SchedulableItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // AI Planning System
  const [planningSession, setPlanningSession] = useState<PlanningSession | null>(null);
  const [contextualItems, setContextualItems] = useState<ContextualItems | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [planningContext, setPlanningContext] = useState<PlanningContext>({
    participants: [userId || 'current_user'],
    scope: 'family',
    timeframe: 'weekly',
    contextId,
    sessionId: '',
    preferences: {
      workingHours: { start: '09:00', end: '17:00' },
      preferredDays: ['1', '2', '3', '4', '5'], // Monday-Friday
      energyPatterns: { morning: 'high', afternoon: 'medium', evening: 'low' }
    }
  });
  
  // Weekly Planning Flow state
  const [showWeeklyPlanning, setShowWeeklyPlanning] = useState(false);
  const [showMonthlyPlanning, setShowMonthlyPlanning] = useState(false);

  // Sidebar state
  const [sidebarData, setSidebarData] = useState({
    inbox: [] as SchedulableItem[],
    sops: [] as any[],
    projects: [] as any[],
    goals: [] as any[]
  });
  const [expandedSections, setExpandedSections] = useState({
    inbox: true,
    sops: false,
    projects: false,
    goals: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize draggable functionality
  useEffect(() => {
    let draggableInstance: any = null;
    
    const initializeDraggable = () => {
      const draggableEl = document.getElementById('unscheduled-container');
      if (draggableEl) {
        draggableInstance = new Draggable(draggableEl, {
          itemSelector: '.draggable-task',
          eventData: function(eventEl) {
            const title = eventEl.getAttribute('data-title') || 'Untitled Task';
            const duration = eventEl.getAttribute('data-duration') || '30';
            const isEntireSOP = eventEl.getAttribute('data-entire-sop') === 'true';
            const sopId = eventEl.getAttribute('data-sop-id');
            const stepId = eventEl.getAttribute('data-step-id');
            const searchResult = eventEl.getAttribute('data-search-result') === 'true';
            
            console.log('Dragging item:', { title, duration, isEntireSOP, sopId, stepId, searchResult });
            
            return {
              title,
              duration: parseInt(duration),
              extendedProps: {
                isEntireSOP,
                sopId,
                stepId,
                searchResult,
                originalElement: eventEl
              }
            };
          }
        });
        console.log('✅ Draggable initialized for container');
      } else {
        console.log('⚠️ Could not find unscheduled-container element');
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeDraggable, 500);

    return () => {
      clearTimeout(timer);
      if (draggableInstance) {
        draggableInstance.destroy();
      }
    };
  }, [sidebarData, searchResults]); // Re-initialize when sidebar data changes

  // Initialize AI planning system
  useEffect(() => {
    const initializeAIPlanning = async () => {
      try {
        // Temporarily disabled to fix permissions issue
        console.log('AI planning initialization temporarily disabled');
        
        // TODO: Re-enable once permissions are fixed
        // const items = await aiPlanningService.getContextualItems(planningContext);
        // setContextualItems(items);
        
        // For now, load data directly from services
        const [goals, projects, sops] = await Promise.all([
          goalService.getGoalsByContext(contextId).catch(err => {
            console.error('Error loading goals:', err);
            return [];
          }),
          goalService.getProjectsByContext(contextId).catch(err => {
            console.error('Error loading projects:', err);
            return [];
          }),
          sopService.getSOPsForContext(contextId).catch(err => {
            console.error('Error loading SOPs:', err);
            return [];
          })
        ]);

        // Debug: Current contextId being used
        console.log('🔍 Current contextId:', contextId);
        console.log('🔍 Current userId:', userId);
        
        console.log('Loaded planning data:', { 
          contextId, 
          goalsCount: goals.length, 
          projectsCount: projects.length, 
          sopsCount: sops.length,
          sops: sops.map(s => ({ id: s.id, name: s.name, contextId: s.contextId }))
        });
        
        setSidebarData({
          inbox: [], // Will be populated by taskManager
          sops: sops,
          projects: projects,
          goals: goals
        });
        
      } catch (error) {
        console.error('Error initializing planning data:', error);
      }
    };

    if (contextId && userId) {
      initializeAIPlanning();
    }
  }, [contextId, userId]);

  // Load all planning data including sidebar sections
  useEffect(() => {
    const loadPlanningData = async () => {
      try {
        console.log(`🔍 Loading planning data for contextId: ${contextId}`);
        
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

            // Detect SOP containers and steps for special styling
            const isSOPContainer = task.tags?.includes('sop-container');
            const isSOPStep = task.tags?.includes('sop-step');
            const containerTag = task.tags?.find(tag => tag.startsWith('container:'));
            const containerId = containerTag ? containerTag.split(':')[1] : null;

            return {
              id: task.id,
              title: task.title,
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              backgroundColor: isSOPContainer ? '#8b5cf6' : isSOPStep ? '#a855f7' : getContextColor(task.context),
              borderColor: isSOPContainer ? '#7c3aed' : isSOPStep ? '#9333ea' : getContextColor(task.context),
              textColor: '#ffffff',
              extendedProps: {
                type: task.type,
                duration: task.duration,
                priority: task.priority,
                assignedTo: task.assignedTo,
                taskId: task.id,
                isSOPContainer,
                isSOPStep,
                containerId
              }
            };
          });

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
      console.log('🎯 External drop event:', info);
      console.log('📦 Dragged element:', info.draggedEl);
      
      const dropDate = info.date;
      const dropTime = dropDate.toTimeString().slice(0, 5); // HH:MM format
      
      // Get data from dragged element
      const title = info.draggedEl.getAttribute('data-title');
      const duration = parseInt(info.draggedEl.getAttribute('data-duration') || '30');
      const isEntireSOP = info.draggedEl.getAttribute('data-entire-sop') === 'true';
      const sopId = info.draggedEl.getAttribute('data-sop-id');
      const stepId = info.draggedEl.getAttribute('data-step-id');
      const taskId = info.draggedEl.getAttribute('data-task-id');
      const projectId = info.draggedEl.getAttribute('data-project-id');
      const goalId = info.draggedEl.getAttribute('data-goal-id');
      const searchResult = info.draggedEl.getAttribute('data-search-result') === 'true';
      
      console.log('📋 Drop data:', { 
        title, duration, isEntireSOP, sopId, stepId, taskId, 
        projectId, goalId, searchResult, dropDate, dropTime 
      });

      let taskToSchedule = null;

      if (searchResult) {
        // Handle search result drops - create task from search result
        console.log('🔍 Handling search result drop');
        // This would need the search result data to create appropriate task
        // For now, create a basic task
        taskToSchedule = await taskManager.createTask({
          id: `search_${Math.random().toString(36).substring(2, 15)}`,
          title: title || 'Search Result Task',
          type: 'task' as const,
          status: 'pending' as const,
          priority: 'medium' as const,
          contextId: contextId,
          context: contextId as any,
          duration: duration,
          createdBy: 'user',
          source: 'manual' as const,
          scheduledDate: dropDate,
          scheduledTime: dropTime
        });
      } else if (taskId) {
        // Handle existing task drops (inbox items)
        console.log('📝 Handling existing task drop');
        await taskManager.scheduleTask(taskId, dropDate, dropTime);
        console.log('✅ Existing task scheduled');
        return;
      } else if (isEntireSOP && sopId) {
        // Handle entire SOP drops - create container task + individual step tasks
        console.log('📋 Handling entire SOP drop');
        const sop = sidebarData.sops.find(s => s.id === sopId);
        if (sop && sop.steps) {
          const sopContainerId = `sop_container_${Math.random().toString(36).substring(2, 15)}`;
          
          // Create a container task representing the entire SOP
          const containerTask = await taskManager.createTask({
            id: sopContainerId,
            title: `📋 ${sop.name}`,
            notes: `SOP Container: ${sop.steps.length} steps`,
            type: 'sop' as const,
            status: 'pending' as const,
            priority: 'medium' as const,
            contextId: contextId,
            context: contextId as any,
            duration: duration,
            assignedTo: sop.defaultAssignee,
            createdBy: sop.createdBy || 'user',
            source: 'import' as const,
            scheduledDate: dropDate,
            scheduledTime: dropTime,
            tags: ['sop-container']
          });

          // Create individual step tasks as sub-tasks
          let stepStartTime = new Date(dropDate);
          stepStartTime.setHours(parseInt(dropTime.split(':')[0]), parseInt(dropTime.split(':')[1]));

          for (let i = 0; i < sop.steps.length; i++) {
            const step = sop.steps[i];
            const stepDuration = step.estimatedDuration || 30;
            
            await taskManager.createTask({
              id: `sop_step_${Math.random().toString(36).substring(2, 15)}`,
              title: `${i + 1}. ${step.title}`,
              notes: step.description,
              type: 'sop' as const,
              status: 'pending' as const,
              priority: 'medium' as const,
              contextId: contextId,
              context: contextId as any,
              duration: stepDuration,
              assignedTo: sop.defaultAssignee,
              createdBy: sop.createdBy || 'user',
              source: 'import' as const,
              scheduledDate: stepStartTime,
              scheduledTime: stepStartTime.toTimeString().slice(0, 5),
              tags: ['sop-step', `container:${sopContainerId}`]
            });

            // Advance start time for next step
            stepStartTime.setMinutes(stepStartTime.getMinutes() + stepDuration);
          }

          taskToSchedule = containerTask;
        }
      } else if (sopId && stepId) {
        // Handle individual SOP step drops
        console.log('🔹 Handling SOP step drop');
        const sop = sidebarData.sops.find(s => s.id === sopId);
        const step = sop?.steps?.find((s: any) => s.id === stepId);
        if (sop && step) {
          taskToSchedule = await taskManager.createTask({
            id: `sop_step_${Math.random().toString(36).substring(2, 15)}`,
            title: step.title,
            notes: step.description,
            type: 'sop' as const,
            status: 'pending' as const,
            priority: 'medium' as const,
            contextId: contextId,
            context: contextId as any,
            duration: step.estimatedDuration || 30,
            assignedTo: sop.defaultAssignee,
            createdBy: sop.createdBy || 'user',
            source: 'import' as const,
            scheduledDate: dropDate,
            scheduledTime: dropTime
          });
        }
      } else if (projectId) {
        // Handle project task drops
        console.log('📁 Handling project task drop');
        const project = sidebarData.projects.find(p => p.id === projectId);
        const task = project?.tasks?.find((t: any) => t.id === taskId);
        if (project && task) {
          taskToSchedule = await taskManager.createTask({
            id: `project_task_${Math.random().toString(36).substring(2, 15)}`,
            title: task.title,
            notes: task.description,
            type: 'project' as const,
            status: 'pending' as const,
            priority: task.priority as any,
            contextId: contextId,
            context: contextId as any,
            duration: task.estimatedDuration || 30,
            assignedTo: task.assignedTo,
            createdBy: project.createdBy || 'user',
            source: 'import' as const,
            scheduledDate: dropDate,
            scheduledTime: dropTime
          });
        }
      } else if (goalId) {
        // Handle goal task drops
        console.log('🎯 Handling goal task drop');
        const goal = sidebarData.goals.find(g => g.id === goalId);
        const task = goal?.tasks?.find((t: any) => t.id === taskId);
        if (goal && task) {
          taskToSchedule = await taskManager.createTask({
            id: `goal_task_${Math.random().toString(36).substring(2, 15)}`,
            title: task.title,
            notes: task.description,
            type: 'task' as const,
            status: 'pending' as const,
            priority: task.priority as any,
            contextId: contextId,
            context: contextId as any,
            duration: task.estimatedDuration || 30,
            assignedTo: task.assignedTo,
            createdBy: goal.createdBy || 'user',
            source: 'import' as const,
            scheduledDate: dropDate,
            scheduledTime: dropTime
          });
        }
      }

      if (taskToSchedule) {
        console.log('✅ Task created and scheduled:', taskToSchedule.title);
      } else {
        console.error('❌ Could not determine how to handle drop');
      }

    } catch (error) {
      console.error('💥 Error in handleExternalDrop:', error);
      // Revert the drop
      info.revert();
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

  // Search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    if (planningSession) {
      try {
        const results = await aiPlanningService.searchItems(planningSession.id, query);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching items:', error);
        setSearchResults([]);
      }
    }
  };

  // AI Assistant functions
  const startAISession = async () => {
    try {
      const session = await aiPlanningService.startPlanningSession(planningContext);
      setPlanningSession(session);
      setShowAIAssistant(true);
    } catch (error) {
      console.error('Error starting AI session:', error);
    }
  };

  const sendAIMessage = async () => {
    if (!planningSession || !aiMessage.trim()) return;

    try {
      await aiPlanningService.processUserMessage(planningSession.id, aiMessage);
      setAiMessage('');
      
      // Refresh session data
      const updatedSession = await aiPlanningService.getSession(planningSession.id);
      if (updatedSession) {
        setPlanningSession(updatedSession);
      }
    } catch (error) {
      console.error('Error sending AI message:', error);
    }
  };

  const switchAIMode = async (mode: 'manual' | 'guided') => {
    if (!planningSession) return;

    try {
      await aiPlanningService.switchMode(planningSession.id, mode);
      
      // Refresh session data
      const updatedSession = await aiPlanningService.getSession(planningSession.id);
      if (updatedSession) {
        setPlanningSession(updatedSession);
      }
    } catch (error) {
      console.error('Error switching AI mode:', error);
    }
  };

  const changePlanningContext = async (newContext: Partial<PlanningContext>) => {
    const updatedContext = { ...planningContext, ...newContext };
    setPlanningContext(updatedContext);
    
    // Refresh contextual items with new context
    try {
      const items = await aiPlanningService.getContextualItems(updatedContext);
      setContextualItems(items);
      
      // Update sidebar with new contextual data
      setSidebarData({
        inbox: items.urgentTasks.filter(task => task.source === 'manual' || task.type === 'task'),
        sops: items.relevantSOPs,
        projects: items.currentProjects,
        goals: items.activeGoals
      });
    } catch (error) {
      console.error('Error updating planning context:', error);
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
          <p className="text-gray-500 mt-1">
            {planningContext.scope === 'family' ? 'Family' : planningContext.scope === 'work' ? 'Work' : 'Personal'} • 
            {planningContext.timeframe === 'weekly' ? ' Weekly' : planningContext.timeframe === 'monthly' ? ' Monthly' : ' Daily'} Planning
            {planningSession && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                <SparklesIcon className="w-3 h-3 mr-1" />
                AI Active
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Context Selector */}
          <div className="flex items-center space-x-2 border border-gray-300 bg-white px-3 py-2 rounded-lg">
            <CogIcon className="w-4 h-4 text-gray-400" />
            <select
              value={planningContext.scope}
              onChange={(e) => changePlanningContext({ scope: e.target.value as any })}
              className="border-none bg-transparent text-sm focus:outline-none"
            >
              <option value="family">Family</option>
              <option value="personal">Personal</option>
              <option value="work">Work</option>
            </select>
            <span className="text-gray-300">•</span>
            <select
              value={planningContext.timeframe}
              onChange={(e) => changePlanningContext({ timeframe: e.target.value as any })}
              className="border-none bg-transparent text-sm focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Planning Session Toggles */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowWeeklyPlanning(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Weekly Planning</span>
            </button>
            
            <button
              onClick={() => setShowMonthlyPlanning(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors bg-purple-600 text-white hover:bg-purple-700"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Monthly Planning</span>
            </button>
          </div>

          {/* AI Assistant Toggle */}
          <button
            onClick={planningSession ? () => setShowAIAssistant(!showAIAssistant) : startAISession}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              planningSession 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            <span>{planningSession ? 'AI Assistant' : 'Start AI Planning'}</span>
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
              <h3 className="font-medium text-gray-900 flex items-center mb-3">
                <UserGroupIcon className="w-5 h-5 mr-2" />
                Unscheduled Items
              </h3>
              
              {/* Search Bar */}
              <div className="relative mb-3">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search all items..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                {isSearching ? `${searchResults.length} search results` : 'Drag to schedule'}
              </p>
            </div>
            
            <div id="unscheduled-container" className="max-h-80 overflow-y-auto">
              
              {/* Search Results */}
              {isSearching && searchResults.length > 0 && (
                <div className="p-3 space-y-2">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider">Search Results</h4>
                  {searchResults.map((result) => (
                    <div
                      key={`${result.searchType}_${result.id}`}
                      draggable
                      data-search-result="true"
                      data-result-type={result.searchType}
                      data-title={result.title || result.name}
                      data-duration={result.duration || result.estimatedDuration || 30}
                      className="draggable-task p-2 border border-gray-200 rounded-lg cursor-move hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {result.searchSource}
                            </span>
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {result.title || result.name}
                            </h4>
                          </div>
                          {result.description && (
                            <p className="text-xs text-gray-600 truncate">{result.description}</p>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            {(result.duration || result.estimatedDuration) && (
                              <>
                                <ClockIcon className="w-3 h-3" />
                                <span>{result.duration || result.estimatedDuration}m</span>
                              </>
                            )}
                            {result.priority && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className={`px-1 py-0.5 rounded text-xs ${
                                  result.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  result.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {result.priority}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Show message when searching but no results */}
              {isSearching && searchResults.length === 0 && searchQuery.length > 1 && (
                <div className="p-6 text-center text-gray-500">
                  <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No items found for "{searchQuery}"</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}

              {/* Contextual Sections (shown when not searching) */}
              {!isSearching && (
                <>
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
                  <div className="px-3 pb-3 space-y-3">
                    {sidebarData.sops.map((sop) => {
                      const totalDuration = sop.steps?.reduce((sum: number, step: any) => sum + (step.estimatedDuration || 30), 0) || 30;
                      return (
                        <div key={sop.id} className="relative">
                          {/* SOP Container with Drag Handle */}
                          <div className="border-2 border-purple-200 rounded-lg bg-purple-50 hover:border-purple-300 transition-colors">
                            {/* Drag Handle for Entire SOP */}
                            <div
                              draggable
                              data-sop-id={sop.id}
                              data-entire-sop="true"
                              data-title={sop.name}
                              data-duration={totalDuration}
                              className="draggable-task flex items-center justify-between p-3 cursor-move hover:bg-purple-100 rounded-t-lg border-b border-purple-200"
                              title="Drag to schedule entire SOP"
                            >
                              <div className="flex items-center space-x-2">
                                <Bars3Icon className="w-4 h-4 text-purple-600" />
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 text-sm">{sop.name}</h4>
                                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                                    <span>{sop.steps?.length || 0} steps</span>
                                    <span className="text-gray-400">•</span>
                                    <ClockIcon className="w-3 h-3" />
                                    <span>
                                      {totalDuration >= 60 
                                        ? `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`
                                        : `${totalDuration}m`
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ClipboardDocumentListIcon className="w-4 h-4 text-purple-600" />
                            </div>
                            
                            {/* Individual Steps Container */}
                            <div className="p-2 space-y-1">
                              {sop.steps?.map((step: any, index: number) => (
                                <div
                                  key={step.id}
                                  draggable
                                  data-sop-id={sop.id}
                                  data-step-id={step.id}
                                  data-title={step.title}
                                  data-duration={step.estimatedDuration || 30}
                                  className="draggable-task flex items-center space-x-2 p-2 bg-white border border-purple-100 rounded cursor-move hover:shadow-sm hover:border-purple-200 transition-all"
                                  title="Drag to schedule this step only"
                                >
                                  <span className="text-xs text-purple-600 font-mono w-8 text-center">#{index + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-900 truncate block">{step.title}</span>
                                    {step.estimatedDuration && (
                                      <div className="flex items-center text-xs text-gray-600 mt-0.5">
                                        <ClockIcon className="w-3 h-3 mr-1" />
                                        {step.estimatedDuration}m
                                      </div>
                                    )}
                                  </div>
                                  <Bars3Icon className="w-3 h-3 text-gray-400" />
                                </div>
                              ))}
                              
                              {(!sop.steps || sop.steps.length === 0) && (
                                <div className="text-center py-2 text-gray-500">
                                  <p className="text-xs">No steps defined</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
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
                </>
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
                const isSOPContainer = arg.event.extendedProps?.isSOPContainer;
                const isSOPStep = arg.event.extendedProps?.isSOPStep;
                const containerId = arg.event.extendedProps?.containerId;
                
                return [
                  'fc-event-custom',
                  type ? `fc-event-${type}` : '',
                  isSOPContainer ? 'fc-event-sop-container' : '',
                  isSOPStep ? 'fc-event-sop-step' : '',
                  containerId ? `fc-event-container-${containerId}` : ''
                ].filter(Boolean);
              }}
            />
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {showAIAssistant && planningSession && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
          {/* AI Assistant Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-gray-900">AI Planning Assistant</h3>
              </div>
              <div className="flex items-center space-x-2">
                {/* Mode Toggle */}
                <div className="flex items-center bg-white rounded-lg p-1 border">
                  <button
                    onClick={() => switchAIMode('guided')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      planningSession.mode === 'guided' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Guided
                  </button>
                  <button
                    onClick={() => switchAIMode('manual')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      planningSession.mode === 'manual' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Manual
                  </button>
                </div>
                <button
                  onClick={() => setShowAIAssistant(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {planningSession.mode === 'guided' 
                ? 'I\'ll guide you through planning step by step' 
                : 'I\'ll provide suggestions as you work'
              }
            </p>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {planningSession.conversation.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.speaker === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.metadata?.suggestedItems && (
                    <div className="mt-2 space-y-1">
                      {message.metadata.suggestedItems.slice(0, 3).map((item: any, index: number) => (
                        <div key={index} className="text-xs opacity-75 p-2 bg-white bg-opacity-20 rounded">
                          • {item.title || item.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-75 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* AI Suggestions */}
            {planningSession.suggestions.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">AI Suggestions</h4>
                <div className="space-y-2">
                  {planningSession.suggestions.slice(-3).map((suggestion) => (
                    <div key={suggestion.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">{suggestion.reasoning}</p>
                      {suggestion.suggestedTime && (
                        <p className="text-xs text-amber-600 mt-1">
                          Suggested: {suggestion.suggestedTime.date} at {suggestion.suggestedTime.time}
                        </p>
                      )}
                      <div className="flex space-x-2 mt-2">
                        <button
                          onClick={() => aiPlanningService.applySuggestion(planningSession.id, suggestion.id, 'accepted')}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => aiPlanningService.applySuggestion(planningSession.id, suggestion.id, 'rejected')}
                          className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendAIMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={sendAIMessage}
                disabled={!aiMessage.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Help me plan', 'Show urgent items', 'Suggest schedule', 'Weekly review'].map((quickAction) => (
                <button
                  key={quickAction}
                  onClick={() => setAiMessage(quickAction)}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  {quickAction}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Planning Flow */}
      {showWeeklyPlanning && (
        <WeeklyPlanningFlow
          contextId={contextId}
          userId={userId || 'current_user'}
          onClose={() => setShowWeeklyPlanning(false)}
        />
      )}

      {/* Monthly Planning Flow */}
      {showMonthlyPlanning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Monthly Planning Session</h2>
              <button
                onClick={() => setShowMonthlyPlanning(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <MonthlyPlanningFlow
              contextId={contextId}
              onComplete={() => setShowMonthlyPlanning(false)}
            />
          </div>
        </div>
      )}

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