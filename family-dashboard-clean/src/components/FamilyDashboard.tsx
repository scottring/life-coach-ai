import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';
import TodoWidget from './TodoWidget';
import SOPWidget from './SOPWidget';
import WeeklyCalendarWidget from './WeeklyCalendarWidget';
import CreateSOPModal from './CreateSOPModal';
import MealPlanningModal from './MealPlanningModal';
import { ContextType } from '../types/context';

// Import the required CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface FamilyDashboardProps {
  contextId: string;
  userId: string;
  contextType: ContextType;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ contextId, userId, contextType }) => {
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [showCreateSOP, setShowCreateSOP] = useState(false);
  const [sopRefreshKey, setSOPRefreshKey] = useState(0);

  const layouts = {
    lg: [
      { i: 'weeklyCalendar', x: 0, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
      { i: 'sops', x: 0, y: 4, w: 2, h: 3, minW: 2, minH: 2 },
      { i: 'mealPlanner', x: 2, y: 4, w: 1, h: 2, minW: 1, minH: 2 },
      { i: 'dogBehavior', x: 2, y: 6, w: 1, h: 2, minW: 1, minH: 2 },
      { i: 'todos', x: 0, y: 7, w: 2, h: 1 },
    ],
    md: [
      { i: 'weeklyCalendar', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
      { i: 'sops', x: 0, y: 4, w: 2, h: 3, minW: 2, minH: 2 },
      { i: 'mealPlanner', x: 0, y: 7, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'dogBehavior', x: 0, y: 9, w: 2, h: 2, minW: 1, minH: 2 },
      { i: 'todos', x: 0, y: 11, w: 2, h: 1 },
    ],
    sm: [
      { i: 'weeklyCalendar', x: 0, y: 0, w: 1, h: 4 },
      { i: 'sops', x: 0, y: 4, w: 1, h: 3 },
      { i: 'mealPlanner', x: 0, y: 7, w: 1, h: 2 },
      { i: 'dogBehavior', x: 0, y: 9, w: 1, h: 2 },
      { i: 'todos', x: 0, y: 11, w: 1, h: 1 },
    ],
  };

  return (
    <div className="p-4 lg:p-6 min-h-screen">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
        rowHeight={200}
        draggableHandle=".drag-handle"
      >
        {/* Weekly Calendar Widget - Available for all context types */}
        <div key="weeklyCalendar" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">Weekly Planning Calendar</h3>
            <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
              <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <WeeklyCalendarWidget 
              key={`calendar-${sopRefreshKey}`}
              contextId={contextId} 
              userId={userId}
              onEventClick={(event) => console.log('Event clicked:', event)}
              onSOPDrop={(sop, date, time) => console.log('SOP dropped:', sop, date, time)}
              onCreateEvent={(date, time) => console.log('Create event:', date, time)}
            />
          </div>
        </div>

        {/* SOP Widget - Available for all context types */}
        <div key="sops" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">Standard Operating Procedures</h3>
            <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
              <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <SOPWidget 
              key={sopRefreshKey}
              contextId={contextId} 
              userId={userId}
              onCreateSOP={() => setShowCreateSOP(true)}
              onEditSOP={(sop) => console.log('Edit SOP:', sop)}
              onExecuteSOP={(sop) => console.log('Execute SOP:', sop)}
            />
          </div>
        </div>

{contextType === 'family' && (
        <div key="mealPlanner" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">Meal Planner</h3>
            <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
              <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <MealPlannerWidget 
              familyId={contextId} 
              userId={userId} 
              onExpandToFullView={() => setShowMealPlanner(true)}
            />
          </div>
        </div>
        )}
{contextType === 'family' && (
        <div key="dogBehavior" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">Dog Behavior</h3>
            <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
              <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <DogBehaviorWidget familyId={contextId} userId={userId} />
          </div>
        </div>
        )}
        <div key="todos" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">To-Do List</h3>
            <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
              <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <TodoWidget familyId={contextId} userId={userId} />
          </div>
        </div>
      </ResponsiveGridLayout>

      {/* Modals */}
      {showMealPlanner && contextType === 'family' && (
        <MealPlanningModal 
          isOpen={showMealPlanner}
          onClose={() => setShowMealPlanner(false)}
          familyId={contextId}
          userId={userId}
        />
      )}

      <CreateSOPModal
        isOpen={showCreateSOP}
        onClose={() => setShowCreateSOP(false)}
        contextId={contextId}
        userId={userId}
        onSOPCreated={() => {
          setShowCreateSOP(false);
          setSOPRefreshKey(prev => prev + 1); // Force SOPWidget to refresh
        }}
      />
    </div>
  );
};

export default FamilyDashboard;
