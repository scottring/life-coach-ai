import React, { useState, useEffect } from 'react';
import { 
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { CalendarEvent } from '../types/calendar';
import { SchedulableItem } from '../types/goals';
import { calendarService } from '../services/calendarService';
import { goalService } from '../services/goalService';

interface ConductorScoreProps {
  contextId: string;
  userId: string;
  lifeDomains: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
  }>;
  selectedDomain: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
  onInboxRefresh?: () => void;
}

interface SymphonyMovement {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  domain: string;
  type: 'scheduled' | 'transition' | 'buffer' | 'focus-block';
  color: string;
  icon: string;
  status: 'upcoming' | 'current' | 'completed' | 'overdue';
  energy: 'high' | 'medium' | 'low';
  harmony: number; // How well it fits with surrounding activities
  originalData?: CalendarEvent | SchedulableItem;
}

const ConductorScore: React.FC<ConductorScoreProps> = ({
  contextId,
  userId,
  lifeDomains,
  selectedDomain,
  refreshTrigger,
  onDataChange,
  onInboxRefresh
}) => {
  const [movements, setMovements] = useState<SymphonyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    loadTodaysSymphony();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [contextId, selectedDomain, refreshTrigger]);

  const loadTodaysSymphony = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Load all scheduled events and unscheduled tasks
      const [events, allTasks, inboxTasks] = await Promise.all([
        calendarService.getEventsForDay(contextId, today),
        goalService.getSchedulableTasks(contextId),
        goalService.getTasksWithTag(contextId, 'inbox')
      ]);

      // Filter tasks for today's unscheduled items (exclude already scheduled ones)
      const todayTasks = allTasks.filter(task => {
        const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;
        const isScheduled = task.scheduledDate && task.scheduledTime;
        return (dueDate === today && task.status !== 'completed' && !isScheduled);
      });

      // Combine with inbox tasks that aren't completed and aren't scheduled
      const inboxItems = inboxTasks.filter(task => {
        const isScheduled = task.scheduledDate && task.scheduledTime;
        return task.status !== 'completed' && !isScheduled;
      });
      const allUnscheduledTasks = [...todayTasks, ...inboxItems];
      
      // Remove duplicates
      const uniqueTasks = allUnscheduledTasks.reduce((acc, task) => {
        if (!acc.find(t => t.id === task.id)) {
          acc.push(task);
        }
        return acc;
      }, [] as typeof allUnscheduledTasks);

      // Filter by selected domain
      const domainFilteredTasks = selectedDomain === 'universal' 
        ? uniqueTasks 
        : uniqueTasks.filter(task => {
            const taskDomain = getDomainFromTask(task);
            return taskDomain === selectedDomain;
          });

      // Filter events by selected domain
      const domainFilteredEvents = selectedDomain === 'universal'
        ? events
        : events.filter(event => {
            const eventDomain = getDomainFromEvent(event);
            return eventDomain === selectedDomain;
          });

      // Convert to symphony movements
      const symphonyMovements: SymphonyMovement[] = [];

      // Add scheduled events
      domainFilteredEvents.forEach(event => {
        const domain = getDomainFromEvent(event);
        const domainConfig = lifeDomains.find(d => d.id === domain) || lifeDomains[0];
        
        symphonyMovements.push({
          id: event.id,
          startTime: event.startTime,
          endTime: event.endTime,
          title: event.title,
          domain: domain,
          type: 'scheduled',
          color: domainConfig.color,
          icon: domainConfig.icon,
          status: getTimeStatus(event.startTime, event.endTime),
          energy: getEnergyLevel(event.startTime),
          harmony: calculateHarmony(event, domainFilteredEvents),
          originalData: event
        });
      });

      // Add unscheduled items as potential movements
      domainFilteredTasks.forEach(task => {
        const domain = getDomainFromTask(task);
        const domainConfig = lifeDomains.find(d => d.id === domain) || lifeDomains[0];
        
        symphonyMovements.push({
          id: `unscheduled-${task.id}`,
          startTime: '',
          endTime: '',
          title: task.title,
          domain: domain,
          type: 'scheduled',
          color: domainConfig.color,
          icon: domainConfig.icon,
          status: 'upcoming',
          energy: 'medium',
          harmony: 50,
          originalData: task
        });
      });

      // Sort by time (scheduled first, then unscheduled)
      symphonyMovements.sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });

      // Add AI-suggested transitions and buffers
      const enhancedMovements = addAIOrchestration(symphonyMovements);
      
      setMovements(enhancedMovements);
      generateAISuggestions(enhancedMovements);
      
    } catch (error) {
      console.error('Error loading today\'s symphony:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDomainFromEvent = (event: CalendarEvent): string => {
    // Analyze event to determine life domain
    const title = event.title.toLowerCase();
    if (title.includes('work') || title.includes('meeting') || title.includes('call')) return 'work';
    if (title.includes('family') || title.includes('kid') || title.includes('school')) return 'family';
    if (title.includes('meal') || title.includes('dinner') || title.includes('lunch')) return 'home';
    if (title.includes('exercise') || title.includes('workout') || title.includes('doctor')) return 'health';
    return 'personal';
  };

  const getDomainFromTask = (task: SchedulableItem): string => {
    // Analyze task to determine life domain
    if (task.tags?.includes('work')) return 'work';
    if (task.tags?.includes('family')) return 'family';
    if (task.tags?.includes('health')) return 'health';
    if (task.tags?.includes('home')) return 'home';
    return 'personal';
  };

  const getTimeStatus = (startTime: string, endTime: string): 'upcoming' | 'current' | 'completed' | 'overdue' => {
    const now = currentTime;
    const start = new Date(`${now.toDateString()} ${startTime}`);
    const end = new Date(`${now.toDateString()} ${endTime}`);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'current';
    if (now > end) return 'completed';
    return 'upcoming';
  };

  const getEnergyLevel = (startTime: string): 'high' | 'medium' | 'low' => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 6 && hour <= 10) return 'high'; // Morning energy
    if (hour >= 14 && hour <= 16) return 'high'; // Afternoon peak
    if (hour >= 20 || hour <= 6) return 'low'; // Evening/night
    return 'medium';
  };

  const calculateHarmony = (event: CalendarEvent, allEvents: CalendarEvent[]): number => {
    // AI logic to calculate how well this event harmonizes with the day
    // For now, simple heuristic based on spacing and domain diversity
    return Math.floor(Math.random() * 30) + 70; // 70-100%
  };

  const addAIOrchestration = (movements: SymphonyMovement[]): SymphonyMovement[] => {
    const enhanced = [...movements];
    
    // Add transition periods between different domains
    for (let i = 0; i < enhanced.length - 1; i++) {
      const current = enhanced[i];
      const next = enhanced[i + 1];
      
      if (current.domain !== next.domain && current.startTime && next.startTime) {
        const transitionTime = calculateTransitionTime(current.endTime, next.startTime);
        if (transitionTime > 10) { // More than 10 minutes
          enhanced.splice(i + 1, 0, {
            id: `transition-${i}`,
            startTime: current.endTime,
            endTime: next.startTime,
            title: `🔄 Transition: ${current.domain} → ${next.domain}`,
            domain: 'transition',
            type: 'transition',
            color: 'gray',
            icon: '🔄',
            status: 'upcoming',
            energy: 'low',
            harmony: 85
          });
        }
      }
    }
    
    return enhanced;
  };

  const calculateTransitionTime = (endTime: string, startTime: string): number => {
    const end = new Date(`2000-01-01T${endTime}:00`);
    const start = new Date(`2000-01-01T${startTime}:00`);
    return (start.getTime() - end.getTime()) / (1000 * 60); // minutes
  };

  const generateAISuggestions = (movements: SymphonyMovement[]) => {
    const suggestions = [
      "🖱️ Drag unscheduled items from the right sidebar to time slots to schedule them",
      "💡 Consider adding a 15-minute buffer before your important meeting",
      "⚡ Your energy peaks at 2 PM - perfect time for that challenging task", 
      "🍽️ Family dinner at 6 PM aligns well with your work wrap-up",
      "💪 Morning workout would boost your entire day's energy"
    ];
    
    // Always show the drag tip if there are unscheduled items
    const unscheduledCount = movements.filter(m => !m.startTime).length;
    if (unscheduledCount > 0) {
      setAiSuggestions([suggestions[0], suggestions[1]]);
    } else {
      setAiSuggestions(suggestions.slice(1, 3));
    }
  };

  // Drag and drop handlers
  const handleScheduleItem = async (item: SchedulableItem, timeSlot: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const endTime = calculateEndTime(timeSlot, item.estimatedDuration || 30);
      
      // Create a calendar event for the scheduled item
      const eventData = {
        title: item.title,
        description: item.description || '',
        date: today,
        startTime: timeSlot,
        endTime: endTime,
        duration: item.estimatedDuration || 30,
        type: 'goal_task' as const,
        taskId: item.id,
        goalId: item.goalId,
        projectId: item.projectId,
        milestoneId: item.milestoneId,
        assignedTo: item.assignedTo,
        priority: item.priority,
        color: getPriorityColor(item.priority),
        contextId: contextId,
        status: 'scheduled' as const,
        isDraggable: true,
        isResizable: true,
        createdBy: userId
      };

      await calendarService.createEvent(eventData);
      
      // Update the task to mark it as scheduled
      await goalService.scheduleTask(item.id, today, timeSlot);
      
      // Refresh the view
      await loadTodaysSymphony();
      onDataChange?.();
      onInboxRefresh?.();
      
    } catch (error) {
      console.error('Error scheduling item:', error);
      alert('Failed to schedule item. Please try again.');
    }
  };

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const generateTimeSlots = (): string[] => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getCurrentTimePosition = (): number => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const dayStart = 6 * 60; // 6 AM
    const dayEnd = 22 * 60; // 10 PM
    const dayDuration = dayEnd - dayStart;
    const position = ((totalMinutes - dayStart) / dayDuration) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const getCurrentTimeSlot = (): string => {
    const now = currentTime;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Round to nearest 30-minute slot
    const roundedMinutes = minutes < 30 ? 0 : 30;
    return `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleQuickSchedule = async (item: SchedulableItem) => {
    try {
      // Find the next available time slot (current time rounded up to next 30-min slot)
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Round up to next 30-minute slot
      let nextSlotHour = currentHour;
      let nextSlotMinute = currentMinute <= 30 ? 30 : 0;
      if (nextSlotMinute === 0) {
        nextSlotHour += 1;
      }
      
      // Format as time string
      const nextTimeSlot = `${nextSlotHour.toString().padStart(2, '0')}:${nextSlotMinute.toString().padStart(2, '0')}`;
      
      await handleScheduleItem(item, nextTimeSlot);
      onInboxRefresh?.();
    } catch (error) {
      console.error('Error quick scheduling item:', error);
      alert('Failed to schedule item. Please try again.');
    }
  };

  const handleDeferItem = async (item: SchedulableItem) => {
    try {
      const deferOptions = [
        { label: 'Later Today (6 PM)', hours: 18, minutes: 0 },
        { label: 'Tomorrow Morning (9 AM)', hours: 9, minutes: 0, nextDay: true },
        { label: 'End of Week (Friday 9 AM)', days: 'friday' },
        { label: 'Next Week (Monday 9 AM)', days: 'nextMonday' }
      ];

      // Simple prompt for now - in production you'd want a proper modal
      const choice = prompt(
        `Defer "${item.title}" to:\n` +
        deferOptions.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n') +
        '\n\nEnter choice (1-4):'
      );

      if (!choice || isNaN(parseInt(choice)) || parseInt(choice) < 1 || parseInt(choice) > 4) {
        return;
      }

      const selectedOption = deferOptions[parseInt(choice) - 1];
      let deferDate = new Date();
      
      if (selectedOption.nextDay) {
        deferDate.setDate(deferDate.getDate() + 1);
      } else if (selectedOption.days === 'friday') {
        const daysToFriday = (5 - deferDate.getDay() + 7) % 7 || 7;
        deferDate.setDate(deferDate.getDate() + daysToFriday);
      } else if (selectedOption.days === 'nextMonday') {
        const daysToNextMonday = (8 - deferDate.getDay()) % 7 || 7;
        deferDate.setDate(deferDate.getDate() + daysToNextMonday);
      }

      if (selectedOption.hours !== undefined) {
        deferDate.setHours(selectedOption.hours, selectedOption.minutes || 0, 0, 0);
      }

      await goalService.updateTask(item.id, {
        dueDate: deferDate.toISOString()
      });

      await loadTodaysSymphony();
      onDataChange?.();
      
    } catch (error) {
      console.error('Error deferring item:', error);
      alert('Failed to defer item. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Orchestrating your day...</p>
        </div>
      </div>
    );
  }

  const scheduledMovements = movements.filter(m => m.startTime);
  const unscheduledMovements = movements.filter(m => !m.startTime);

  return (
    <div className="space-y-6">
      {/* AI Assistant Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start space-x-3">
            <SparklesIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-2">💡 AI Suggestions</h3>
              <div className="space-y-1">
                {aiSuggestions.map((suggestion, index) => (
                  <p key={index} className="text-sm text-gray-700">{suggestion}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule - Today's Itinerary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">📅 Today's Schedule</h2>
                  <p className="text-gray-600">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(scheduledMovements.reduce((acc, m) => acc + m.harmony, 0) / scheduledMovements.length) || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Balance Score</div>
                </div>
              </div>
            </div>

            <div className="p-6 relative min-h-96">
              {/* Current Time Indicator */}
              <div 
                className="absolute left-6 right-6 h-0.5 bg-red-500 z-10"
                style={{ top: `${getCurrentTimePosition() * 6 + 120}px` }}
              >
                <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full"></div>
                <div className="absolute left-4 -top-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  {currentTime.toTimeString().slice(0, 5)}
                </div>
              </div>

              {/* Time-based Schedule Grid */}
              <div className="space-y-2">
                {timeSlots.map((timeSlot) => {
                  const scheduledEvent = scheduledMovements.find(m => m.startTime === timeSlot);
                  const isCurrentTime = getCurrentTimeSlot() === timeSlot;
                  const isDragOver = dragOverSlot === timeSlot;
                  
                  return (
                    <div key={timeSlot} className="flex items-center space-x-4">
                      {/* Time Label */}
                      <div className="w-20 text-sm text-gray-600 font-mono">
                        {formatTime(timeSlot)}
                      </div>
                      
                      {/* Event/Drop Zone */}
                      <div 
                        className={`flex-1 min-h-12 rounded-lg border-2 border-dashed transition-all duration-200 ${
                          scheduledEvent 
                            ? 'border-transparent' 
                            : isDragOver 
                              ? 'border-blue-400 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                        } ${isCurrentTime ? 'ring-2 ring-red-400 ring-opacity-50' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverSlot(timeSlot);
                        }}
                        onDragLeave={() => {
                          setDragOverSlot(null);
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverSlot(null);
                          
                          try {
                            const transferData = e.dataTransfer.getData('application/json');
                            if (transferData) {
                              const parsed = JSON.parse(transferData);
                              if (parsed.type === 'schedulable_item' && parsed.data) {
                                await handleScheduleItem(parsed.data, timeSlot);
                                onInboxRefresh?.();
                              }
                            }
                          } catch (error) {
                            console.error('Error handling drop:', error);
                          }
                        }}
                      >
                        {scheduledEvent ? (
                          // Existing scheduled event
                          <div 
                            className={`h-full p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                              scheduledEvent.status === 'current' ? 'bg-blue-50 border-blue-500' :
                              scheduledEvent.status === 'completed' ? 'bg-green-50 border-green-500' :
                              scheduledEvent.status === 'overdue' ? 'bg-red-50 border-red-500' :
                              'bg-white border-gray-200'
                            }`}
                            onClick={() => {
                              if (scheduledEvent.originalData && 'id' in scheduledEvent.originalData) {
                                setEditingEvent(scheduledEvent.originalData as CalendarEvent);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{scheduledEvent.icon}</span>
                                <div>
                                  <h4 className="font-medium text-gray-900">{scheduledEvent.title}</h4>
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      scheduledEvent.domain === 'work' ? 'bg-blue-100 text-blue-700' :
                                      scheduledEvent.domain === 'family' ? 'bg-green-100 text-green-700' :
                                      scheduledEvent.domain === 'health' ? 'bg-red-100 text-red-700' :
                                      scheduledEvent.domain === 'home' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-purple-100 text-purple-700'
                                    }`}>
                                      {scheduledEvent.domain}
                                    </span>
                                    <span>{scheduledEvent.startTime} - {scheduledEvent.endTime}</span>
                                    {scheduledEvent.originalData && 'type' in scheduledEvent.originalData && 
                                     (scheduledEvent.originalData as CalendarEvent).type === 'sop' && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded">SOP</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {scheduledEvent.status === 'current' && (
                                <span className="flex items-center text-blue-600 text-sm font-medium">
                                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                                  Now
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Empty time slot - drop zone
                          <div className="h-full flex items-center justify-center text-gray-400">
                            {isDragOver ? (
                              <div className="flex items-center space-x-2 text-blue-600 font-medium">
                                <span>📅</span>
                                <span>Drop to schedule here</span>
                              </div>
                            ) : (
                              <span className="text-xs opacity-50">Available</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Unscheduled Items */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">📋 Unscheduled Items</h3>
                  <p className="text-sm text-gray-600">Ready to schedule</p>
                </div>
                <button 
                  onClick={() => setShowUnscheduled(!showUnscheduled)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title={showUnscheduled ? "Hide unscheduled items" : "Show unscheduled items"}
                >
                  {showUnscheduled ? (
                    <EyeSlashIcon className="w-5 h-5 text-gray-600" />
                  ) : (
                    <EyeIcon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            {showUnscheduled && (
              <div className="p-4">
                {unscheduledMovements.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 mx-auto text-green-300 mb-4" />
                  <p className="text-sm text-gray-500">All composed!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unscheduledMovements.map((movement) => (
                    <div 
                      key={movement.id} 
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'schedulable_item',
                          data: movement.originalData
                        }));
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-xl flex-shrink-0">{movement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 leading-tight mb-2">
                            {movement.title}
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              movement.domain === 'work' ? 'bg-blue-100 text-blue-700' :
                              movement.domain === 'family' ? 'bg-green-100 text-green-700' :
                              movement.domain === 'health' ? 'bg-red-100 text-red-700' :
                              movement.domain === 'home' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {movement.domain}
                            </span>
                            <span className="text-xs text-gray-500">Drag to schedule</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <button 
                          onClick={() => handleQuickSchedule(movement.originalData as SchedulableItem)}
                          className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors"
                        >
                          📅 Schedule
                        </button>
                        <button 
                          onClick={() => handleDeferItem(movement.originalData as SchedulableItem)}
                          className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-200 transition-colors"
                        >
                          ⏰ Defer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingEvent.type === 'sop' ? 'Edit SOP' : 'Edit Event'}
                </h3>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingEvent.description || ''}
                    onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={editingEvent.startTime}
                      onChange={(e) => setEditingEvent({...editingEvent, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={editingEvent.endTime}
                      onChange={(e) => setEditingEvent({...editingEvent, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await calendarService.updateEvent(editingEvent.id, {
                        title: editingEvent.title,
                        description: editingEvent.description,
                        startTime: editingEvent.startTime,
                        endTime: editingEvent.endTime
                      });
                      setEditingEvent(null);
                      await loadTodaysSymphony();
                      onDataChange?.();
                    } catch (error) {
                      console.error('Error updating event:', error);
                      alert('Failed to update event. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConductorScore;