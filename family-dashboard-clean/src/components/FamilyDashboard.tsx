import React from 'react';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';

interface FamilyDashboardProps {
  familyId: string;
  userId: string;
}

const FamilyDashboard: React.FC<FamilyDashboardProps> = ({ familyId, userId }) => {
  return (
    <div className="p-4 lg:p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Family Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Meal Planner Widget */}
        <div className="col-span-1 md:col-span-2">
          <MealPlannerWidget familyId={familyId} userId={userId} />
        </div>
        
        {/* Placeholder for other widgets */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Upcoming Events</h2>
          <p className="text-gray-600">No events scheduled.</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">To-Do List</h2>
          <p className="text-gray-600">All tasks completed!</p>
        </div>

        {/* Dog Behavior Widget */}
        <DogBehaviorWidget familyId={familyId} userId={userId} />
      </div>
    </div>
  );
};

export default FamilyDashboard;
