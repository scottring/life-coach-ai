import React from 'react';
import {
  CalendarDaysIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export type ViewMode = 'daily' | 'weekly' | 'overview';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  currentMode,
  onModeChange
}) => {
  const modes = [
    {
      id: 'daily' as ViewMode,
      label: 'Daily',
      icon: CalendarDaysIcon,
      description: 'Today\'s itinerary'
    },
    {
      id: 'weekly' as ViewMode,
      label: 'Weekly',
      icon: CalendarIcon,
      description: 'Weekly planning'
    },
    {
      id: 'overview' as ViewMode,
      label: 'Overview',
      icon: ChartBarIcon,
      description: 'Operational status'
    }
  ];

  return (
    <div className="flex items-center">
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={mode.description}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewModeSwitcher;