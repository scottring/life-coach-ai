import React, { useState } from 'react';
import { useFamily } from '../providers/FamilyProvider';

function FamilyGoals({ familyId }) {
  const {
    familyGoals,
    loading,
    error,
    createFamilyGoal,
    updateFamilyGoal
  } = useFamily();

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target_date: '',
    category: 'general',
    progress: 0
  });

  const handleAddGoal = async () => {
    if (!newGoal.title.trim()) return;

    try {
      await createFamilyGoal({
        family_id: familyId,
        ...newGoal,
        target_date: newGoal.target_date || null
      });
      setNewGoal({
        title: '',
        description: '',
        target_date: '',
        category: 'general',
        progress: 0
      });
      setShowAddGoal(false);
    } catch (err) {
      console.error('Error creating family goal:', err);
    }
  };

  const handleUpdateProgress = async (goal, newProgress) => {
    try {
      await updateFamilyGoal(goal.id, {
        progress: newProgress
      });
    } catch (err) {
      console.error('Error updating goal progress:', err);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'health': return 'text-green-600 bg-green-50';
      case 'financial': return 'text-blue-600 bg-blue-50';
      case 'education': return 'text-purple-600 bg-purple-50';
      case 'travel': return 'text-orange-600 bg-orange-50';
      case 'home': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'health': return '🏃‍♂️';
      case 'financial': return '💰';
      case 'education': return '📚';
      case 'travel': return '✈️';
      case 'home': return '🏠';
      default: return '🎯';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-red-800">Error loading family goals: {error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Family Goals & Objectives</h3>
            <p className="text-sm text-gray-500">Track your family's shared aspirations and achievements</p>
          </div>
          <button
            onClick={() => setShowAddGoal(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Goal
          </button>
        </div>
      </div>

      <div className="p-4">
        {showAddGoal && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add New Family Goal</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Goal Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., Save for family vacation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Describe your family goal"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="general">General</option>
                    <option value="health">Health & Fitness</option>
                    <option value="financial">Financial</option>
                    <option value="education">Education</option>
                    <option value="travel">Travel</option>
                    <option value="home">Home & Living</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Date</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddGoal}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Add Goal
                </button>
                <button
                  onClick={() => setShowAddGoal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {familyGoals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No family goals yet</div>
              <p className="text-sm text-gray-400 mt-1">Set goals to work towards together as a family</p>
            </div>
          ) : (
            familyGoals.map((goal) => (
              <div key={goal.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(goal.category)}</span>
                      <h4 className="text-lg font-medium text-gray-900">{goal.title}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                        {goal.category}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${goal.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Progress Controls */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-sm text-gray-600">Update progress:</span>
                      <div className="flex space-x-1">
                        {[0, 25, 50, 75, 100].map((progress) => (
                          <button
                            key={progress}
                            onClick={() => handleUpdateProgress(goal, progress)}
                            className={`px-2 py-1 text-xs rounded ${
                              goal.progress === progress 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {progress}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Created: {new Date(goal.created_at).toLocaleDateString()}</span>
                      {goal.target_date && (
                        <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                      )}
                      {goal.progress === 100 && (
                        <span className="text-green-600 font-medium">🎉 Completed!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default FamilyGoals;