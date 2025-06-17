import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface DashboardLayoutProps {
  contextId: string;
  userId: string;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  contextId,
  userId,
  children
}) => {
  const navigate = useNavigate();

  const appNavigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      description: 'Overview of all apps'
    },
    {
      name: 'SOP Manager',
      href: '/sop-manager',
      icon: FolderIcon,
      description: 'Standard Operating Procedures'
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: CalendarIcon,
      description: 'Schedule & Planning'
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: ClipboardDocumentListIcon,
      description: 'Project Management'
    },
    {
      name: 'Meal Planner',
      href: '/meals',
      icon: ChartBarIcon,
      description: 'Meal Planning & Nutrition'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {appNavigation.map((app) => {
              const Icon = app.icon;
              const isActive = window.location.pathname === app.href;
              
              return (
                <button
                  key={app.name}
                  onClick={() => navigate(app.href)}
                  className={`flex items-center space-x-2 py-4 px-3 border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{app.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;