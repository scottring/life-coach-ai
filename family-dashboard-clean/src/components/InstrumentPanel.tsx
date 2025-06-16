import React from 'react';
import CalendaringWidget from './CalendaringWidget';
import TodoWidget from './TodoWidget';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';
import SOPWidget from './SOPWidget';

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {widgetConfig.map((widget) => {
        const domain = lifeDomains.find(d => d.id === widget.domain);
        const domainColor = domain?.color || 'gray';
        
        return (
          <div 
            key={widget.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
              widget.size.width === 2 ? 'lg:col-span-2' : ''
            }`}
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
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InstrumentPanel;