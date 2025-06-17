import React, { useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import CalendaringWidget from './CalendaringWidget';
import TodoWidget from './TodoWidget';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';
import SOPWidget from './SOPWidget';
import ProjectListWidget from './ProjectListWidget';
import EditGeneralSOPModal from './EditGeneralSOPModal';

interface InstrumentPanelProps {
  contextId: string;
  userId: string;
  widgetConfig: Array<{
    id: string;
    domain: string;
    name: string;
    visible: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    minimized: boolean;
  }>;
  lifeDomains: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
  }>;
  onDataChange?: () => void;
  onInboxRefresh?: () => void;
}

const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  contextId,
  userId,
  widgetConfig,
  lifeDomains,
  onDataChange,
  onInboxRefresh
}) => {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);
  const [showCreateSOP, setShowCreateSOP] = useState(false);
  const [sopRefreshTrigger, setSopRefreshTrigger] = useState(0);

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.setData('text/plain', widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverWidget(widgetId);
  };

  const handleDragLeave = () => {
    setDragOverWidget(null);
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    const sourceWidgetId = e.dataTransfer.getData('text/plain');
    
    if (sourceWidgetId && sourceWidgetId !== targetWidgetId) {
      // Find the positions of source and target widgets
      const sourceIndex = widgetConfig.findIndex(w => w.id === sourceWidgetId);
      const targetIndex = widgetConfig.findIndex(w => w.id === targetWidgetId);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Swap the positions
        const newConfig = [...widgetConfig];
        [newConfig[sourceIndex], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[sourceIndex]];
        
        // In a real implementation, you'd save this to your state management
        console.log('Widget positions swapped:', sourceWidgetId, '↔', targetWidgetId);
      }
    }
    
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {widgetConfig.map((widget) => {
        const domain = lifeDomains.find(d => d.id === widget.domain);
        const domainColor = domain?.color || 'gray';
        
        return (
          <div 
            key={widget.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 ${
              widget.size.width === 2 ? 'lg:col-span-2' : ''
            } ${
              draggedWidget === widget.id ? 'opacity-50 scale-95' : ''
            } ${
              dragOverWidget === widget.id ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
          >
            {/* Widget Header */}
            <div className={`px-4 py-3 border-b border-gray-200 bg-${domainColor}-50`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{domain?.icon || '🎵'}</span>
                  <h3 className="font-medium text-gray-900">{widget.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full bg-${domainColor}-100 text-${domainColor}-700`}>
                    {widget.domain}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div 
                    className="text-gray-400 hover:text-gray-600 cursor-move p-1"
                    title="Drag to reorder widgets"
                  >
                    <Bars3Icon className="w-4 h-4" />
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <span className="text-sm">−</span>
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <span className="text-sm">⋮⋮</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Widget Content */}
            <div className="p-4">
              {widget.id === 'calendaring' && (
                <CalendaringWidget
                  contextId={contextId}
                  userId={userId}
                  onDataChange={onDataChange}
                  onInboxRefresh={onInboxRefresh}
                />
              )}
              
              {widget.id === 'family-planning' && (
                <TodoWidget contextId={contextId} userId={userId} domain="family" />
              )}
              
              {widget.id === 'meal-planning' && (
                <MealPlannerWidget familyId={contextId} userId={userId} />
              )}
              
              {widget.id === 'work-projects' && (
                <div className="text-center py-8 text-gray-500">
                  🎻 Work Symphony - Coming Soon
                </div>
              )}
              
              {widget.id === 'health-wellness' && (
                <div className="text-center py-8 text-gray-500">
                  🥁 Wellness Rhythm - Coming Soon
                </div>
              )}

              {widget.id === 'sop-widget' && (
                <SOPWidget 
                  contextId={contextId} 
                  userId={userId}
                  onCreateSOP={() => setShowCreateSOP(true)}
                  refreshTrigger={sopRefreshTrigger}
                />
              )}

              {widget.id === 'project-lists' && (
                <ProjectListWidget
                  contextId={contextId}
                  userId={userId}
                  onItemScheduled={onDataChange}
                />
              )}
            </div>
          </div>
        );
      })}
      
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
            onDataChange?.();
          }}
        />
      )}
    </div>
  );
};

export default InstrumentPanel;