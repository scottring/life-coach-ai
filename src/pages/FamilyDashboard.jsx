import React, { useState, useEffect } from 'react';
import { useAuthState } from '../hooks/useAuthState';
import { FamilyProvider, useFamily } from '../providers/FamilyProvider';
import DashboardSelector from '../components/DashboardSelector';
import FamilyMealPlanner from '../components/FamilyMealPlanner';
import FamilyMembers from '../components/FamilyMembers';
import FamilyGoalsPlanning from '../components/FamilyGoalsPlanning';
import FamilyWeeklyReview from '../components/FamilyWeeklyReview';
import FamilyFinances from '../components/FamilyFinances';

function FamilyDashboard() {
  const { user } = useAuthState();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentFamily, setCurrentFamily] = useState(null);
  const [userFamilies, setUserFamilies] = useState([]);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  
  const familyId = currentFamily?.id;

  // Load user's families on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserFamilies();
    }
  }, [user?.id]);

  const loadUserFamilies = async () => {
    if (!user?.id) return;
    
    setLoadingFamilies(true);
    try {
      const { FamilyAdapter } = await import('../adapters/FamilyAdapter');
      const families = await FamilyAdapter.getFamilies(user.id);
      setUserFamilies(families);
      
      // If user has families and no current family is selected, select the first one
      if (families.length > 0 && !currentFamily) {
        setCurrentFamily(families[0]);
      }
    } catch (error) {
      console.warn('Database not configured or families table missing:', error.message);
      // For now, create a mock family so the demo works
      const mockFamily = {
        id: 'demo-family-' + user.id,
        name: 'Demo Family',
        userRole: 'admin'
      };
      setUserFamilies([mockFamily]);
      setCurrentFamily(mockFamily);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const handleFamilyCreated = (newFamily) => {
    setCurrentFamily(newFamily);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '🏠' },
    { id: 'goals-planning', name: 'Goals & Planning', icon: '🎯' },
    { id: 'meals', name: 'Meal Planning', icon: '🍽️' },
    { id: 'finances', name: 'Finances', icon: '💰' },
    { id: 'weekly-review', name: 'Weekly Review', icon: '📊' },
    { id: 'members', name: 'Family Members', icon: '👥' }
  ];

  return (
    <FamilyProvider>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your family's tasks, meals, goals, and milestones together</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <DashboardSelector />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          <FamilyContent 
            activeTab={activeTab} 
            familyId={familyId} 
            userFamilies={userFamilies}
            loadingFamilies={loadingFamilies}
            onFamilyCreated={handleFamilyCreated}
            onFamilySelected={setCurrentFamily}
            refreshFamilies={loadUserFamilies}
          />
        </div>
      </div>
    </FamilyProvider>
  );
}

// Separate component that uses family context
function FamilyContent({ activeTab, familyId, userFamilies, loadingFamilies, onFamilyCreated, onFamilySelected, refreshFamilies }) {
  const { loadFamilyData } = useFamily();

  useEffect(() => {
    if (familyId) {
      loadFamilyData(familyId);
    }
  }, [familyId, loadFamilyData]);

  // Show loading while fetching families
  if (loadingFamilies) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no family is selected, show a setup screen
  if (!familyId) {
    return (
      <FamilySetup 
        userFamilies={userFamilies}
        onFamilyCreated={(newFamily) => {
          onFamilyCreated(newFamily);
          refreshFamilies();
        }}
        onFamilySelected={onFamilySelected}
      />
    );
  }

  return (
    <>
      {activeTab === 'overview' && (
        <FamilyOverview familyId={familyId} />
      )}
      
      {activeTab === 'goals-planning' && (
        <FamilyGoalsPlanning familyId={familyId} />
      )}
      
      {activeTab === 'meals' && (
        <FamilyMealPlanner familyId={familyId} />
      )}
      
      {activeTab === 'finances' && (
        <FamilyFinances familyId={familyId} />
      )}
      
      {activeTab === 'weekly-review' && (
        <FamilyWeeklyReview familyId={familyId} />
      )}
      
      {activeTab === 'members' && (
        <FamilyMembers familyId={familyId} />
      )}
    </>
  );
}

