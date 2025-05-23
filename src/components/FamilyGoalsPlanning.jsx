import React, { useState, useEffect } from 'react';
import { useFamily } from '../providers/FamilyProvider';

function FamilyGoalsPlanning({ familyId }) {
  const {
    familyGoals,
    familyTasks,
    loading,
    error,
    createFamilyGoal,
    updateFamilyGoal,
    createFamilyTask,
    updateFamilyTask
  } = useFamily();

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('goals'); // 'goals', 'milestone', 'project', 'task'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createType, setCreateType] = useState('goal'); // 'goal', 'milestone', 'project', 'task'

  // Enhanced data structure for hierarchical goals
  const [hierarchicalData, setHierarchicalData] = useState({
    goals: [],
    milestones: [],
    projects: [],
    tasks: []
  });

  useEffect(() => {
    if (familyId) {
      loadHierarchicalData();
    }
  }, [familyId, familyGoals, familyTasks]);

  const loadHierarchicalData = () => {
    // Transform flat data into hierarchical structure
    const goals = familyGoals.map(goal => ({
      ...goal,
      type: 'goal',
      milestones: familyTasks.filter(item => item.parent_type === 'goal' && item.parent_id === goal.id && item.item_type === 'milestone'),
      projects: familyTasks.filter(item => item.parent_type === 'goal' && item.parent_id === goal.id && item.item_type === 'project')
    }));

    // Add projects and tasks to milestones
    goals.forEach(goal => {
      goal.milestones = goal.milestones.map(milestone => ({
        ...milestone,
        type: 'milestone',
        projects: familyTasks.filter(item => item.parent_type === 'milestone' && item.parent_id === milestone.id && item.item_type === 'project'),
        tasks: familyTasks.filter(item => item.parent_type === 'milestone' && item.parent_id === milestone.id && item.item_type === 'task')
      }));

      goal.projects = goal.projects.map(project => ({
        ...project,
        type: 'project',
        tasks: familyTasks.filter(item => item.parent_type === 'project' && item.parent_id === project.id && item.item_type === 'task')
      }));
    });

    // Add tasks to milestone projects
    goals.forEach(goal => {
      goal.milestones.forEach(milestone => {
        milestone.projects = milestone.projects.map(project => ({
          ...project,
          type: 'project',
          tasks: familyTasks.filter(item => item.parent_type === 'project' && item.parent_id === project.id && item.item_type === 'task')
        }));
      });
    });

    setHierarchicalData({ goals });
  };

  const handleCreateItem = async (data) => {
    try {
      if (createType === 'goal') {
        await createFamilyGoal({
          family_id: familyId,
          title: data.title,
          description: data.description,
          status: 'active',
          target_value: data.target_value,
          unit: data.unit,
          timeframe: data.timeframe
        });
      } else {
        // Create as a family task with specific metadata
        await createFamilyTask({
          family_id: familyId,
          title: data.title,
          description: data.description,
          item_type: createType,
          parent_type: data.parent_type,
          parent_id: data.parent_id,
          status: 'pending',
          priority: data.priority || 3
        });
      }
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const navigateToItem = (item, type) => {
    if (type === 'goal') {
      setSelectedGoal(item);
      setSelectedMilestone(null);
      setSelectedProject(null);
      setViewMode('milestone');
    } else if (type === 'milestone') {
      setSelectedMilestone(item);
      setSelectedProject(null);
      setViewMode('project');
    } else if (type === 'project') {
      setSelectedProject(item);
      setViewMode('task');
    }
  };

  const getBreadcrumb = () => {
    const parts = ['Goals'];
    if (selectedGoal) parts.push(selectedGoal.title);
    if (selectedMilestone) parts.push(selectedMilestone.title);
    if (selectedProject) parts.push(selectedProject.title);
    return parts;
  };

  const getProgressStats = (item) => {
    if (item.type === 'goal') {
      const allMilestones = item.milestones || [];
      const completedMilestones = allMilestones.filter(m => m.status === 'completed').length;
      return {
        completed: completedMilestones,
        total: allMilestones.length,
        percentage: allMilestones.length > 0 ? Math.round((completedMilestones / allMilestones.length) * 100) : 0
      };
    } else if (item.type === 'milestone' || item.type === 'project') {
      const allTasks = item.tasks || [];
      const completedTasks = allTasks.filter(t => t.status === 'completed').length;
      return {
        completed: completedTasks,
        total: allTasks.length,
        percentage: allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0
      };
    }
    return { completed: 0, total: 0, percentage: 0 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error loading family goals: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            {getBreadcrumb().map((part, index) => (
              <React.Fragment key={part}>
                {index > 0 && <span className="text-gray-400">→</span>}
                <button
                  onClick={() => {
                    if (index === 0) {
                      setViewMode('goals');
                      setSelectedGoal(null);
                      setSelectedMilestone(null);
                      setSelectedProject(null);
                    } else if (index === 1) {
                      setViewMode('milestone');
                      setSelectedMilestone(null);
                      setSelectedProject(null);
                    } else if (index === 2) {
                      setViewMode('project');
                      setSelectedProject(null);
                    }
                  }}
                  className={`hover:text-blue-600 ${index === getBreadcrumb().length - 1 ? 'text-gray-900 font-medium' : ''}`}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <h2 className="text-2xl font-bold text-gray-900">
            {viewMode === 'goals' && 'Family Goals & Planning'}
            {viewMode === 'milestone' && `${selectedGoal?.title} - Milestones`}
            {viewMode === 'project' && `${selectedMilestone?.title} - Projects`}
            {viewMode === 'task' && `${selectedProject?.title} - Tasks`}
          </h2>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => {
              if (viewMode === 'goals') {
                setCreateType('goal');
              } else if (viewMode === 'milestone') {
                setCreateType('milestone');
              } else if (viewMode === 'project') {
                setCreateType('project');
              } else {
                setCreateType('task');
              }
              setShowCreateForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Add {viewMode === 'goals' ? 'Goal' : viewMode === 'milestone' ? 'Milestone' : viewMode === 'project' ? 'Project' : 'Task'}
          </button>
        </div>
      </div>

      {/* Goals View */}
      {viewMode === 'goals' && (
        <div className="grid grid-cols-1 gap-6">
          {hierarchicalData.goals.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Family Goals Yet</h3>
              <p className="text-gray-600 mb-4">Start by creating your first family goal to organize your objectives.</p>
              <button
                onClick={() => {
                  setCreateType('goal');
                  setShowCreateForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            hierarchicalData.goals.map((goal) => {
              const stats = getProgressStats(goal);
              return (
                <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                          goal.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {goal.status}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-gray-600 mb-3">{goal.description}</p>
                      )}
                      
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{stats.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stats.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {stats.completed} of {stats.total} milestones completed
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <span>🌟</span>
                          <span>{goal.milestones?.length || 0} milestones</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>📋</span>
                          <span>{goal.projects?.length || 0} projects</span>
                        </div>
                        {goal.timeframe && (
                          <div className="flex items-center space-x-1">
                            <span>⏰</span>
                            <span>{goal.timeframe}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigateToItem(goal, 'goal')}
                      className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Milestones View */}
      {viewMode === 'milestone' && selectedGoal && (
        <div className="space-y-6">
          {/* Goal Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900">{selectedGoal.title}</h3>
            {selectedGoal.description && (
              <p className="text-blue-700 text-sm mt-1">{selectedGoal.description}</p>
            )}
          </div>

          {/* Milestones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedGoal.milestones?.map((milestone) => {
              const stats = getProgressStats(milestone);
              return (
                <div key={milestone.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🌟</span>
                      <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                      milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {milestone.status}
                    </span>
                  </div>
                  
                  {milestone.description && (
                    <p className="text-gray-600 text-sm mb-3">{milestone.description}</p>
                  )}

                  {/* Progress for milestone */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Tasks completed</span>
                      <span className="font-medium">{stats.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-green-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${stats.percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {milestone.projects?.length || 0} projects • {stats.total} tasks
                    </div>
                    <button
                      onClick={() => navigateToItem(milestone, 'milestone')}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View →
                    </button>
                  </div>
                </div>
              );
            }) || (
              <div className="col-span-2 text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">🌟</div>
                <p className="text-gray-600 mb-3">No milestones yet for this goal.</p>
                <button
                  onClick={() => {
                    setCreateType('milestone');
                    setShowCreateForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Add First Milestone
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects View */}
      {viewMode === 'project' && selectedMilestone && (
        <div className="space-y-6">
          {/* Milestone Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-900">{selectedMilestone.title}</h3>
            {selectedMilestone.description && (
              <p className="text-yellow-700 text-sm mt-1">{selectedMilestone.description}</p>
            )}
          </div>

          {/* Projects List */}
          <div className="space-y-4">
            {selectedMilestone.projects?.map((project) => {
              const stats = getProgressStats(project);
              return (
                <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">📋</span>
                        <h4 className="font-medium text-gray-900">{project.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      
                      {project.description && (
                        <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {stats.completed} of {stats.total} tasks completed ({stats.percentage}%)
                        </div>
                        <button
                          onClick={() => navigateToItem(project, 'project')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Manage Tasks →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) || (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-gray-600 mb-3">No projects yet for this milestone.</p>
                <button
                  onClick={() => {
                    setCreateType('project');
                    setShowCreateForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Add First Project
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks View */}
      {viewMode === 'task' && selectedProject && (
        <div className="space-y-6">
          {/* Project Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900">{selectedProject.title}</h3>
            {selectedProject.description && (
              <p className="text-green-700 text-sm mt-1">{selectedProject.description}</p>
            )}
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {selectedProject.tasks?.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => {
                      updateFamilyTask(task.id, {
                        status: task.status === 'completed' ? 'pending' : 'completed'
                      });
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </h5>
                      {task.priority && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority <= 2 ? 'bg-red-100 text-red-800' :
                          task.priority <= 3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority <= 2 ? 'High' : task.priority <= 3 ? 'Medium' : 'Low'}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    )}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">✓</div>
                <p className="text-gray-600 mb-3">No tasks yet for this project.</p>
                <button
                  onClick={() => {
                    setCreateType('task');
                    setShowCreateForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Add First Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateItemModal
          type={createType}
          parentData={{
            goalId: selectedGoal?.id,
            milestoneId: selectedMilestone?.id,
            projectId: selectedProject?.id
          }}
          onSave={handleCreateItem}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}

// Create Item Modal Component
function CreateItemModal({ type, parentData, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 3,
    timeframe: 'month',
    target_value: '',
    unit: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      parent_type: type === 'milestone' ? 'goal' : 
                   type === 'project' ? (parentData.milestoneId ? 'milestone' : 'goal') :
                   type === 'task' ? 'project' : null,
      parent_id: type === 'milestone' ? parentData.goalId :
                 type === 'project' ? (parentData.milestoneId || parentData.goalId) :
                 type === 'task' ? parentData.projectId : null
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Create New {type.charAt(0).toUpperCase() + type.slice(1)}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {type === 'goal' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                <select
                  value={formData.timeframe}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                  <input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., rooms, dollars"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {(type === 'task' || type === 'project') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>High</option>
                <option value={2}>Medium-High</option>
                <option value={3}>Medium</option>
                <option value={4}>Medium-Low</option>
                <option value={5}>Low</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Create {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FamilyGoalsPlanning;