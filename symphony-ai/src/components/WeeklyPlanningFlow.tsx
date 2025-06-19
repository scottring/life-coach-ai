import React, { useState, useEffect } from 'react';
import { 
  WeeklyPlanningSession, 
  TaskReviewItem, 
  UnscheduledItem, 
  NextWeekTask,
  TaskReviewAction,
  WeeklySessionStatus
} from '../shared/types/goals';
import { weeklyPlanningService } from '../shared/services/weeklyPlanningService';
import { 
  CalendarIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ArrowRightIcon,
  XMarkIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface WeeklyPlanningFlowProps {
  contextId: string;
  userId: string;
  onClose: () => void;
}

const steps = [
  { id: 0, title: 'Start Session', description: 'Begin your weekly planning' },
  { id: 1, title: 'Weekly Review', description: 'Review last week\'s progress' },
  { id: 2, title: 'Weekly Planning', description: 'Plan upcoming week' },
  { id: 3, title: 'Finalize', description: 'Complete and save your plan' }
];

export const WeeklyPlanningFlow: React.FC<WeeklyPlanningFlowProps> = ({ 
  contextId, 
  userId, 
  onClose 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [session, setSession] = useState<WeeklyPlanningSession | null>(null);
  const [unscheduledItems, setUnscheduledItems] = useState<UnscheduledItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing session or start fresh
  useEffect(() => {
    loadSession();
  }, [contextId, userId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const existingSession = await weeklyPlanningService.getCurrentWeekSession(contextId, userId);
      
      if (existingSession) {
        setSession(existingSession);
        // Set step based on session status
        switch (existingSession.status) {
          case 'not_started':
            setCurrentStep(0);
            break;
          case 'review_phase':
            setCurrentStep(1);
            break;
          case 'planning_phase':
            setCurrentStep(2);
            break;
          case 'completed':
            setCurrentStep(3);
            break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      setLoading(true);
      const newSession = await weeklyPlanningService.startNewSession(contextId, userId);
      setSession(newSession);
      setCurrentStep(1);
      await weeklyPlanningService.updateSessionStatus(newSession.id, 'review_phase');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const nextStep = currentStep + 1;
      
      switch (nextStep) {
        case 2: // Moving to planning phase
          await weeklyPlanningService.updateSessionStatus(session.id, 'planning_phase');
          const items = await weeklyPlanningService.getUnscheduledItems(contextId, session.id);
          setUnscheduledItems(items);
          break;
        case 3: // Moving to finalize
          await weeklyPlanningService.updateSessionStatus(session.id, 'completed');
          break;
      }
      
      setCurrentStep(nextStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAction = async (taskId: string, action: TaskReviewAction) => {
    if (!session) return;

    try {
      const task = session.reviewPhase.taskReviews.find(t => t.taskId === taskId);
      if (!task) return;

      const updatedTask: TaskReviewItem = {
        ...task,
        action,
        status: action === 'mark_completed' ? 'completed' : 
                action === 'push_forward' ? 'pushed_forward' :
                action === 'mark_missed' ? 'missed' : task.status,
        completedDate: action === 'mark_completed' ? new Date().toISOString() : undefined
      };

      await weeklyPlanningService.updateTaskReview(session.id, updatedTask);
      
      // Reload session to get updated data
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const handleScheduleTask = async (item: UnscheduledItem, date: Date) => {
    if (!session) return;

    try {
      const nextWeekTask: NextWeekTask = {
        taskId: item.id,
        priority: item.priority || 'medium',
        dueDate: date.toISOString()
      };

      await weeklyPlanningService.addNextWeekTask(session.id, nextWeekTask);
      
      // Remove from unscheduled items
      setUnscheduledItems(prev => prev.filter(i => i.id !== item.id));
      
      // Reload session
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule task');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StartStep onStart={handleStartSession} loading={loading} />;
      case 1:
        return (
          <ReviewStep 
            session={session} 
            onTaskAction={handleTaskAction}
            onNext={handleNext}
            loading={loading}
          />
        );
      case 2:
        return (
          <PlanningStep 
            session={session}
            unscheduledItems={unscheduledItems}
            onScheduleTask={handleScheduleTask}
            onNext={handleNext}
            loading={loading}
          />
        );
      case 3:
        return <FinalizeStep session={session} onClose={onClose} />;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-red-600 mb-4">
            <h3 className="text-lg font-semibold">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Weekly Planning Session</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  index <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentStep ? <CheckCircleIcon className="w-5 h-5" /> : index + 1}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
};

// Step Components
const StartStep: React.FC<{ onStart: () => void; loading: boolean }> = ({ onStart, loading }) => (
  <div className="text-center py-8">
    <CalendarIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-gray-900 mb-4">
      Start Your Weekly Planning Session
    </h3>
    <p className="text-gray-600 mb-8 max-w-md mx-auto">
      Review your progress from last week and plan your priorities for the upcoming week.
    </p>
    <button
      onClick={onStart}
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Starting...' : 'Start Session'}
    </button>
  </div>
);

const ReviewStep: React.FC<{
  session: WeeklyPlanningSession | null;
  onTaskAction: (taskId: string, action: TaskReviewAction) => void;
  onNext: () => void;
  loading: boolean;
}> = ({ session, onTaskAction, onNext, loading }) => {
  if (!session) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Review Last Week's Tasks</h3>
      
      <div className="space-y-4">
        {session.reviewPhase.taskReviews.map((task) => (
          <div key={task.taskId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{task.title}</h4>
                {task.goalName && (
                  <p className="text-sm text-gray-600">Goal: {task.goalName}</p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                  {task.action && (
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                      {task.action.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              
              {!task.action && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => onTaskAction(task.taskId, 'mark_completed')}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => onTaskAction(task.taskId, 'push_forward')}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Push Forward
                  </button>
                  <button
                    onClick={() => onTaskAction(task.taskId, 'mark_missed')}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Missed
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Proceeding...' : 'Continue to Planning'}
        </button>
      </div>
    </div>
  );
};

const PlanningStep: React.FC<{
  session: WeeklyPlanningSession | null;
  unscheduledItems: UnscheduledItem[];
  onScheduleTask: (item: UnscheduledItem, date: Date) => void;
  onNext: () => void;
  loading: boolean;
}> = ({ session, unscheduledItems, onScheduleTask, onNext, loading }) => {
  const [selectedItem, setSelectedItem] = useState<UnscheduledItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleSchedule = () => {
    if (selectedItem && selectedDate) {
      onScheduleTask(selectedItem, new Date(selectedDate));
      setSelectedItem(null);
      setSelectedDate('');
    }
  };

  const getNextWeekDates = () => {
    const dates = [];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(nextWeek);
      date.setDate(nextWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unscheduled Items */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unscheduled Items</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {unscheduledItems.map((item) => (
              <div 
                key={item.id} 
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedItem?.id === item.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <h4 className="font-medium text-gray-900">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    item.type === 'task' ? 'bg-blue-100 text-blue-700' :
                    item.type === 'milestone' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.type}
                  </span>
                  {item.goalName && (
                    <span className="text-xs text-gray-500">{item.goalName}</span>
                  )}
                </div>
              </div>
            ))}
            {unscheduledItems.length === 0 && (
              <p className="text-gray-500 text-center py-8">No unscheduled items</p>
            )}
          </div>
        </div>

        {/* Planning Calendar */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Week</h3>
          
          {selectedItem && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">Scheduling: {selectedItem.title}</p>
              <div className="grid grid-cols-1 gap-2">
                {getNextWeekDates().map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setSelectedDate(date.toISOString());
                      handleSchedule();
                    }}
                    className="text-left p-2 border border-blue-300 rounded hover:bg-blue-100 text-sm"
                  >
                    {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Tasks */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Scheduled Tasks</h4>
            {session?.planningPhase.nextWeekTasks.map((task) => (
              <div key={task.taskId} className="p-2 bg-green-50 border border-green-200 rounded">
                <div className="text-sm text-green-800">
                  Task {task.taskId} - {new Date(task.dueDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Finalizing...' : 'Finalize Plan'}
        </button>
      </div>
    </div>
  );
};

const FinalizeStep: React.FC<{
  session: WeeklyPlanningSession | null;
  onClose: () => void;
}> = ({ session, onClose }) => (
  <div className="text-center py-8">
    <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-gray-900 mb-4">
      Weekly Plan Complete!
    </h3>
    <div className="text-gray-600 mb-8 space-y-2">
      <p>Tasks reviewed: {session?.reviewPhase.taskReviews.length || 0}</p>
      <p>Tasks scheduled: {session?.planningPhase.nextWeekTasks.length || 0}</p>
    </div>
    <button
      onClick={onClose}
      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
    >
      Done
    </button>
  </div>
);

export default WeeklyPlanningFlow;