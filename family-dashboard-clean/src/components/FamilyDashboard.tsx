import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';

// Import the required CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface FamilyDashboardProps {
  familyId: string;
  userId: string;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ familyId, userId }) => {
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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Family Dashboard</h1>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 3, md: 2, sm: 1, xs: 1, xxs: 1 }}
        rowHeight={200}
      >
        <div key="mealPlanner" className="bg-white rounded-lg shadow-md overflow-hidden p-4">
          <MealPlannerWidget familyId={familyId} userId={userId} />
        </div>
        <div key="dogBehavior" className="bg-white rounded-lg shadow-md overflow-hidden">
          <DogBehaviorWidget familyId={familyId} userId={userId} />
        </div>
        <div key="events" className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Upcoming Events</h2>
          <p className="text-gray-600">No events scheduled.</p>
        </div>
        <div key="todos" className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">To-Do List</h2>
          <p className="text-gray-600">All tasks completed!</p>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
};

export default FamilyDashboard;
