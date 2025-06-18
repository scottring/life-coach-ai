import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface ConnectedAppsProps {
  contextId: string;
  userId: string;
}

export const ConnectedApps: React.FC<ConnectedAppsProps> = ({ 
  contextId, 
  userId 
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Today's Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span>Today's Schedule</span>
          </h3>
          <button
            onClick={() => navigate('/calendar')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Morning Routine</div>
                <div className="text-xs text-gray-500">9:00 AM - 9:30 AM</div>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Scheduled
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Weekly Planning</div>
                <div className="text-xs text-gray-500">2:00 PM - 2:45 PM</div>
              </div>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Upcoming
              </span>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/calendar')}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Schedule SOP</span>
          </button>
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <ClipboardDocumentListIcon className="w-5 h-5 text-green-600" />
            <span>Active Projects</span>
          </h3>
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Home Setup</div>
                <div className="text-xs text-gray-500">3 tasks remaining</div>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">Work Projects</div>
                <div className="text-xs text-gray-500">7 tasks remaining</div>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <button
            onClick={() => navigate('/projects')}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-green-300 hover:text-green-600 transition-colors flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="space-y-2">
          <button
            onClick={() => navigate('/calendar')}
            className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Schedule SOPs</div>
              <div className="text-xs text-gray-500">Plan your procedures</div>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/projects')}
            className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ClipboardDocumentListIcon className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Link to Projects</div>
              <div className="text-xs text-gray-500">Connect with tasks</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};