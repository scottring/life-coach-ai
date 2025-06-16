import React, { useState, useEffect } from 'react';
import { 
  MusicalNoteIcon,
  ClockIcon,
  SparklesIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import ConductorScore from './ConductorScore';
import InstrumentPanel from './InstrumentPanel';
import ComposerInbox from './ComposerInbox';

interface SymphonyDashboardProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

interface LifeDomain {
  id: string;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  position: number;
}

interface WidgetConfig {
  id: string;
  domain: string;
  name: string;
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
}

const SymphonyDashboard: React.FC<SymphonyDashboardProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange
}) => {
  const [activeView, setActiveView] = useState<'conductor' | 'rehearsal'>('conductor');
  const [showWidgetController, setShowWidgetController] = useState(false);
  
  // Life Domains (Orchestra Sections)
  const [lifeDomains, setLifeDomains] = useState<LifeDomain[]>([
    { id: 'work', name: 'Work', icon: '🎻', color: 'blue', active: true, position: 1 },
    { id: 'family', name: 'Family', icon: '🎼', color: 'green', active: true, position: 2 },
    { id: 'personal', name: 'Personal', icon: '🎵', color: 'purple', active: true, position: 3 },
    { id: 'health', name: 'Health', icon: '🥁', color: 'red', active: true, position: 4 },
    { id: 'home', name: 'Home', icon: '🎺', color: 'yellow', active: true, position: 5 },
  ]);

  // Widget Configuration
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>([
    { 
      id: 'calendaring', 
      domain: 'universal', 
      name: 'Calendar & Planning',
      visible: true,
      position: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      minimized: false
    },
    { 
      id: 'family-planning', 
      domain: 'family', 
      name: 'Family Coordination',
      visible: true,
      position: { x: 2, y: 0 },
      size: { width: 1, height: 1 },
      minimized: false
    },
    { 
      id: 'meal-planning', 
      domain: 'family', 
      name: 'Meal Orchestra',
      visible: true,
      position: { x: 2, y: 1 },
      size: { width: 1, height: 1 },
      minimized: false
    },
    { 
      id: 'work-projects', 
      domain: 'work', 
      name: 'Work Symphony',
      visible: false,
      position: { x: 0, y: 2 },
      size: { width: 1, height: 1 },
      minimized: false
    },
    { 
      id: 'health-wellness', 
      domain: 'health', 
      name: 'Wellness Rhythm',
      visible: false,
      position: { x: 1, y: 2 },
      size: { width: 1, height: 1 },
      minimized: false
    }
  ]);

  const [symphonyMetrics, setSymphonyMetrics] = useState({
    harmonyScore: 85, // How well-balanced the day is
    tempoHealth: 'Allegro', // Current life pace
    activeInstruments: 4, // Active life domains
    upcomingCrescendo: 2, // Major upcoming events
    compositionProgress: 67 // Day completion percentage
  });

  const toggleDomain = (domainId: string) => {
    setLifeDomains(prev => prev.map(domain => 
      domain.id === domainId 
        ? { ...domain, active: !domain.active }
        : domain
    ));
  };

  const toggleWidget = (widgetId: string) => {
    setWidgetConfig(prev => prev.map(widget =>
      widget.id === widgetId
        ? { ...widget, visible: !widget.visible }
        : widget
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Symphony Header - The Conductor's Stand */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Dashboard Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MusicalNoteIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Life Dashboard</h1>
                  <p className="text-sm text-gray-600">Today's Schedule</p>
                </div>
              </div>
              
              {/* Progress Metrics */}
              <div className="hidden md:flex items-center space-x-6 ml-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{symphonyMetrics.harmonyScore}%</div>
                  <div className="text-xs text-gray-500">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-purple-600">{symphonyMetrics.tempoHealth}</div>
                  <div className="text-xs text-gray-500">Pace</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{symphonyMetrics.activeInstruments}</div>
                  <div className="text-xs text-gray-500">Active Areas</div>
                </div>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-4">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('conductor')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'conductor'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📅 Daily View
                </button>
                <button
                  onClick={() => setActiveView('rehearsal')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeView === 'rehearsal'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎛️ Widgets
                </button>
              </div>

              {/* Widget Controller */}
              <button
                onClick={() => setShowWidgetController(!showWidgetController)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Widget Settings"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>

              {/* AI Assistant */}
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <SparklesIcon className="w-4 h-4" />
                <span className="text-sm font-medium">AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Life Areas */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="text-sm text-gray-600 mr-2">Life Areas:</span>
            {lifeDomains.map((domain) => (
              <button
                key={domain.id}
                onClick={() => toggleDomain(domain.id)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  domain.active
                    ? `bg-${domain.color}-100 text-${domain.color}-700 border border-${domain.color}-200`
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}
              >
                <span>{domain.icon}</span>
                <span>{domain.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Widget Controller Panel */}
      {showWidgetController && (
        <div className="fixed top-20 right-6 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-40 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Widget Settings</h3>
            <button
              onClick={() => setShowWidgetController(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {widgetConfig.map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-sm">{widget.name}</div>
                  <div className="text-xs text-gray-500">{widget.domain}</div>
                </div>
                <button
                  onClick={() => toggleWidget(widget.id)}
                  className={`p-1 rounded ${
                    widget.visible ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {widget.visible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeView === 'conductor' ? (
          <ConductorScore
            contextId={contextId}
            userId={userId}
            lifeDomains={lifeDomains}
            refreshTrigger={refreshTrigger}
            onDataChange={onDataChange}
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left: Widget Panels */}
            <div className="xl:col-span-3">
              <InstrumentPanel
                contextId={contextId}
                userId={userId}
                widgetConfig={widgetConfig.filter(w => w.visible)}
                lifeDomains={lifeDomains}
                onDataChange={onDataChange}
              />
            </div>

            {/* Right: Inbox & Quick Actions */}
            <div className="xl:col-span-1">
              <ComposerInbox
                contextId={contextId}
                userId={userId}
                lifeDomains={lifeDomains}
                onDataChange={onDataChange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SymphonyDashboard;