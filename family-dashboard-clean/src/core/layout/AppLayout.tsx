import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CakeIcon
} from '@heroicons/react/24/outline';

interface AppLayoutProps {
  contextId: string;
  userId: string;
  children: React.ReactNode;
}

const apps = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: HomeIcon,
    description: 'Overview & quick actions'
  },
  {
    id: 'sop-manager',
    name: 'SOPs',
    path: '/sop-manager',
    icon: FolderIcon,
    description: 'Standard Operating Procedures'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    path: '/calendar',
    icon: CalendarIcon,
    description: 'Schedule & planning'
  },
  {
    id: 'projects',
    name: 'Projects',
    path: '/projects',
    icon: ClipboardDocumentListIcon,
    description: 'Project management'
  },
  {
    id: 'meals',
    name: 'Meals',
    path: '/meals',
    icon: CakeIcon,
    description: 'Meal planning'
  }
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {apps.map((app) => {
              const Icon = app.icon;
              const isActive = location.pathname === app.path;
              
              return (
                <button
                  key={app.id}
                  onClick={() => navigate(app.path)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{app.name}</div>
                    <div className="text-xs text-gray-400">{app.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};