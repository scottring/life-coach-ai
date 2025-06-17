import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CakeIcon,
  ArrowRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface DashboardAppProps {
  contextId: string;
  userId: string;
}

const quickActions = [
  {
    name: 'Create SOP',
    description: 'New standard operating procedure',
    icon: FolderIcon,
    color: 'blue',
    path: '/sop-manager'
  },
  {
    name: 'Schedule Event',
    description: 'Add to calendar',
    icon: CalendarIcon,
    color: 'green',
    path: '/calendar'
  },
  {
    name: 'New Project',
    description: 'Start a project',
    icon: ClipboardDocumentListIcon,
    color: 'purple',
    path: '/projects'
  },
  {
    name: 'Plan Meals',
    description: 'Weekly meal planning',
    icon: CakeIcon,
    color: 'orange',
    path: '/meals'
  }
];

export const DashboardApp: React.FC<DashboardAppProps> = ({ contextId, userId }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Your life management hub</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.name}
              onClick={() => navigate(action.path)}
              className={`p-6 bg-white rounded-lg border border-gray-200 hover:border-${action.color}-300 hover:shadow-md transition-all text-left group`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-3 bg-${action.color}-100 rounded-lg group-hover:bg-${action.color}-200 transition-colors`}>
                  <Icon className={`w-6 h-6 text-${action.color}-600`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Apps Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent SOPs */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Recent SOPs</h3>
            <button
              onClick={() => navigate('/sop-manager')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900">Morning Routine</div>
              <div className="text-xs text-gray-500">Last executed 2 hours ago</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900">Weekly Planning</div>
              <div className="text-xs text-gray-500">Scheduled for 2:00 PM</div>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/sop-manager')}
            className="w-full mt-4 p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mx-auto" />
          </button>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Today's Schedule</h3>
            <button
              onClick={() => navigate('/calendar')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900">Team Meeting</div>
              <div className="text-xs text-gray-500">10:00 AM - 11:00 AM</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900">Lunch Break</div>
              <div className="text-xs text-gray-500">12:00 PM - 1:00 PM</div>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/calendar')}
            className="w-full mt-4 p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mx-auto" />
          </button>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Active Projects</h3>
            <button
              onClick={() => navigate('/projects')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900">Home Setup</div>
              <div className="text-xs text-gray-500">3 tasks remaining</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-900">Work Projects</div>
              <div className="text-xs text-gray-500">7 tasks remaining</div>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/projects')}
            className="w-full mt-4 p-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};