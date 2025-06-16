import React from 'react';
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface OperationalOverviewViewProps {
  contextId: string;
  userId: string;
}

const OperationalOverviewView: React.FC<OperationalOverviewViewProps> = ({
  contextId,
  userId
}) => {
  // Mock data - would be replaced with real data from services
  const stats = {
    todayProgress: 65,
    weekProgress: 42,
    overdueTasks: 3,
    upcomingEvents: 7,
    completedToday: 8,
    totalToday: 12
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

  const recentActivity = [
    { id: 1, action: "Completed", item: "Morning Routine", time: "8:30 AM", type: "sop" },
    { id: 2, action: "Started", item: "Team Meeting", time: "9:00 AM", type: "event" },
    { id: 3, action: "Scheduled", item: "Grocery Shopping", time: "2:00 PM", type: "task" },
    { id: 4, action: "Completed", item: "Review Project X", time: "Yesterday", type: "task" }
  ];

  const upcomingItems = [
    { id: 1, title: "Lunch Break", time: "12:00 PM", type: "break" },
    { id: 2, title: "Client Call", time: "2:30 PM", type: "event" },
    { id: 3, title: "Meal Prep", time: "5:00 PM", type: "task" },
    { id: 4, title: "Evening Routine", time: "9:00 PM", type: "sop" }
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Operational Overview
        </h2>
        <p className="text-gray-600">
          Monitor your daily and weekly progress
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

      {/* Compact Widget Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tasks Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Tasks</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pending</span>
              <span className="font-medium">12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">In Progress</span>
              <span className="font-medium">3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Completed Today</span>
              <span className="font-medium text-green-600">8</span>
            </div>
          </div>
        </div>

        {/* Calendar Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Calendar</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Today's Events</span>
              <span className="font-medium">5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Week</span>
              <span className="font-medium">23</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Free Time</span>
              <span className="font-medium text-blue-600">4h 30m</span>
            </div>
          </div>
        </div>

        {/* Goals Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Goals</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Active Goals</span>
              <span className="font-medium">7</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">On Track</span>
              <span className="font-medium text-green-600">5</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Need Attention</span>
              <span className="font-medium text-yellow-600">2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalOverviewView;