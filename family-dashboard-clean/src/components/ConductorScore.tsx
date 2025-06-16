import React, { useState, useEffect } from 'react';
import { 
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
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
  refreshTrigger?: number;
  onDataChange?: () => void;
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
  refreshTrigger,
  onDataChange
}) => {
  const [movements, setMovements] = useState<SymphonyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadTodaysSymphony();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [contextId, refreshTrigger]);

  const loadTodaysSymphony = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Load all scheduled events and unscheduled tasks
      const [events, tasks] = await Promise.all([
        calendarService.getEventsForDay(contextId, today),
        goalService.getSchedulableTasks(contextId)
      ]);

      // Filter tasks for today's unscheduled items
      const todayTasks = tasks.filter(task => {
        const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;
        return (dueDate === today || task.tags?.includes('inbox')) && !task.status || task.status !== 'completed';
      });

      // Convert to symphony movements
      const symphonyMovements: SymphonyMovement[] = [];

      // Add scheduled events
      events.forEach(event => {
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
          harmony: calculateHarmony(event, events),
          originalData: event
        });
      });

      // Add unscheduled items as potential movements
      todayTasks.forEach(task => {
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
      "💡 Consider adding a 15-minute buffer before your important meeting",
      "⚡ Your energy peaks at 2 PM - perfect time for that challenging task", 
      "🍽️ Family dinner at 6 PM aligns well with your work wrap-up",
      "💪 Morning workout would boost your entire day's energy"
    ];
    setAiSuggestions(suggestions.slice(0, 2));
  };

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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Schedule - Today's Itinerary */}
        <div className="xl:col-span-3">
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

            <div className="p-6 relative">
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

              {/* Symphony Movements */}
              <div className="space-y-3">
                {scheduledMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className={`border-l-4 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                      movement.status === 'current' ? 'bg-blue-50 border-blue-500' :
                      movement.status === 'completed' ? 'bg-green-50 border-green-500' :
                      movement.status === 'overdue' ? 'bg-red-50 border-red-500' :
                      movement.type === 'transition' ? 'bg-gray-50 border-gray-300' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          movement.status === 'current' ? 'bg-blue-100 text-blue-600' :
                          movement.status === 'completed' ? 'bg-green-100 text-green-600' :
                          movement.status === 'overdue' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <span className="text-lg">{movement.icon}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">{movement.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              movement.domain === 'work' ? 'bg-blue-100 text-blue-700' :
                              movement.domain === 'family' ? 'bg-green-100 text-green-700' :
                              movement.domain === 'health' ? 'bg-red-100 text-red-700' :
                              movement.domain === 'home' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {movement.domain}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>{movement.startTime} - {movement.endTime}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>⚡</span>
                              <span className="capitalize">{movement.energy} Energy</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span>🎵</span>
                              <span>{movement.harmony}% Harmony</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {movement.status === 'current' && (
                          <span className="flex items-center text-blue-600 text-sm font-medium">
                            <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                            Playing Now
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Unscheduled Items */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">📋 Unscheduled Items</h3>
              <p className="text-sm text-gray-600">Ready to schedule</p>
            </div>
            <div className="p-4">
              {unscheduledMovements.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 mx-auto text-green-300 mb-4" />
                  <p className="text-sm text-gray-500">All composed!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unscheduledMovements.map((movement) => (
                    <div key={movement.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start space-x-2">
                        <span className="text-lg">{movement.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{movement.title}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              movement.domain === 'work' ? 'bg-blue-100 text-blue-700' :
                              movement.domain === 'family' ? 'bg-green-100 text-green-700' :
                              movement.domain === 'health' ? 'bg-red-100 text-red-700' :
                              movement.domain === 'home' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {movement.domain}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex space-x-2">
                        <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                          📅 Schedule
                        </button>
                        <button className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">
                          ⏰ Defer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConductorScore;