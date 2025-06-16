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
import CalendaringWidget from './CalendaringWidget';
import InboxWidget from './InboxWidget';
import { goalService } from '../services/goalService';
import { calendarService } from '../services/calendarService';

interface OperationalOverviewViewProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

const OperationalOverviewView: React.FC<OperationalOverviewViewProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contextId) {
      loadDashboardData();
    }
  }, [contextId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load tasks and calculate progress
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const [tasks, events] = await Promise.all([
        goalService.getSchedulableTasks(contextId),
        calendarService.getEventsForDay(contextId, todayStr)
      ]);
      
      const todayTasks = tasks.filter(task => {
        const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;
        return dueDate === todayStr;
      });
      
      const completedToday = todayTasks.filter(task => task.status === 'completed').length;
      const overdueTasks = tasks.filter(task => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        return dueDate && dueDate < today && task.status !== 'completed';
      }).length;
      
      setStats({
        todayProgress: todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0,
        weekProgress: 75, // Placeholder
        overdueTasks,
        upcomingEvents: events.length,
        completedToday,
        totalToday: todayTasks.length,
        activeGoals: 5, // Placeholder
        onTrackGoals: 4, // Placeholder
        needAttentionGoals: 1 // Placeholder
      });
      
      // Mock recent activity
      setRecentActivity([
        { id: '1', action: 'Completed', item: 'Morning routine', time: '2 hours ago', type: 'sop' },
        { id: '2', action: 'Scheduled', item: 'Team meeting', time: '3 hours ago', type: 'event' },
        { id: '3', action: 'Added', item: 'Buy groceries', time: '4 hours ago', type: 'task' },
      ]);
      
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
      value: "75%",
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
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
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
          🎯 Dashboard
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

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="xl:col-span-2 space-y-8">
          {/* Calendaring Widget */}
          <CalendaringWidget
            contextId={contextId}
            userId={userId}
            refreshTrigger={refreshTrigger}
            onDataChange={onDataChange}
          />
          
          {/* Todo/Goals Widget */}
          <TodoWidget familyId={contextId} userId={userId} />
          
          {/* Meal Planning Widget */}
          <MealPlannerWidget familyId={contextId} userId={userId} />
        </div>

        {/* Right Column - Side Widgets */}
        <div className="space-y-8">
          {/* Inbox Widget */}
          <InboxWidget
            contextId={contextId}
            userId={userId}
            onItemScheduled={onDataChange}
          />
          
          {/* Dog Behavior Widget */}
          <DogBehaviorWidget familyId={contextId} userId={userId} />
          
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((activity) => (
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
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalOverviewView;