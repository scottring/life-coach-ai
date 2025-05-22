import React, { useState } from 'react';
import { useGoals } from '../providers/GoalProvider';
import { useAuthState } from '../hooks/useAuthState';

function GoalManager() {
  const { goals, createGoal, updateGoal } = useGoals();
  const { user } = useAuthState();
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    timeframe: 'quarter'
  });
  const [addingGoal, setAddingGoal] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGoal(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddGoal = async (e) => {
    e.preventDefault();
    
    if (!newGoal.title.trim() || !user) return;
    
    setAddingGoal(true);
    
    try {
      const createdGoal = await createGoal({
        ...newGoal,
        user_id: user.id,
        status: 'active'
      });
      
      if (createdGoal) {
        setNewGoal({
          title: '',
          description: '',
          timeframe: 'quarter'
        });
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setAddingGoal(false);
    }
  };
  
  const handleArchiveGoal = async (goalId) => {
    try {
      await updateGoal(goalId, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving goal:', error);
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
      </div>
      
      <div className="mt-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Add New Goal</h2>
          
          <form onSubmit={handleAddGoal} className="mt-4 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Goal Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={newGoal.title}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="What do you want to achieve?"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={newGoal.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Provide more details about your goal"
              />
            </div>
            
            <div>
              <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700">
                Timeframe
              </label>
              <select
                id="timeframe"
                name="timeframe"
                value={newGoal.timeframe}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
                <option value="life">Life Goal</option>
              </select>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={addingGoal || !newGoal.title.trim()}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              >
                {addingGoal ? 'Adding...' : 'Add Goal'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-800">Your Goals</h2>
          
          {goals.filter(g => g.status === 'active').length === 0 ? (
            <div className="mt-4 text-center text-gray-500">No goals yet. Add a goal to get started.</div>
          ) : (
            <div className="mt-4 space-y-6">
              {goals.filter(g => g.status === 'active').map(goal => (
                <div key={goal.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-800">{goal.title}</h3>
                        <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {goal.timeframe}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="mt-1 text-sm text-gray-600">{goal.description}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleArchiveGoal(goal.id)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoalManager;