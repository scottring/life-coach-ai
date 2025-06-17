import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import MealPlannerWidget from './MealPlannerWidget';
import DogBehaviorWidget from './DogBehaviorWidget';
import TodoWidget from './TodoWidget';
import SOPWidget from './SOPWidget';
import EnhancedWeeklyCalendarWidget from './EnhancedWeeklyCalendarWidget';
import CreateSOPModal from './CreateSOPModal';
import CreateGoalModal from './CreateGoalModal';
import CreateTaskModal from './CreateTaskModal';
import CreateProjectModal from './CreateProjectModal';
import MealPlanningModal from './MealPlanningModal';
import { ContextType } from '../types/context';
import { Goal, GoalTask, Project } from '../types/goals';

// Import the required CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface EnhancedFamilyDashboardProps {
  contextId: string;
  userId: string;
  contextType: ContextType;
}

const EnhancedFamilyDashboard: React.FC<EnhancedFamilyDashboardProps> = ({ 
  contextId, 
  userId, 
  contextType 
}) => {
  // Modal states
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [showCreateSOP, setShowCreateSOP] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // Refresh keys for real-time updates
  const [sopRefreshKey, setSOPRefreshKey] = useState(0);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [goalRefreshKey, setGoalRefreshKey] = useState(0);

  // Preselection states for creating related entities
  const [preselectedGoalId, setPreselectedGoalId] = useState<string>();
  const [preselectedMilestoneId, setPreselectedMilestoneId] = useState<string>();
  const [preselectedProjectId, setPreselectedProjectId] = useState<string>();

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

  // Event handlers
  const handleSOPCreated = () => {
    setSOPRefreshKey(prev => prev + 1);
    setCalendarRefreshKey(prev => prev + 1);
    setShowCreateSOP(false);
  };

  const handleGoalCreated = (goal: Goal) => {
    setGoalRefreshKey(prev => prev + 1);
    setCalendarRefreshKey(prev => prev + 1);
    setShowCreateGoal(false);
    console.log('Goal created:', goal);
  };

  const handleTaskCreated = (task: GoalTask) => {
    setGoalRefreshKey(prev => prev + 1);
    setCalendarRefreshKey(prev => prev + 1);
    setShowCreateTask(false);
    console.log('Task created:', task);
  };

  const handleProjectCreated = (project: Project) => {
    setGoalRefreshKey(prev => prev + 1);
    setCalendarRefreshKey(prev => prev + 1);
    setShowCreateProject(false);
    console.log('Project created:', project);
  };


  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event);
    // Handle event click (could open edit modal, etc.)
  };

  const handleSOPDrop = (sop: any, date: string, time: string) => {
    console.log('SOP dropped:', sop, date, time);
    setCalendarRefreshKey(prev => prev + 1);
  };

  const handleCreateEvent = (date: string, time: string) => {
    console.log('Create event at:', date, time);
    // Could open a quick event creation modal
  };

  // Goal tracking creation handlers with context
  const handleCreateTaskWithContext = (goalId?: string, milestoneId?: string, projectId?: string) => {
    setPreselectedGoalId(goalId);
    setPreselectedMilestoneId(milestoneId);
    setPreselectedProjectId(projectId);
    setShowCreateTask(true);
  };

  const handleCreateGoalWithContext = () => {
    setShowCreateGoal(true);
  };

  const handleCreateProjectWithContext = (goalId?: string) => {
    setPreselectedGoalId(goalId);
    setShowCreateProject(true);
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
        {/* Enhanced Weekly Calendar Widget with Goal Tracking Integration */}
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
            <EnhancedWeeklyCalendarWidget 
              key={`enhanced-calendar-${calendarRefreshKey}`}
              contextId={contextId} 
              userId={userId}
              onEventClick={handleEventClick}
              onSOPDrop={handleSOPDrop}
              onCreateEvent={handleCreateEvent}
              onCreateTask={() => handleCreateTaskWithContext()}
              onCreateGoal={handleCreateGoalWithContext}
              onCreateProject={() => handleCreateProjectWithContext()}
            />
          </div>
        </div>

        {/* SOP Widget */}
        <div key="sops" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">Standard Operating Procedures</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateSOP(true)}
                className="apple-button-secondary text-sm"
              >
                New SOP
              </button>
              <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
                <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <SOPWidget 
              key={`sop-${sopRefreshKey}`}
              contextId={contextId} 
              userId={userId}
            />
          </div>
        </div>

        {/* Meal Planner Widget - Family context only */}
        {contextType === 'family' && (
          <div key="mealPlanner" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
                 style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
              <h3 className="apple-subtitle text-gray-800">Meal Planner</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMealPlanner(true)}
                  className="apple-button-secondary text-sm"
                >
                  Plan Meals
                </button>
                <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
                  <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4" style={{ background: 'white' }}>
              <MealPlannerWidget familyId={contextId} userId={userId} />
            </div>
          </div>
        )}

        {/* Dog Behavior Widget - Family context only */}
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

        {/* Todo Widget */}
        <div key="todos" className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50" 
               style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            <h3 className="apple-subtitle text-gray-800">Quick Todos</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCreateTaskWithContext()}
                className="apple-button-secondary text-sm"
              >
                New Task
              </button>
              <div className="drag-handle cursor-move p-2 hover:bg-gray-100/50 rounded-lg apple-transition">
                <svg className="w-4 h-4 text-gray-600 sf-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
            </div>
          </div>
          <div className="p-4" style={{ background: 'white' }}>
            <TodoWidget 
              key={`todo-${goalRefreshKey}`}
              contextId={contextId} 
              userId={userId} 
            />
          </div>
        </div>
      </ResponsiveGridLayout>

      {/* Modals */}
      
      {/* SOP Creation Modal */}
      {showCreateSOP && (
        <CreateSOPModal
          isOpen={showCreateSOP}
          onClose={() => setShowCreateSOP(false)}
          contextId={contextId}
          userId={userId}
          onSOPCreated={handleSOPCreated}
        />
      )}

      {/* Goal Creation Modal */}
      {showCreateGoal && (
        <CreateGoalModal
          isOpen={showCreateGoal}
          onClose={() => setShowCreateGoal(false)}
          contextId={contextId}
          userId={userId}
          onGoalCreated={handleGoalCreated}
        />
      )}

      {/* Task Creation Modal */}
      {showCreateTask && (
        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => {
            setShowCreateTask(false);
            setPreselectedGoalId(undefined);
            setPreselectedMilestoneId(undefined);
            setPreselectedProjectId(undefined);
          }}
          contextId={contextId}
          userId={userId}
          onTaskCreated={handleTaskCreated}
          preselectedGoalId={preselectedGoalId}
          preselectedMilestoneId={preselectedMilestoneId}
          preselectedProjectId={preselectedProjectId}
        />
      )}

      {/* Project Creation Modal */}
      {showCreateProject && (
        <CreateProjectModal
          isOpen={showCreateProject}
          onClose={() => {
            setShowCreateProject(false);
            setPreselectedGoalId(undefined);
          }}
          contextId={contextId}
          userId={userId}
          onProjectCreated={handleProjectCreated}
          preselectedGoalId={preselectedGoalId}
        />
      )}

      {/* Meal Planning Modal - Family context only */}
      {contextType === 'family' && showMealPlanner && (
        <MealPlanningModal
          isOpen={showMealPlanner}
          onClose={() => setShowMealPlanner(false)}
          familyId={contextId}
          userId={userId}
        />
      )}
    </div>
  );
};

export default EnhancedFamilyDashboard;