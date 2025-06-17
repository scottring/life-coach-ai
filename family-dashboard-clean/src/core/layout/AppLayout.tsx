import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CakeIcon,
  CurrencyDollarIcon,
  SunIcon,
  RectangleStackIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

interface AppLayoutProps {
  contextId: string;
  userId: string;
  children: React.ReactNode;
}

// Core 3 views - primary navigation
const coreViews = [
  {
    id: 'today',
    name: 'Today',
    path: '/today',
    icon: SunIcon,
    description: 'What matters now'
  },
  {
    id: 'planning',
    name: 'Planning',
    path: '/planning',
    icon: CalendarIcon,
    description: 'Schedule & organize'
  },
  {
    id: 'capture',
    name: 'Capture',
    path: '/capture',
    icon: PlusCircleIcon,
    description: 'Brain dump & process'
  }
];

// Secondary tools - for detailed work
const secondaryApps = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: HomeIcon,
    description: 'Overview & widgets'
  },
  {
    id: 'sop-manager',
    name: 'SOPs',
    path: '/sop-manager',
    icon: FolderIcon,
    description: 'Build workflows'
  },
  {
    id: 'meals',
    name: 'Meal Planner',
    path: '/meals',
    icon: CakeIcon,
    description: 'Plan weekly meals'
  },
  {
    id: 'projects',
    name: 'Projects',
    path: '/projects',
    icon: ClipboardDocumentListIcon,
    description: 'Project details'
  },
  {
    id: 'finance',
    name: 'Finance',
    path: '/finance',
    icon: CurrencyDollarIcon,
    description: 'Budget tracking'
  }
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSecondary, setShowSecondary] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between">
            {/* Primary Navigation - Core Views */}
            <div className="flex space-x-8">
              {coreViews.map((app) => {
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

            {/* Secondary Navigation - Tools */}
            <div className="relative">
              <button
                onClick={() => setShowSecondary(!showSecondary)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                  secondaryApps.some(app => location.pathname === app.path)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <RectangleStackIcon className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-sm font-medium">Tools</div>
                  <div className="text-xs text-gray-400">Specialized apps</div>
                </div>
              </button>

              {/* Dropdown for secondary apps */}
              {showSecondary && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    {secondaryApps.map((app) => {
                      const Icon = app.icon;
                      const isActive = location.pathname === app.path;
                      
                      return (
                        <button
                          key={app.id}
                          onClick={() => {
                            navigate(app.path);
                            setShowSecondary(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <div>
                            <div className="text-sm font-medium">{app.name}</div>
                            <div className="text-xs text-gray-400">{app.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Click outside to close dropdown */}
      {showSecondary && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSecondary(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};