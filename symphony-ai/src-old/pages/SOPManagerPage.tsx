import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import SOPWidget from '../components/SOPWidget';
import EditGeneralSOPModal from '../components/EditGeneralSOPModal';

interface SOPManagerPageProps {
  contextId?: string;
  userId?: string;
}

const SOPManagerPage: React.FC<SOPManagerPageProps> = ({ 
  contextId: propContextId, 
  userId: propUserId 
}) => {
  const { contextId: routeContextId } = useParams();
  const navigate = useNavigate();
  const [showCreateSOP, setShowCreateSOP] = useState(false);
  const [sopRefreshTrigger, setSopRefreshTrigger] = useState(0);

  // Use contextId from props or route params
  const contextId = propContextId || routeContextId || '';
  // In a real app, userId would come from authentication
  const userId = propUserId || 'current-user';

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FolderIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">SOP Manager</h1>
                  <p className="text-sm text-gray-500">Standard Operating Procedures</p>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/calendar')}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Schedule SOPs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main SOP Manager - Takes up 3 columns */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <SOPWidget
                contextId={contextId}
                userId={userId}
                onCreateSOP={() => setShowCreateSOP(true)}
                refreshTrigger={sopRefreshTrigger}
              />
            </div>
          </div>

          {/* Connected Apps Sidebar - Takes up 1 column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Calendar Integration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <span>Today's Schedule</span>
                </h3>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">9:00 AM</span>
                    <span className="text-gray-900">Morning Routine</span>
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">2:00 PM</span>
                    <span className="text-gray-900">Weekly Planning</span>
                  </div>
                </div>
                <div className="text-center py-4">
                  <button
                    onClick={() => navigate('/calendar')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Schedule SOP
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Project Integration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <ClockIcon className="w-4 h-4 text-green-600" />
                  <span>Active Projects</span>
                </h3>
                <button
                  onClick={() => navigate('/projects')}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  View All
                </button>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded text-sm">
                  <div className="text-gray-900 font-medium">Home Setup</div>
                  <div className="text-gray-600 text-xs">3 tasks remaining</div>
                </div>
                <div className="p-2 bg-gray-50 rounded text-sm">
                  <div className="text-gray-900 font-medium">Work Projects</div>
                  <div className="text-gray-600 text-xs">7 tasks remaining</div>
                </div>
                <div className="text-center py-4">
                  <button
                    onClick={() => navigate('/projects')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Create Project
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4">SOP Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total SOPs</span>
                  <span className="text-sm font-medium text-gray-900">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed Today</span>
                  <span className="text-sm font-medium text-green-600">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Scheduled</span>
                  <span className="text-sm font-medium text-blue-600">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Time</span>
                  <span className="text-sm font-medium text-gray-900">25 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create SOP Modal */}
      {showCreateSOP && (
        <EditGeneralSOPModal
          isOpen={showCreateSOP}
          onClose={() => setShowCreateSOP(false)}
          contextId={contextId}
          userId={userId}
          onSOPUpdated={() => {
            setShowCreateSOP(false);
            setSopRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default SOPManagerPage;