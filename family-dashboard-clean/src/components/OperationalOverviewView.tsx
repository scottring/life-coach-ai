import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ListBulletIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import TodoWidget from './TodoWidget';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';
import { goalService } from '../services/goalService';
import { calendarService } from '../services/calendarService';

interface OperationalOverviewViewProps {
  contextId: string;
  userId: string;
}

const OperationalOverviewView: React.FC<OperationalOverviewViewProps> = ({
  contextId,
  userId
}) => {
  const [stats, setStats] = useState({
    todayProgress: 0,
    weekProgress: 0,
    overdueTasks: 0,
    upcomingEvents: 0,
    completedToday: 0,
    totalToday: 0,
    activeGoals: 0,
    onTrackGoals: 0,
    needAttentionGoals: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contextId) {
      loadDashboardData();
    }
  }, [contextId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load tasks data
      const tasks = await goalService.getTasksByContext(contextId);
      const today = new Date().toISOString().split('T')[0];
      
      const todayTasks = tasks.filter(task => {
        return task.scheduledDate === today || 
               (task.dueDate === today && !task.scheduledDate);
      });
      
      const completedToday = todayTasks.filter(task => task.status === 'completed').length;
      const overdueTasks = tasks.filter(task => 
        task.dueDate && task.dueDate < today && task.status !== 'completed'
      ).length;
      
      // Load calendar events for today
      const todayEvents = await calendarService.getEventsForDateRange(contextId, today, today);
      
      // Load goals data
      const goals = await goalService.getGoalsByContext(contextId);
      const activeGoals = goals.filter(goal => goal.status === 'in_progress' || goal.status === 'not_started');
      const onTrackGoals = activeGoals.filter(goal => {
        // Simple heuristic: goals with recent progress
        return goal.progress && goal.progress > 0;
      });
      
      // Calculate progress percentages
      const todayProgress = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;
      
      // Generate recent activity from tasks and events
      const recentTaskActivity = tasks
        .filter(task => task.updatedAt && new Date(task.updatedAt).toDateString() === new Date().toDateString())
        .slice(0, 2)
        .map(task => ({
          id: `task-${task.id}`,
          action: task.status === 'completed' ? 'Completed' : 'Updated',
          item: task.title,
          time: new Date(task.updatedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'task'
        }));
        
      // Generate upcoming items from today's schedule
      const upcomingToday = [
        ...todayEvents.slice(0, 3).map(event => ({
          id: `event-${event.id}`,
          title: event.title,
          time: new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'event'
        })),
        ...todayTasks.filter(task => task.status !== 'completed').slice(0, 2).map(task => ({
          id: `task-${task.id}`,
          title: task.title,
          time: task.scheduledDate ? 'Scheduled' : 'Pending',
          type: 'task'
        }))
      ];

      setStats({
        todayProgress,
        weekProgress: 42, // Would calculate based on weekly goals
        overdueTasks,
        upcomingEvents: todayEvents.length,
        completedToday,
        totalToday: todayTasks.length,
        activeGoals: activeGoals.length,
        onTrackGoals: onTrackGoals.length,
        needAttentionGoals: activeGoals.length - onTrackGoals.length
      });
      
      setRecentActivity(recentTaskActivity);
      setUpcomingItems(upcomingToday);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickMetrics = [
    {
      title: "Today's Progress",
      value: `${stats.completedToday}/${stats.totalToday}`,
      percentage: stats.todayProgress,
      icon: ChartBarIcon,
      color: "blue"
    },
    {
      title: "Week Progress",
      value: `${stats.weekProgress}%`,
      percentage: stats.weekProgress,
      icon: CalendarDaysIcon,
      color: "green"
    },
    {
      title: "Overdue Items",
      value: stats.overdueTasks,
      icon: ExclamationTriangleIcon,
      color: "red",
      alert: stats.overdueTasks > 0
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: ClockIcon,
      color: "yellow"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-500 text-blue-600 bg-blue-50",
      green: "bg-green-500 text-green-600 bg-green-50", 
      red: "bg-red-500 text-red-600 bg-red-50",
      yellow: "bg-yellow-500 text-yellow-600 bg-yellow-50"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Operational Overview</h2>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          🎯 Operational Overview
        </h2>
        <p className="text-gray-600">
          Monitor your daily and weekly progress across all areas
        </p>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickMetrics.map((metric) => {
          const Icon = metric.icon;
          const colorClasses = getColorClasses(metric.color).split(' ');
          
          return (
            <div
              key={metric.title}
              className={`relative overflow-hidden rounded-lg border p-6 ${
                metric.alert ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[2]}`}>
                  <Icon className={`h-6 w-6 ${colorClasses[1]}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                </div>
              </div>
              
              {metric.percentage !== undefined && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{metric.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${colorClasses[0]}`}
                      style={{ width: `${metric.percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {metric.alert && (
                <div className="absolute top-2 right-2">
                  <div className="h-3 w-3 bg-red-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 py-2">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'sop' ? 'bg-blue-500' :
                  activity.type === 'event' ? 'bg-green-500' :
                  activity.type === 'task' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.action}</span>{' '}
                    <span className="text-gray-600">{activity.item}</span>
                  </p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Coming Up</h3>
          <div className="space-y-3">
            {upcomingItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.type === 'sop' ? 'bg-blue-100' :
                    item.type === 'event' ? 'bg-green-100' :
                    item.type === 'task' ? 'bg-yellow-100' :
                    'bg-gray-100'
                  }`}>
                    {item.type === 'event' ? <CalendarDaysIcon className="w-4 h-4" /> :
                     item.type === 'task' ? <CheckCircleIcon className="w-4 h-4" /> :
                     <ClockIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
                <button className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Smart Widget Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tasks Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-3">
            <ListBulletIcon className="w-4 h-4 text-blue-600 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Tasks</h4>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Today</span>
                <span className="font-medium">{stats.totalToday}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">{stats.completedToday}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overdue</span>
                <span className={`font-medium ${stats.overdueTasks > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {stats.overdueTasks}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Calendar Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-3">
            <CalendarDaysIcon className="w-4 h-4 text-green-600 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Calendar</h4>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Today's Events</span>
                <span className="font-medium">{stats.upcomingEvents}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-blue-600">{stats.todayProgress}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium text-sm ${stats.overdueTasks > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {stats.overdueTasks > 0 ? 'Behind' : 'On Track'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Goals Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-3">
            <CubeIcon className="w-4 h-4 text-purple-600 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">Goals</h4>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Goals</span>
                <span className="font-medium">{stats.activeGoals}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">On Track</span>
                <span className="font-medium text-green-600">{stats.onTrackGoals}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Need Attention</span>
                <span className="font-medium text-yellow-600">{stats.needAttentionGoals}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Existing Widgets Integration */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Todo Widget */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <ListBulletIcon className="w-4 h-4 mr-2 text-blue-600" />
              Quick Tasks
            </h4>
          </div>
          <div className="h-64 overflow-y-auto">
            <TodoWidget familyId={contextId} userId={userId} />
          </div>
        </div>

        {/* Meal Planner Widget */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-yellow-50">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <HeartIcon className="w-4 h-4 mr-2 text-green-600" />
              Meal Planning
            </h4>
          </div>
          <div className="h-64 overflow-y-auto">
            <MealPlannerWidget familyId={contextId} userId={userId} />
          </div>
        </div>

        {/* Dog Behavior Widget */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <HeartIcon className="w-4 h-4 mr-2 text-amber-600" />
              Pet Monitoring
            </h4>
          </div>
          <div className="h-64 overflow-y-auto">
            <DogBehaviorWidget familyId={contextId} userId={userId} />
          </div>
        </div>
      </div>

      {/* Session Analytics - only show when there's data */}
      <div className="mt-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Session Analytics</h4>
          <div className="text-center text-gray-500 py-8">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Session analytics will appear here when data becomes available</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalOverviewView;