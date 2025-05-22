import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function DashboardSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const dashboards = [
    {
      id: 'overview',
      name: 'Life Overview',
      description: 'Your complete productivity overview',
      icon: '🏠',
      path: '/dashboard'
    },
    {
      id: 'family',
      name: 'Family Dashboard', 
      description: 'Shared tasks, meals, chores & goals',
      icon: '👨‍👩‍👧‍👦',
      path: '/dashboard/family'
    },
    {
      id: 'work',
      name: 'Work Focus',
      description: 'Professional tasks and projects',
      icon: '💼',
      path: '/dashboard/work'
    }
  ];

  const getCurrentDashboard = () => {
    const currentPath = location.pathname;
    return dashboards.find(d => d.path === currentPath) || dashboards[0];
  };

  const [isOpen, setIsOpen] = useState(false);
  const currentDashboard = getCurrentDashboard();

  const handleDashboardChange = (dashboard) => {
    navigate(dashboard.path);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-lg bg-white px-4 py-2 shadow-sm border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-lg">{currentDashboard.icon}</span>
        <div className="text-left">
          <div className="font-medium text-gray-900">{currentDashboard.name}</div>
          <div className="text-xs text-gray-500">{currentDashboard.description}</div>
        </div>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-10 mt-1 w-80 rounded-lg bg-white shadow-lg border border-gray-200">
          <div className="p-2">
            {dashboards.map((dashboard) => (
              <button
                key={dashboard.id}
                onClick={() => handleDashboardChange(dashboard)}
                className={`w-full text-left rounded-md p-3 hover:bg-gray-50 transition-colors ${
                  currentDashboard.id === dashboard.id ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{dashboard.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{dashboard.name}</div>
                    <div className="text-sm text-gray-500">{dashboard.description}</div>
                  </div>
                  {currentDashboard.id === dashboard.id && (
                    <div className="ml-auto">
                      <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardSelector;