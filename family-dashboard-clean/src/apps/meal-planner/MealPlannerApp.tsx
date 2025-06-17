import React, { useState, useEffect } from 'react';
import { 
  CakeIcon, 
  PlusIcon, 
  CalendarIcon,
  ListBulletIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { MealPlanningService } from '../../shared/services/mealPlanningService';
import { WeeklyMealPlan, FamilyMember } from '../../shared/types/mealPlanning';

interface MealPlannerAppProps {
  contextId: string;
  userId: string;
}

type ViewMode = 'weekly' | 'shopping' | 'analytics' | 'settings';

export const MealPlannerApp: React.FC<MealPlannerAppProps> = ({ contextId, userId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanningWizard, setShowPlanningWizard] = useState(false);

  useEffect(() => {
    loadData();
  }, [contextId, selectedWeek]);

  const loadData = async () => {
    try {
      setLoading(true);
      // For now, use mock data until we implement the actual service methods
      const mockPlan: WeeklyMealPlan = {
        id: 'mock-plan',
        familyId: contextId,
        weekStartDate: selectedWeek.toISOString().split('T')[0],
        weekEndDate: new Date(selectedWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyPlans: [],
        generatedBy: 'manual',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const members = await MealPlanningService.getFamilyMembers(contextId);
      
      setWeeklyPlan(mockPlan);
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error loading meal planning data:', error);
      // Set empty state on error
      setWeeklyPlan(null);
      setFamilyMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const formatWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // End of week (Saturday)
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const tabs = [
    { id: 'weekly', name: 'Weekly Plan', icon: CalendarIcon },
    { id: 'shopping', name: 'Shopping List', icon: ListBulletIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading meal plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <CakeIcon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meal Planner</h1>
            <p className="text-gray-500">Plan meals, generate shopping lists, and track nutrition</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Week Navigation */}
          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <CalendarIcon className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {formatWeekRange(selectedWeek)}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <CalendarIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          <button
            onClick={() => setShowPlanningWizard(true)}
            className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Plan Meals</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  viewMode === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-96">
        {viewMode === 'weekly' && (
          <div className="grid grid-cols-7 gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
              const date = new Date(selectedWeek);
              date.setDate(selectedWeek.getDate() - selectedWeek.getDay() + index);
              
              return (
                <div key={day} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <div className="text-sm font-medium text-gray-900">{day}</div>
                    <div className="text-xs text-gray-500">{date.getDate()}</div>
                  </div>
                  
                  <div className="space-y-2">
                    {['breakfast', 'lunch', 'dinner'].map((mealType) => (
                      <div key={mealType} className="border border-gray-100 rounded p-2 min-h-[60px]">
                        <div className="text-xs text-gray-500 capitalize mb-1">{mealType}</div>
                        <div className="text-xs text-gray-400">No meal planned</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {viewMode === 'shopping' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Shopping List</h3>
            <p className="text-gray-500">Generate shopping lists from your meal plans</p>
          </div>
        )}
        
        {viewMode === 'analytics' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Meal Analytics</h3>
            <p className="text-gray-500">Track nutrition, preferences, and meal ratings</p>
          </div>
        )}
        
        {viewMode === 'settings' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Meal Planning Settings</h3>
            <p className="text-gray-500">Manage family members, dietary restrictions, and preferences</p>
          </div>
        )}
      </div>

      {/* Planning Wizard Modal - This would integrate the existing MealPlanningModal */}
      {showPlanningWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Meal Planning Wizard</h3>
            <p className="text-gray-500 mb-6">Integration with existing MealPlanningModal component coming soon</p>
            <button
              onClick={() => setShowPlanningWizard(false)}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};