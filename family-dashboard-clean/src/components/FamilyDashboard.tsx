import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';
import TodoWidget from './TodoWidget';
import MealPlanningModal from './MealPlanningModal';

// Import the required CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface FamilyDashboardProps {
  familyId: string;
  userId: string;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ familyId, userId }) => {
  const [showMealPlanner, setShowMealPlanner] = useState(false);

  const layouts = {
    lg: [
      { i: 'mealPlanner', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'dogBehavior', x: 2, y: 0, w: 1, h: 2, minW: 1, minH: 2 },
      { i: 'events', x: 0, y: 2, w: 1, h: 1 },
      { i: 'todos', x: 1, y: 2, w: 1, h: 1 },
    ],
    md: [
      { i: 'mealPlanner', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'dogBehavior', x: 0, y: 2, w: 2, h: 2, minW: 1, minH: 2 },
      { i: 'events', x: 0, y: 4, w: 1, h: 1 },
      { i: 'todos', x: 1, y: 4, w: 1, h: 1 },
    ],
    sm: [
      { i: 'mealPlanner', x: 0, y: 0, w: 1, h: 2 },
      { i: 'dogBehavior', x: 0, y: 2, w: 1, h: 2 },
      { i: 'events', x: 0, y: 4, w: 1, h: 1 },
      { i: 'todos', x: 0, y: 5, w: 1, h: 1 },
    ],
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-100 min-h-screen">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
        rowHeight={200}
        draggableHandle=".drag-handle"
      >
        <div key="mealPlanner" className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-medium text-gray-700">Meal Planner</h3>
            <div className="drag-handle cursor-move p-1 hover:bg-gray-200 rounded">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4">
            <MealPlannerWidget 
              familyId={familyId} 
              userId={userId} 
              onExpandToFullView={() => setShowMealPlanner(true)}
            />
          </div>
        </div>
        <div key="dogBehavior" className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-medium text-gray-700">Dog Behavior</h3>
            <div className="drag-handle cursor-move p-1 hover:bg-gray-200 rounded">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4">
            <DogBehaviorWidget familyId={familyId} userId={userId} />
          </div>
        </div>
        <div key="events" className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-medium text-gray-700">Upcoming Events</h3>
            <div className="drag-handle cursor-move p-1 hover:bg-gray-200 rounded">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600">No events scheduled.</p>
          </div>
        </div>
        <div key="todos" className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b">
            <h3 className="font-medium text-gray-700">To-Do List</h3>
            <div className="drag-handle cursor-move p-1 hover:bg-gray-200 rounded">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
          <div className="p-4">
            <TodoWidget familyId={familyId} userId={userId} />
          </div>
        </div>
      </ResponsiveGridLayout>

      {/* Meal Planning Modal */}
      <MealPlanningModal 
        isOpen={showMealPlanner}
        onClose={() => setShowMealPlanner(false)}
        familyId={familyId}
        userId={userId}
      />
    </div>
  );
};

export default FamilyDashboard;