// Family Overview Component with real data integration
function FamilyOverview({ familyId }) {
  const { 
    familyMeals, 
    familyTasks, 
    familyGoals, 
    familyMembers,
    shoppingItems,
    loading 
  } = useFamily();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const thisWeekMeals = familyMeals.slice(0, 3); // Show first 3 meals
  const pendingTasks = familyTasks.filter(task => !task.completed).slice(0, 3);
  const activeGoals = familyGoals.filter(goal => goal.progress < 100).slice(0, 2);
  const unpurchasedItems = shoppingItems.filter(item => !item.purchased).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {/* This Week's Meals */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">This Week's Meals</h3>
          <span className="text-2xl">🍽️</span>
        </div>
        <div className="space-y-2">
          {thisWeekMeals.length === 0 ? (
            <p className="text-sm text-gray-500">No meals planned yet</p>
          ) : (
            thisWeekMeals.map((meal, index) => (
              <div key={meal.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{new Date(meal.date).toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span className="font-medium">{meal.dish_name}</span>
              </div>
            ))
          )}
          <div className="mt-3">
            <button className="text-sm text-blue-600 hover:text-blue-800">View full meal plan →</button>
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Pending Tasks</h3>
          <span className="text-2xl">📋</span>
        </div>
        <div className="space-y-3">
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-gray-500">No pending tasks</p>
          ) : (
            pendingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{task.title}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  task.priority === 'high' ? 'text-red-600 bg-red-100' :
                  task.priority === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                  'text-green-600 bg-green-100'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))
          )}
          <div className="mt-3">
            <button className="text-sm text-blue-600 hover:text-blue-800">Manage tasks →</button>
          </div>
        </div>
      </div>

      {/* Family Goals Progress */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Family Goals</h3>
          <span className="text-2xl">🎯</span>
        </div>
        <div className="space-y-3">
          {activeGoals.length === 0 ? (
            <p className="text-sm text-gray-500">No active goals</p>
          ) : (
            activeGoals.map((goal) => (
              <div key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{goal.title}</span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: `${goal.progress}%`}}></div>
                </div>
              </div>
            ))
          )}
          <div className="mt-3">
            <button className="text-sm text-blue-600 hover:text-blue-800">View all goals →</button>
          </div>
        </div>
      </div>

      {/* Shopping List Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Shopping List</h3>
          <span className="text-2xl">🛒</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Items needed</span>
            <span className="font-medium text-gray-900">{unpurchasedItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Total items</span>
            <span className="font-medium text-gray-900">{shoppingItems.length}</span>
          </div>
          <div className="mt-3">
            <button className="text-sm text-blue-600 hover:text-blue-800">View shopping list →</button>
          </div>
        </div>
      </div>

      {/* Family Members */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Family Members</h3>
          <span className="text-2xl">👥</span>
        </div>
        <div className="space-y-3">
          {familyMembers.length === 0 ? (
            <p className="text-sm text-gray-500">No family members yet</p>
          ) : (
            familyMembers.slice(0, 3).map((member) => (
              <div key={member.id} className="flex items-center space-x-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  member.role === 'admin' ? 'bg-purple-500' :
                  member.role === 'parent' ? 'bg-blue-500' :
                  member.role === 'child' ? 'bg-green-500' :
                  'bg-gray-500'
                }`}>
                  {member.user_id.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">User {member.user_id.substring(0, 8)}</div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              </div>
            ))
          )}
          <div className="mt-3">
            <button className="text-sm text-blue-600 hover:text-blue-800">Manage members →</button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Quick Stats</h3>
          <span className="text-2xl">📊</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Meals planned</span>
            <span className="font-medium text-gray-900">{familyMeals.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Active tasks</span>
            <span className="font-medium text-gray-900">{pendingTasks.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Goals in progress</span>
            <span className="font-medium text-gray-900">{activeGoals.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Family members</span>
            <span className="font-medium text-gray-900">{familyMembers.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Family Setup Component for when no family exists
function FamilySetup({ userFamilies, onFamilyCreated, onFamilySelected }) {
  const { user } = useAuthState();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateFamily = async () => {
    if (!familyName.trim() || !user) return;

    setIsCreating(true);
    try {
      // Import the FamilyAdapter to create the family
      const { FamilyAdapter } = await import('../adapters/FamilyAdapter');
      
      const newFamily = await FamilyAdapter.createFamily(
        { name: familyName.trim() },
        user.id
      );
      
      onFamilyCreated(newFamily);
    } catch (error) {
      console.error('Error creating family:', error);
      alert('Error creating family. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCode.trim() || !user) return;

    setIsJoining(true);
    try {
      // Import the FamilyAdapter to join the family
      const { FamilyAdapter } = await import('../adapters/FamilyAdapter');
      
      // For now, treat joinCode as family ID (in future could be invite codes)
      const member = await FamilyAdapter.addFamilyMember(joinCode.trim(), user.id, 'member');
      
      // Refresh families list and select the newly joined family
      const families = await FamilyAdapter.getFamilies(user.id);
      const joinedFamily = families.find(f => f.id === joinCode.trim());
      
      if (joinedFamily) {
        onFamilySelected(joinedFamily);
      }
      
      alert('Successfully joined family!');
    } catch (error) {
      console.error('Error joining family:', error);
      alert('Error joining family. Please check the family ID and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (showCreateForm) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-4xl">👨‍👩‍👧‍👦</span>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Your Family</h3>
          <p className="text-gray-600 mb-8">
            Choose a name for your family. You can always change this later.
          </p>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Enter family name (e.g., The Smiths)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={100}
              />
            </div>
            
            <button 
              onClick={handleCreateFamily}
              disabled={!familyName.trim() || isCreating}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Family...' : 'Create Family'}
            </button>
            
            <button 
              onClick={() => setShowCreateForm(false)}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showJoinForm) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <div className="mx-auto h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-4xl">🤝</span>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Join a Family</h3>
          <p className="text-gray-600 mb-8">
            Enter the family ID provided by a family member to join their family.
          </p>

          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter family ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            
            <button 
              onClick={handleJoinFamily}
              disabled={!joinCode.trim() || isJoining}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining Family...' : 'Join Family'}
            </button>
            
            <button 
              onClick={() => setShowJoinForm(false)}
              className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-4xl">👨‍👩‍👧‍👦</span>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Family Dashboard</h3>
        <p className="text-gray-600 mb-8">
          {userFamilies.length > 0 
            ? "You have existing families. Select one below or create/join a new family."
            : "Get started by creating your family or joining an existing one. The family dashboard helps you coordinate meals, tasks, goals, and milestones together."
          }
        </p>

        {/* Existing Families Section */}
        {userFamilies.length > 0 && (
          <div className="mb-8">
            <h4 className="font-medium text-gray-900 mb-4">Your Families</h4>
            <div className="space-y-2">
              {userFamilies.map((family) => (
                <button
                  key={family.id}
                  onClick={() => onFamilySelected(family)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{family.name}</div>
                      <div className="text-sm text-gray-500">Role: {family.userRole}</div>
                    </div>
                    <span className="text-2xl">👨‍👩‍👧‍👦</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">Or create/join a new family:</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create New Family
          </button>
          
          <button 
            onClick={() => setShowJoinForm(true)}
            className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Join Existing Family
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">What you can do with Family Dashboard:</h4>
          <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span>🍽️</span>
              <span>Plan weekly meals and create shared shopping lists</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>📋</span>
              <span>Assign and track family tasks and chores</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Set and monitor family goals together</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🌟</span>
              <span>Celebrate milestones and important events</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>👥</span>
              <span>Manage family members and their roles</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FamilyDashboard;