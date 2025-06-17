import React from 'react';
import { 
  FolderIcon,
  ClipboardDocumentListIcon,
  CakeIcon,
  PlusIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface CalendarSidebarProps {
  contextId: string;
  userId: string;
  onNavigate: (path: string) => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ 
  contextId, 
  userId, 
  onNavigate 
}) => {
  return (
    <div className="space-y-6">
      {/* Today's Schedule Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
            <span>Today's Schedule</span>
          </h3>
        </div>
        
        <div className="space-y-3">
          <div className="text-center py-8 text-gray-500">
            <CalendarDaysIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No events scheduled</p>
            <p className="text-xs">Drag items here to schedule</p>
          </div>
        </div>
      </div>

      {/* Draggable SOPs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <FolderIcon className="w-5 h-5 text-purple-600" />
            <span>Available SOPs</span>
          </h3>
          <button
            onClick={() => onNavigate('/sop-manager')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-2">
          <div 
            className="p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-move hover:bg-purple-100 transition-colors"
            draggable
            data-type="sop"
            data-title="Morning Routine"
            data-duration="30"
            data-description="Daily morning routine checklist"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">Morning Routine</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">30 min • 8 steps</div>
          </div>
          
          <div 
            className="p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-move hover:bg-purple-100 transition-colors"
            draggable
            data-type="sop"
            data-title="Weekly Planning"
            data-duration="45"
            data-description="Weekly review and planning session"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">Weekly Planning</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">45 min • 12 steps</div>
          </div>
          
          <button
            onClick={() => onNavigate('/sop-manager')}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add SOPs</span>
          </button>
        </div>
      </div>

      {/* Draggable Projects */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
            <ClipboardDocumentListIcon className="w-5 h-5 text-cyan-600" />
            <span>Project Tasks</span>
          </h3>
          <button
            onClick={() => onNavigate('/projects')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-2">
          <div 
            className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg cursor-move hover:bg-cyan-100 transition-colors"
            draggable
            data-type="project"
            data-title="Setup Home Office"
            data-duration="120"
            data-description="Complete home office setup"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">Setup Home Office</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">2 hours • High priority</div>
          </div>
          
          <div 
            className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg cursor-move hover:bg-cyan-100 transition-colors"
            draggable
            data-type="project"
            data-title="Review Documents"
            data-duration="60"
            data-description="Review and organize important documents"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">Review Documents</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">1 hour • Medium priority</div>
          </div>
          
          <button
            onClick={() => onNavigate('/projects')}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-cyan-300 hover:text-cyan-600 transition-colors flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Tasks</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="space-y-2">
          <button
            onClick={() => onNavigate('/sop-manager')}
            className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <FolderIcon className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Manage SOPs</div>
              <div className="text-xs text-gray-500">Create and organize procedures</div>
            </div>
          </button>
          
          <button
            onClick={() => onNavigate('/projects')}
            className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ClipboardDocumentListIcon className="w-5 h-5 text-cyan-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Project Manager</div>
              <div className="text-xs text-gray-500">Organize tasks and projects</div>
            </div>
          </button>
          
          <button
            onClick={() => onNavigate('/meals')}
            className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <CakeIcon className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Meal Planner</div>
              <div className="text-xs text-gray-500">Schedule meal planning</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};