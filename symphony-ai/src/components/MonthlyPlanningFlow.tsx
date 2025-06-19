import React, { useState, useEffect } from 'react';
import { useAuth } from '../shared/hooks/useAuth';
import { planningService } from '../shared/services/weeklyPlanningService';
import { PlanningSession, FinancialReview, ProjectPrioritization, RelationshipParentingReview, RoutineDelegationReview, ProjectTask } from '../shared/types/goals';
import { goalService } from '../shared/services/goalService';
import { AIGuidancePanel } from './AIGuidancePanel';
import { PlanningContext } from '../shared/services/aiGuidanceService';
import { aiPlanningService, PlanningContext as AIPlanningContext } from '../shared/services/aiPlanningService';

interface MonthlyPlanningFlowProps {
  contextId: string;
  onComplete?: () => void;
}

type MonthlyPlanningStep = 'start' | 'financial' | 'projects' | 'relationship' | 'routine' | 'finalize';

export const MonthlyPlanningFlow: React.FC<MonthlyPlanningFlowProps> = ({ contextId, onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<MonthlyPlanningStep>('start');
  const [session, setSession] = useState<PlanningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [aiSessionId, setAISessionId] = useState<string | null>(null);

  // AI Guidance Context
  const aiContext: PlanningContext = {
    sessionType: 'monthly',
    currentStep: currentStep,
    timeAllocated: 120, // 2 hours as per your document
    timeUsed: Math.round((Date.now() - sessionStartTime) / 60000),
    familyContext: { contextId },
    urgentItems: [] // Could be populated from user input
  };

  // Load existing session or create new one
  useEffect(() => {
    if (user) {
      loadSession();
      initializeAISession();
    }
  }, [user, contextId]);

  const initializeAISession = async () => {
    if (!user?.id || !contextId) return;
    
    try {
      // Create AI planning context for monthly session
      const planningContext: AIPlanningContext = {
        participants: [user.id], 
        scope: 'family',
        timeframe: 'monthly',
        contextId: contextId,
        sessionId: `monthly_${Date.now()}`,
        preferences: {
          workingHours: { start: '07:15', end: '09:15' },
          preferredDays: ['sunday'],
          energyPatterns: { morning: 'high', afternoon: 'medium', evening: 'low' }
        }
      };
      
      // Start persistent AI planning session
      const aiSession = await aiPlanningService.startPlanningSession(planningContext);
      setAISessionId(aiSession.id);
      console.log('Started AI planning session:', aiSession.id);
    } catch (error) {
      console.error('Error initializing AI session:', error);
    }
  };

  const loadSession = async () => {
    if (!user || !user.id) {
      console.error('Missing user data for loadSession:', { user: !!user, id: user?.id });
      setError('Authentication required');
      return;
    }
    
    if (!contextId || contextId.trim() === '') {
      console.error('Missing contextId for loadSession:', { contextId });
      setError('Family context not available. Please try refreshing the page or switching to demo mode.');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading monthly session with:', { contextId, userId: user.id });
      let currentSession = await planningService.getCurrentSession(contextId, user.id, 'monthly');
      
      if (!currentSession) {
        currentSession = await planningService.startNewSession(contextId, user.id, 'monthly');
      }
      
      setSession(currentSession);
      
      // Determine current step based on session status
      if (currentSession.status === 'not_started') {
        setCurrentStep('start');
      } else if (currentSession.status === 'review_phase') {
        setCurrentStep('financial');
      } else if (currentSession.status === 'planning_phase') {
        setCurrentStep('projects');
      } else {
        setCurrentStep('finalize');
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (status: 'review_phase' | 'planning_phase' | 'completed') => {
    if (!session) return;
    
    try {
      await planningService.updateSessionStatus(session.id, status);
      setSession({ ...session, status });
    } catch (err) {
      console.error('Error updating session status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update session');
    }
  };

  const handleStepComplete = (step: MonthlyPlanningStep) => {
    switch (step) {
      case 'start':
        updateSessionStatus('review_phase');
        setCurrentStep('financial');
        break;
      case 'financial':
        setCurrentStep('projects');
        break;
      case 'projects':
        setCurrentStep('relationship');
        break;
      case 'relationship':
        setCurrentStep('routine');
        break;
      case 'routine':
        updateSessionStatus('planning_phase');
        setCurrentStep('finalize');
        break;
      case 'finalize':
        updateSessionStatus('completed');
        onComplete?.();
        break;
    }
  };

  const handleStepBack = () => {
    switch (currentStep) {
      case 'financial':
        setCurrentStep('start');
        break;
      case 'projects':
        setCurrentStep('financial');
        break;
      case 'relationship':
        setCurrentStep('projects');
        break;
      case 'routine':
        setCurrentStep('relationship');
        break;
      case 'finalize':
        setCurrentStep('routine');
        break;
      // 'start' has no previous step
    }
  };

  const canGoBack = currentStep !== 'start';
  const steps: MonthlyPlanningStep[] = ['start', 'financial', 'projects', 'relationship', 'routine', 'finalize'];
  const currentStepIndex = steps.indexOf(currentStep);
  const currentStepNumber = currentStepIndex + 1;
  const totalSteps = steps.length;

  const handleAISessionComplete = async () => {
    console.log('AI Session completed');
    
    // Finalize AI session
    if (aiSessionId) {
      try {
        await aiPlanningService.processUserMessage(
          aiSessionId, 
          'Monthly planning session completed successfully.'
        );
      } catch (error) {
        console.error('Error finalizing AI session:', error);
      }
    }
  };

  const navigateToStep = (targetStep: MonthlyPlanningStep) => {
    // Allow navigation to any step (users can go back/forward freely)
    setCurrentStep(targetStep);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading monthly planning session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadSession}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Monthly Planning Session</h1>
        <p className="text-gray-600">
          AI-guided comprehensive monthly review and planning - 2 hour session format
        </p>
        
        {/* Step Counter and Navigation */}
        <div className="flex items-center justify-center space-x-4 mt-4 mb-4">
          <button
            onClick={handleStepBack}
            disabled={!canGoBack}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              canGoBack 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            ← Back
          </button>
          
          <div className="text-sm text-gray-600">
            Step {currentStepNumber} of {totalSteps}
          </div>
          
          <div className="text-sm text-gray-500 font-medium capitalize">
            {currentStep === 'finalize' ? 'Review & Complete' : currentStep}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-2 max-w-md mx-auto">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${
                currentStep === 'start' ? 0 : 
                currentStep === 'financial' ? 20 : 
                currentStep === 'projects' ? 40 : 
                currentStep === 'relationship' ? 60 : 
                currentStep === 'routine' ? 80 : 100
              }%` 
            }}
          />
        </div>
        
        {/* Step Indicators - Clickable Navigation */}
        <div className="flex justify-between mt-2 text-xs max-w-md mx-auto">
          {steps.map((step, index) => (
            <button
              key={step}
              onClick={() => navigateToStep(step)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer hover:bg-gray-100 ${
                currentStep === step 
                  ? 'text-blue-600 font-semibold bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title={`Go to ${step === 'finalize' ? 'Review & Complete' : step} step`}
            >
              {step === 'start' ? 'Start' :
               step === 'financial' ? 'Financial' :
               step === 'projects' ? 'Projects' :
               step === 'relationship' ? 'Relationship' :
               step === 'routine' ? 'Routine' :
               'Complete'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout: AI Guidance + Planning Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Guidance Panel - Sticky sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AIGuidancePanel 
              context={aiContext}
              sessionId={aiSessionId || undefined}
              onSectionComplete={(section) => {
                if (section === 'start') setCurrentStep('financial');
                else {
                  const step = section as MonthlyPlanningStep;
                  handleStepComplete(step);
                }
              }}
              onSessionComplete={() => {
                handleAISessionComplete();
                onComplete?.();
              }}
            />
          </div>
        </div>

        {/* Main Planning Content */}
        <div className="lg:col-span-2">
          {/* Step Content */}
      {currentStep === 'start' && (
        <StartStep 
          session={session}
          onComplete={() => handleStepComplete('start')}
        />
      )}
      
      {currentStep === 'financial' && (
        <FinancialStep 
          session={session}
          onComplete={() => handleStepComplete('financial')}
        />
      )}
      
      {currentStep === 'projects' && (
        <ProjectsStep 
          session={session}
          onComplete={() => handleStepComplete('projects')}
        />
      )}
      
      {currentStep === 'relationship' && (
        <RelationshipStep 
          session={session}
          onComplete={() => handleStepComplete('relationship')}
        />
      )}
      
      {currentStep === 'routine' && (
        <RoutineStep 
          session={session}
          onComplete={() => handleStepComplete('routine')}
        />
      )}
      
      {currentStep === 'finalize' && (
        <FinalizeStep 
          session={session}
          onComplete={() => handleStepComplete('finalize')}
        />
      )}
        </div>
      </div>
    </div>
  );
};

// Start Step Component
const StartStep: React.FC<{ session: PlanningSession; onComplete: () => void }> = ({ session, onComplete }) => {
  const monthName = new Date(session.periodStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Welcome to {monthName} Planning</h2>
      <div className="space-y-4">
        <p className="text-gray-600">
          This comprehensive monthly planning session will cover:
        </p>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
            Financial review and budget analysis
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
            Project prioritization and resource allocation
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
            Relationship and parenting focus areas
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
            Routine delegation and workload balance
          </li>
        </ul>
        <div className="pt-4">
          <p className="text-sm text-gray-500 mb-4">
            Set aside 2 hours for this comprehensive session (typically first Sunday 7:15-9:15).
          </p>
          <button 
            onClick={onComplete}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Begin Monthly Planning
          </button>
        </div>
      </div>
    </div>
  );
};

// Financial Step Component
const FinancialStep: React.FC<{ session: PlanningSession; onComplete: () => void }> = ({ session, onComplete }) => {
  const [financialData, setFinancialData] = useState(() => {
    const current = session.reviewPhase.financialReview;
    return {
      // Review Data (what happened this month)
      lastMonthSpending: current?.expenditureReview?.largeExpenses || [],
      actualIncome: current?.monthlyBudget?.income || 0,
      actualExpenses: current?.monthlyBudget?.expenses || 0,
      savingsAchieved: current?.monthlyBudget?.savings || 0,
      
      // Planning Data (goals for next month)
      plannedIncome: current?.monthlyBudget?.income || 0,
      plannedExpenses: current?.monthlyBudget?.expenses || 0,
      savingsGoal: current?.expenditureReview?.savingsGoalProgress || 0,
      upcomingBigItems: current?.upcomingBigItems || [],
      budgetCategories: current?.monthlyBudget?.categories || {}
    };
  });

  const [newExpenditure, setNewExpenditure] = useState({ item: '', amount: 0, category: '', necessary: true });
  const [newBigItem, setNewBigItem] = useState({ item: '', estimatedCost: 0, targetMonth: '', priority: 'medium' as 'high' | 'medium' | 'low' });

  const netSavingsPlanned = financialData.plannedIncome - financialData.plannedExpenses;
  const netSavingsActual = financialData.actualIncome - financialData.actualExpenses;
  const savingsProgress = financialData.savingsGoal > 0 ? (netSavingsActual / financialData.savingsGoal) * 100 : 0;

  const addLastMonthSpending = () => {
    if (newExpenditure.item && newExpenditure.amount > 0) {
      setFinancialData(prev => ({
        ...prev,
        lastMonthSpending: [...prev.lastMonthSpending, { ...newExpenditure }]
      }));
      setNewExpenditure({ item: '', amount: 0, category: '', necessary: true });
    }
  };

  const removeLastMonthSpending = (index: number) => {
    setFinancialData(prev => ({
      ...prev,
      lastMonthSpending: prev.lastMonthSpending.filter((_, i) => i !== index)
    }));
  };

  const addBigItem = () => {
    if (newBigItem.item && newBigItem.estimatedCost > 0) {
      setFinancialData(prev => ({
        ...prev,
        upcomingBigItems: [...prev.upcomingBigItems, { ...newBigItem }]
      }));
      setNewBigItem({ item: '', estimatedCost: 0, targetMonth: '', priority: 'medium' });
    }
  };

  const removeBigItem = (index: number) => {
    setFinancialData(prev => ({
      ...prev,
      upcomingBigItems: prev.upcomingBigItems.filter((_, i) => i !== index)
    }));
  };

  const saveFinancialDataAndCreateTasks = async () => {
    try {
      // Save financial review data to session
      const updatedFinancialReview = {
        monthlyBudget: {
          income: financialData.plannedIncome,
          expenses: financialData.plannedExpenses,
          savings: financialData.savingsGoal,
          categories: financialData.budgetCategories
        },
        expenditureReview: {
          largeExpenses: financialData.lastMonthSpending,
          categoryOverages: [],
          savingsGoalProgress: savingsProgress
        },
        upcomingBigItems: financialData.upcomingBigItems
      };

      // Create tasks from financial planning
      const financialTasks: any[] = [];
      
      // Create tasks for upcoming big items
      financialData.upcomingBigItems.forEach((item, index) => {
        if (item.priority === 'high') {
          financialTasks.push({
            taskId: `financial_big_item_${index}`,
            priority: 'high',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due next week
            title: `Plan for ${item.item}`,
            description: `Research and plan for upcoming expense: ${item.item} ($${item.estimatedCost.toLocaleString()})`
          });
        }
      });

      // Create budget review task if there are concerning variances
      if (netSavingsActual < financialData.savingsGoal * 0.8) {
        financialTasks.push({
          taskId: 'budget_review_task',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Due in 3 days
          title: 'Review and adjust budget',
          description: `Savings goal not met (${savingsProgress.toFixed(1)}%). Review spending patterns and adjust budget.`
        });
      }

      // Here you would save to the session and add tasks to nextPeriodTasks
      console.log('Created financial tasks for monthly planning:', financialTasks);
      
      // TODO: Update session with financialReview and add tasks to planningPhase.nextPeriodTasks
      
    } catch (error) {
      console.error('Error saving financial data and creating tasks:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-6">Financial Review & Planning</h2>
      
      {/* Review Section */}
      <div className="mb-8">
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📊 Review: What happened this month?</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Actual Financials</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Actual Income</label>
                <input
                  type="number"
                  value={financialData.actualIncome}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, actualIncome: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Actual Expenses</label>
                <input
                  type="number"
                  value={financialData.actualExpenses}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, actualExpenses: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Actual Savings</label>
                <input
                  type="number"
                  value={financialData.savingsAchieved}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, savingsAchieved: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Net Savings Actual:</span>
                  <span className={`font-semibold ${netSavingsActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${netSavingsActual.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Major Spending This Month</h4>
            <div className="space-y-3">
              {financialData.lastMonthSpending.map((exp, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{exp.item}</span>
                    <span className="text-gray-600 ml-2">${exp.amount.toLocaleString()}</span>
                    <span className="text-gray-500 ml-2 text-sm">({exp.category})</span>
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${exp.necessary ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {exp.necessary ? 'Necessary' : 'Optional'}
                    </span>
                  </div>
                  <button
                    onClick={() => removeLastMonthSpending(index)}
                    className="text-red-600 hover:text-red-800 ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="text"
                  placeholder="Item"
                  value={newExpenditure.item}
                  onChange={(e) => setNewExpenditure(prev => ({ ...prev, item: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newExpenditure.amount || ''}
                  onChange={(e) => setNewExpenditure(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={newExpenditure.category}
                  onChange={(e) => setNewExpenditure(prev => ({ ...prev, category: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <select
                  value={newExpenditure.necessary ? 'true' : 'false'}
                  onChange={(e) => setNewExpenditure(prev => ({ ...prev, necessary: e.target.value === 'true' }))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="true">Necessary</option>
                  <option value="false">Optional</option>
                </select>
                <button
                  onClick={addLastMonthSpending}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planning Section */}
      <div>
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold text-green-900 mb-2">🎯 Planning: What do we want for next month?</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Next Month's Budget</h4>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Planned Income</label>
                <input
                  type="number"
                  value={financialData.plannedIncome}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, plannedIncome: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Planned Expenses</label>
                <input
                  type="number"
                  value={financialData.plannedExpenses}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, plannedExpenses: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Savings Goal</label>
                <input
                  type="number"
                  value={financialData.savingsGoal}
                  onChange={(e) => setFinancialData(prev => ({ ...prev, savingsGoal: Number(e.target.value) }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="0"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Net Savings Planned:</span>
                  <span className={`font-semibold ${netSavingsPlanned >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${netSavingsPlanned.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Savings Progress vs Goal</h4>
            <div className="bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className={`h-3 rounded-full ${savingsProgress >= 100 ? 'bg-green-600' : savingsProgress >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, savingsProgress))}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {savingsProgress.toFixed(1)}% of monthly savings goal achieved
            </p>
          </div>
        </div>
        
        {/* Upcoming Big Items - Planning Section */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Upcoming Big Items & Major Purchases</h4>
          <div className="space-y-3">
            {financialData.upcomingBigItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">{item.item}</span>
                  <span className="text-gray-600 ml-2">${item.estimatedCost.toLocaleString()}</span>
                  <span className="text-gray-500 ml-2 text-sm">({item.targetMonth})</span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                    item.priority === 'high' ? 'bg-red-100 text-red-800' : 
                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <button
                  onClick={() => removeBigItem(index)}
                  className="text-red-600 hover:text-red-800 ml-2"
                >
                  ×
                </button>
              </div>
            ))}
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-green-50 rounded-lg">
              <input
                type="text"
                placeholder="Item"
                value={newBigItem.item}
                onChange={(e) => setNewBigItem(prev => ({ ...prev, item: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="number"
                placeholder="Cost"
                value={newBigItem.estimatedCost || ''}
                onChange={(e) => setNewBigItem(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <input
                type="text"
                placeholder="Target Month"
                value={newBigItem.targetMonth}
                onChange={(e) => setNewBigItem(prev => ({ ...prev, targetMonth: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <select
                value={newBigItem.priority}
                onChange={(e) => setNewBigItem(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={addBigItem}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            // Save financial data to session and create tasks
            saveFinancialDataAndCreateTasks();
            onComplete();
          }}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Project Prioritization
        </button>
      </div>
    </div>
  );
};

// Projects Step Component
const ProjectsStep: React.FC<{ session: PlanningSession; onComplete: () => void }> = ({ session, onComplete }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(() => {
    const current = session.planningPhase.projectPrioritization;
    return {
      activeProjects: current?.activeProjects || [],
      proposedProjects: current?.proposedProjects || [],
      completedProjects: [],
      resourceAllocation: {
        totalTimeHours: 40, // Default weekly hours
        totalBudget: 1000, // Default monthly project budget
        allocations: []
      }
    };
  });

  // Load existing projects from database
  useEffect(() => {
    const loadExistingProjects = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        console.log('Loading existing projects for monthly planning...');
        const goals = await goalService.getGoalsByContext(session.contextId);
        
        // Convert existing goals to project format if not already in session
        const existingProjectIds = new Set(projectData.activeProjects.map(p => p.projectId));
        
        const goalProjects = goals
          .filter(goal => goal.projects?.length > 0 || goal.tags?.includes('project'))
          .filter(goal => !existingProjectIds.has(goal.id))
          .map(goal => ({
            projectId: goal.id,
            title: goal.title,
            priority: goal.priority === 'high' ? 8 : goal.priority === 'medium' ? 5 : 2,
            progress: goal.progress,
            blockers: goal.tasks?.filter(t => t.status === 'cancelled').map(t => t.title) || [],
            nextMonthGoals: [],
            tasks: goal.tasks?.map(task => ({
              id: task.id,
              title: task.title,
              dueDate: task.dueDate || '',
              priority: (task.priority === 'critical' ? 'high' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
              status: (task.status === 'cancelled' ? 'blocked' : task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed' | 'blocked',
              estimatedHours: Math.round(task.estimatedDuration / 60) || 1,
              completedAt: task.completedAt
            })) || []
          }));

        if (goalProjects.length > 0) {
          setProjectData(prev => ({
            ...prev,
            activeProjects: [...prev.activeProjects, ...goalProjects]
          }));
          console.log(`Loaded ${goalProjects.length} existing projects from goals`);
        }
      } catch (error) {
        console.error('Error loading existing projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingProjects();
  }, [user?.id, session.contextId]);

  const [newActiveProject, setNewActiveProject] = useState({
    projectId: '',
    title: '',
    priority: 5,
    progress: 0,
    blockers: [],
    nextMonthGoals: [],
    tasks: []
  });

  const [newProposedProject, setNewProposedProject] = useState({
    title: '',
    description: '',
    estimatedEffort: 'medium' as 'small' | 'medium' | 'large',
    urgency: 'medium' as 'high' | 'medium' | 'low',
    dependencies: []
  });

  const [newBlocker, setNewBlocker] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    estimatedHours: 1
  });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const addActiveProject = () => {
    if (newActiveProject.title) {
      const project = {
        ...newActiveProject,
        projectId: `proj_${Date.now()}`,
        blockers: [],
        nextMonthGoals: [],
        tasks: []
      };
      setProjectData(prev => ({
        ...prev,
        activeProjects: [...prev.activeProjects, project]
      }));
      setNewActiveProject({
        projectId: '',
        title: '',
        priority: 5,
        progress: 0,
        blockers: [],
        nextMonthGoals: [],
        tasks: []
      });
    }
  };

  const addProposedProject = () => {
    if (newProposedProject.title) {
      setProjectData(prev => ({
        ...prev,
        proposedProjects: [...prev.proposedProjects, { 
          ...newProposedProject, 
          dependencies: [],
          plannedTasks: [],
          newTaskTitle: ''
        }]
      }));
      setNewProposedProject({
        title: '',
        description: '',
        estimatedEffort: 'medium',
        urgency: 'medium',
        dependencies: []
      });
    }
  };

  // Proposed project task management
  const addTaskToProposed = (projectIndex: number, taskTitle: string) => {
    if (!taskTitle.trim()) return;
    
    setProjectData(prev => ({
      ...prev,
      proposedProjects: prev.proposedProjects.map((project, i) => 
        i === projectIndex 
          ? { 
              ...project, 
              plannedTasks: [...(project as any).plannedTasks || [], { 
                title: taskTitle,
                id: `task_${Date.now()}`,
                priority: 'medium',
                estimatedHours: 1
              }],
              newTaskTitle: ''
            }
          : project
      )
    }));
  };

  const removeTaskFromProposed = (projectIndex: number, taskIndex: number) => {
    setProjectData(prev => ({
      ...prev,
      proposedProjects: prev.proposedProjects.map((project, i) => 
        i === projectIndex 
          ? { 
              ...project, 
              plannedTasks: ((project as any).plannedTasks || []).filter((_: any, tIndex: number) => tIndex !== taskIndex)
            }
          : project
      )
    }));
  };

  const updateProposedProjectNewTask = (projectIndex: number, value: string) => {
    setProjectData(prev => ({
      ...prev,
      proposedProjects: prev.proposedProjects.map((project, i) => 
        i === projectIndex 
          ? { ...project, newTaskTitle: value }
          : project
      )
    }));
  };

  // Promote proposed project to active
  const promoteToActive = (proposedIndex: number) => {
    const proposedProject = projectData.proposedProjects[proposedIndex];
    
    const newActiveProject = {
      projectId: `project_${Date.now()}`,
      title: proposedProject.title,
      priority: proposedProject.urgency === 'high' ? 8 : proposedProject.urgency === 'medium' ? 5 : 2,
      progress: 0,
      blockers: [],
      nextMonthGoals: [],
      tasks: ((proposedProject as any).plannedTasks || []).map((task: any) => ({
        id: task.id || `task_${Date.now()}_${Math.random()}`,
        title: task.title,
        dueDate: '',
        priority: task.priority || 'medium',
        status: 'pending' as const,
        estimatedHours: task.estimatedHours || 1,
        completedAt: undefined
      }))
    };

    // Add to active projects and remove from proposed
    setProjectData(prev => ({
      ...prev,
      activeProjects: [...prev.activeProjects, newActiveProject],
      proposedProjects: prev.proposedProjects.filter((_, i) => i !== proposedIndex)
    }));
    
    console.log(`Promoted "${proposedProject.title}" to active project with ${((proposedProject as any).plannedTasks || []).length} tasks`);
  };

  const removeActiveProject = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      activeProjects: prev.activeProjects.filter((_, i) => i !== index)
    }));
  };

  const removeProposedProject = (index: number) => {
    setProjectData(prev => ({
      ...prev,
      proposedProjects: prev.proposedProjects.filter((_, i) => i !== index)
    }));
  };

  const updateProjectProgress = (index: number, progress: number) => {
    setProjectData(prev => ({
      ...prev,
      activeProjects: prev.activeProjects.map((project, i) => 
        i === index ? { ...project, progress } : project
      )
    }));
  };

  const updateProjectPriority = (index: number, priority: number) => {
    setProjectData(prev => ({
      ...prev,
      activeProjects: prev.activeProjects.map((project, i) => 
        i === index ? { ...project, priority } : project
      )
    }));
  };

  const addBlockerToProject = (projectIndex: number, blocker: string) => {
    if (blocker.trim()) {
      setProjectData(prev => ({
        ...prev,
        activeProjects: prev.activeProjects.map((project, i) => 
          i === projectIndex 
            ? { ...project, blockers: [...project.blockers, blocker.trim()] }
            : project
        )
      }));
    }
  };

  const addGoalToProject = (projectIndex: number, goal: string) => {
    if (goal.trim()) {
      setProjectData(prev => ({
        ...prev,
        activeProjects: prev.activeProjects.map((project, i) => 
          i === projectIndex 
            ? { ...project, nextMonthGoals: [...project.nextMonthGoals, goal.trim()] }
            : project
        )
      }));
    }
  };

  const addTaskToProject = (projectIndex: number) => {
    if (newTask.title.trim()) {
      const task = {
        id: `task_${Date.now()}`,
        ...newTask,
        title: newTask.title.trim(),
        status: 'pending' as const
      };
      
      setProjectData(prev => ({
        ...prev,
        activeProjects: prev.activeProjects.map((project, i) => 
          i === projectIndex 
            ? { ...project, tasks: [...(project.tasks || []), task] }
            : project
        )
      }));
      
      setNewTask({
        title: '',
        dueDate: '',
        priority: 'medium',
        estimatedHours: 1
      });
    }
  };

  const removeTaskFromProject = (projectIndex: number, taskIndex: number) => {
    setProjectData(prev => ({
      ...prev,
      activeProjects: prev.activeProjects.map((project, i) => 
        i === projectIndex 
          ? { ...project, tasks: project.tasks?.filter((_, tIndex) => tIndex !== taskIndex) || [] }
          : project
      )
    }));
  };

  const updateTaskStatus = (projectIndex: number, taskIndex: number, status: 'pending' | 'in_progress' | 'completed' | 'blocked') => {
    setProjectData(prev => ({
      ...prev,
      activeProjects: prev.activeProjects.map((project, i) => 
        i === projectIndex 
          ? { 
              ...project, 
              tasks: project.tasks?.map((task, tIndex) => 
                tIndex === taskIndex 
                  ? { ...task, status, completedAt: status === 'completed' ? new Date().toISOString() : undefined }
                  : task
              ) || []
            }
          : project
      )
    }));
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Project Prioritization</h2>
      <div className="space-y-6">
        
        {/* Active Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Active Projects</h3>
            {loading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading existing projects...
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Review progress and set next month goals. Projects from your goals database are automatically included.
          </p>
          
          <div className="space-y-4">
            {projectData.activeProjects.map((project, index) => (
              <div key={project.projectId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleProjectExpansion(project.projectId)}
                      className="mr-2 text-gray-400 hover:text-gray-600"
                    >
                      {expandedProject === project.projectId ? '▼' : '▶'}
                    </button>
                    <h4 className="font-medium text-lg">{project.title}</h4>
                    {project.projectId.startsWith('proj_') ? (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        Manual
                      </span>
                    ) : (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        From Goals
                      </span>
                    )}
                    <span className="ml-2 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      {project.tasks?.length || 0} tasks
                    </span>
                  </div>
                  <button
                    onClick={() => removeActiveProject(index)}
                    className="text-red-600 hover:text-red-800"
                    title={project.projectId.startsWith('proj_') ? 'Remove manual project' : 'Hide from monthly planning (won\'t delete from goals)'}
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Priority (1-10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={project.priority}
                      onChange={(e) => updateProjectPriority(index, Number(e.target.value))}
                      className="w-full mt-1"
                    />
                    <span className="text-sm text-gray-500">Priority: {project.priority}</span>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Progress (%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={project.progress}
                      onChange={(e) => updateProjectProgress(index, Number(e.target.value))}
                      className="w-full mt-1"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Progress: {project.progress}%</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tasks Section - Expandable */}
                {expandedProject === project.projectId && (
                  <div className="mt-4 border-t pt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Project Tasks</h5>
                    
                    {/* Existing Tasks */}
                    <div className="space-y-2 mb-4">
                      {project.tasks?.map((task, taskIndex) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                onChange={(e) => updateTaskStatus(index, taskIndex, e.target.checked ? 'completed' : 'pending')}
                                className="h-4 w-4 text-blue-600 rounded"
                              />
                              <span className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </span>
                              {task.dueDate && (
                                <span className="text-xs text-gray-500">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {task.estimatedHours}h
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeTaskFromProject(index, taskIndex)}
                            className="text-red-600 hover:text-red-800 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add New Task */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                      <h6 className="font-medium mb-2 text-sm">Add Task</h6>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input
                          type="text"
                          placeholder="Task title..."
                          value={newTask.title}
                          onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Hours"
                          min="0.5"
                          step="0.5"
                          value={newTask.estimatedHours}
                          onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => addTaskToProject(index)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Add Task
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-3">
                  <label className="text-sm text-gray-600">Current Blockers</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {project.blockers.map((blocker, blockerIndex) => (
                      <span key={blockerIndex} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        {blocker}
                      </span>
                    ))}
                  </div>
                  <div className="flex mt-2">
                    <input
                      type="text"
                      placeholder="Add blocker..."
                      value={newBlocker}
                      onChange={(e) => setNewBlocker(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addBlockerToProject(index, newBlocker);
                          setNewBlocker('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        addBlockerToProject(index, newBlocker);
                        setNewBlocker('');
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded-r text-sm hover:bg-red-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="text-sm text-gray-600">Next Month Goals</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {project.nextMonthGoals.map((goal, goalIndex) => (
                      <span key={goalIndex} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {goal}
                      </span>
                    ))}
                  </div>
                  <div className="flex mt-2">
                    <input
                      type="text"
                      placeholder="Add next month goal..."
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addGoalToProject(index, newGoal);
                          setNewGoal('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        addGoalToProject(index, newGoal);
                        setNewGoal('');
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded-r text-sm hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Active Project */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium mb-3">Add Active Project</h4>
              <input
                type="text"
                placeholder="Project title..."
                value={newActiveProject.title}
                onChange={(e) => setNewActiveProject(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
              />
              <button
                onClick={addActiveProject}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Add Active Project
              </button>
            </div>
          </div>
        </div>
        
        {/* Proposed Projects */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Proposed Projects</h3>
          <p className="text-gray-600 text-sm mb-4">Evaluate new project opportunities</p>
          
          <div className="space-y-3">
            {projectData.proposedProjects.map((project, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{project.title}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => promoteToActive(index)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                      title="Promote to Active Project"
                    >
                      ↗ Promote
                    </button>
                    <button
                      onClick={() => removeProposedProject(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                <div className="flex space-x-4 text-xs mb-3">
                  <span className={`px-2 py-1 rounded ${
                    project.estimatedEffort === 'large' ? 'bg-red-100 text-red-800' :
                    project.estimatedEffort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {project.estimatedEffort} effort
                  </span>
                  <span className={`px-2 py-1 rounded ${
                    project.urgency === 'high' ? 'bg-red-100 text-red-800' :
                    project.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {project.urgency} urgency
                  </span>
                </div>
                
                {/* Pre-promotion task planning */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Tasks (before promoting):</h5>
                  {(project as any).plannedTasks?.map((task: any, taskIndex: number) => (
                    <div key={taskIndex} className="flex items-center justify-between py-1 text-sm">
                      <span>{task.title}</span>
                      <button
                        onClick={() => removeTaskFromProposed(index, taskIndex)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  )) || <p className="text-xs text-gray-500">No tasks defined yet</p>}
                  
                  <div className="flex mt-2">
                    <input
                      type="text"
                      placeholder="Add task for this project..."
                      value={(project as any).newTaskTitle || ''}
                      onChange={(e) => updateProposedProjectNewTask(index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTaskToProposed(index, (project as any).newTaskTitle || '');
                        }
                      }}
                    />
                    <button
                      onClick={() => addTaskToProposed(index, (project as any).newTaskTitle || '')}
                      className="px-3 py-1 bg-blue-600 text-white rounded-r text-sm hover:bg-blue-700"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Proposed Project */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium mb-3">Propose New Project</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Project title..."
                  value={newProposedProject.title}
                  onChange={(e) => setNewProposedProject(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <textarea
                  placeholder="Project description..."
                  value={newProposedProject.description}
                  onChange={(e) => setNewProposedProject(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm h-20"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newProposedProject.estimatedEffort}
                    onChange={(e) => setNewProposedProject(prev => ({ ...prev, estimatedEffort: e.target.value as 'small' | 'medium' | 'large' }))}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="small">Small Effort</option>
                    <option value="medium">Medium Effort</option>
                    <option value="large">Large Effort</option>
                  </select>
                  <select
                    value={newProposedProject.urgency}
                    onChange={(e) => setNewProposedProject(prev => ({ ...prev, urgency: e.target.value as 'high' | 'medium' | 'low' }))}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="high">High Urgency</option>
                    <option value="medium">Medium Urgency</option>
                    <option value="low">Low Urgency</option>
                  </select>
                </div>
                <button
                  onClick={addProposedProject}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
                >
                  Add Proposed Project
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resource Allocation Summary */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Resource Allocation Overview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Active Projects:</span>
                <span className="font-medium ml-2">{projectData.activeProjects.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Tasks:</span>
                <span className="font-medium ml-2">
                  {projectData.activeProjects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Completed Tasks:</span>
                <span className="font-medium ml-2">
                  {projectData.activeProjects.reduce((sum, p) => 
                    sum + (p.tasks?.filter(t => t.status === 'completed').length || 0), 0
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Estimated Hours:</span>
                <span className="font-medium ml-2">
                  {projectData.activeProjects.reduce((sum, p) => 
                    sum + (p.tasks?.filter(t => t.status !== 'completed').reduce((taskSum, t) => taskSum + (t.estimatedHours || 0), 0) || 0), 0
                  )}h
                </span>
              </div>
              <div>
                <span className="text-gray-600">Proposed Projects:</span>
                <span className="font-medium ml-2">{projectData.proposedProjects.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Avg. Priority:</span>
                <span className="font-medium ml-2">
                  {projectData.activeProjects.length > 0 
                    ? (projectData.activeProjects.reduce((sum, p) => sum + p.priority, 0) / projectData.activeProjects.length).toFixed(1)
                    : 'N/A'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Overdue Tasks:</span>
                <span className="font-medium ml-2 text-red-600">
                  {projectData.activeProjects.reduce((sum, p) => 
                    sum + (p.tasks?.filter(t => 
                      t.status !== 'completed' && 
                      t.dueDate && 
                      new Date(t.dueDate) < new Date()
                    ).length || 0), 0
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">This Week:</span>
                <span className="font-medium ml-2 text-blue-600">
                  {(() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    return projectData.activeProjects.reduce((sum, p) => 
                      sum + (p.tasks?.filter(t => 
                        t.status !== 'completed' && 
                        t.dueDate && 
                        new Date(t.dueDate) <= nextWeek
                      ).length || 0), 0
                    );
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onComplete}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Relationship Review
        </button>
      </div>
    </div>
  );
};

// Relationship Step Component
const RelationshipStep: React.FC<{ session: PlanningSession; onComplete: () => void }> = ({ session, onComplete }) => {
  const [relationshipData, setRelationshipData] = useState(() => {
    const current = session.reviewPhase.relationshipParentingReview;
    return {
      relationshipGoals: current?.relationshipGoals || [],
      parentingFocus: current?.parentingFocus || [],
      coupleTimeQuality: current?.coupleTime?.lastMonthQuality || 5,
      upcomingOpportunities: current?.coupleTime?.upcomingOpportunities || [],
      scheduledDates: current?.coupleTime?.scheduledDates || []
    };
  });

  const [newRelationshipGoal, setNewRelationshipGoal] = useState({
    area: '',
    currentState: '',
    desiredState: '',
    nextMonthActions: []
  });

  const [newParentingFocus, setNewParentingFocus] = useState({
    childName: '',
    currentChallenges: [],
    wins: [],
    nextMonthPriorities: []
  });

  const [newAction, setNewAction] = useState('');
  const [newChallenge, setNewChallenge] = useState('');
  const [newWin, setNewWin] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newOpportunity, setNewOpportunity] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState('');

  // Relationship Goals Functions
  const addRelationshipGoal = () => {
    if (newRelationshipGoal.area && newRelationshipGoal.currentState) {
      setRelationshipData(prev => ({
        ...prev,
        relationshipGoals: [...prev.relationshipGoals, { ...newRelationshipGoal, nextMonthActions: [] }]
      }));
      setNewRelationshipGoal({
        area: '',
        currentState: '',
        desiredState: '',
        nextMonthActions: []
      });
    }
  };

  const removeRelationshipGoal = (index: number) => {
    setRelationshipData(prev => ({
      ...prev,
      relationshipGoals: prev.relationshipGoals.filter((_, i) => i !== index)
    }));
  };

  const addActionToGoal = (goalIndex: number, action: string) => {
    if (action.trim()) {
      setRelationshipData(prev => ({
        ...prev,
        relationshipGoals: prev.relationshipGoals.map((goal, i) => 
          i === goalIndex 
            ? { ...goal, nextMonthActions: [...goal.nextMonthActions, action.trim()] }
            : goal
        )
      }));
    }
  };

  // Parenting Focus Functions
  const addParentingFocus = () => {
    if (newParentingFocus.childName) {
      setRelationshipData(prev => ({
        ...prev,
        parentingFocus: [...prev.parentingFocus, { 
          ...newParentingFocus, 
          currentChallenges: [],
          wins: [],
          nextMonthPriorities: []
        }]
      }));
      setNewParentingFocus({
        childName: '',
        currentChallenges: [],
        wins: [],
        nextMonthPriorities: []
      });
    }
  };

  const removeParentingFocus = (index: number) => {
    setRelationshipData(prev => ({
      ...prev,
      parentingFocus: prev.parentingFocus.filter((_, i) => i !== index)
    }));
  };

  const addToParentingArray = (focusIndex: number, arrayType: 'currentChallenges' | 'wins' | 'nextMonthPriorities', item: string) => {
    if (item.trim()) {
      setRelationshipData(prev => ({
        ...prev,
        parentingFocus: prev.parentingFocus.map((focus, i) => 
          i === focusIndex 
            ? { ...focus, [arrayType]: [...focus[arrayType], item.trim()] }
            : focus
        )
      }));
    }
  };

  // Couple Time Functions
  const addOpportunity = () => {
    if (newOpportunity.trim()) {
      setRelationshipData(prev => ({
        ...prev,
        upcomingOpportunities: [...prev.upcomingOpportunities, newOpportunity.trim()]
      }));
      setNewOpportunity('');
    }
  };

  const addScheduledDate = () => {
    if (newScheduledDate.trim()) {
      setRelationshipData(prev => ({
        ...prev,
        scheduledDates: [...prev.scheduledDates, newScheduledDate.trim()]
      }));
      setNewScheduledDate('');
    }
  };

  const removeOpportunity = (index: number) => {
    setRelationshipData(prev => ({
      ...prev,
      upcomingOpportunities: prev.upcomingOpportunities.filter((_, i) => i !== index)
    }));
  };

  const removeScheduledDate = (index: number) => {
    setRelationshipData(prev => ({
      ...prev,
      scheduledDates: prev.scheduledDates.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Relationship & Parenting Review</h2>
      <div className="space-y-6">
        
        {/* Relationship Goals */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Relationship Goals</h3>
          <p className="text-gray-600 text-sm mb-4">Areas of focus for couple relationship</p>
          
          <div className="space-y-4">
            {relationshipData.relationshipGoals.map((goal, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-lg">{goal.area}</h4>
                  <button
                    onClick={() => removeRelationshipGoal(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="text-sm text-gray-600">Current State</label>
                    <p className="text-sm bg-gray-50 p-2 rounded">{goal.currentState}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Desired State</label>
                    <p className="text-sm bg-gray-50 p-2 rounded">{goal.desiredState}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="text-sm text-gray-600">Next Month Actions</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {goal.nextMonthActions.map((action, actionIndex) => (
                      <span key={actionIndex} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {action}
                      </span>
                    ))}
                  </div>
                  <div className="flex mt-2">
                    <input
                      type="text"
                      placeholder="Add action..."
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addActionToGoal(index, newAction);
                          setNewAction('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        addActionToGoal(index, newAction);
                        setNewAction('');
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded-r text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Relationship Goal */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium mb-3">Add Relationship Goal</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Relationship area (e.g., Communication, Intimacy, Quality Time)"
                  value={newRelationshipGoal.area}
                  onChange={(e) => setNewRelationshipGoal(prev => ({ ...prev, area: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <textarea
                    placeholder="Current state..."
                    value={newRelationshipGoal.currentState}
                    onChange={(e) => setNewRelationshipGoal(prev => ({ ...prev, currentState: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded text-sm h-20"
                  />
                  <textarea
                    placeholder="Desired state..."
                    value={newRelationshipGoal.desiredState}
                    onChange={(e) => setNewRelationshipGoal(prev => ({ ...prev, desiredState: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded text-sm h-20"
                  />
                </div>
                <button
                  onClick={addRelationshipGoal}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Add Relationship Goal
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Parenting Focus */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Parenting Focus</h3>
          <p className="text-gray-600 text-sm mb-4">Individual child priorities and wins</p>
          
          <div className="space-y-4">
            {relationshipData.parentingFocus.map((focus, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-lg">{focus.childName}</h4>
                  <button
                    onClick={() => removeParentingFocus(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Current Challenges */}
                  <div>
                    <label className="text-sm text-gray-600">Current Challenges</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {focus.currentChallenges.map((challenge, cIndex) => (
                        <span key={cIndex} className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          {challenge}
                        </span>
                      ))}
                    </div>
                    <div className="flex mt-2">
                      <input
                        type="text"
                        placeholder="Add challenge..."
                        value={newChallenge}
                        onChange={(e) => setNewChallenge(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToParentingArray(index, 'currentChallenges', newChallenge);
                            setNewChallenge('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          addToParentingArray(index, 'currentChallenges', newChallenge);
                          setNewChallenge('');
                        }}
                        className="px-2 py-1 bg-red-600 text-white rounded-r text-xs hover:bg-red-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  {/* Wins */}
                  <div>
                    <label className="text-sm text-gray-600">Recent Wins</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {focus.wins.map((win, wIndex) => (
                        <span key={wIndex} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {win}
                        </span>
                      ))}
                    </div>
                    <div className="flex mt-2">
                      <input
                        type="text"
                        placeholder="Add win..."
                        value={newWin}
                        onChange={(e) => setNewWin(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToParentingArray(index, 'wins', newWin);
                            setNewWin('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          addToParentingArray(index, 'wins', newWin);
                          setNewWin('');
                        }}
                        className="px-2 py-1 bg-green-600 text-white rounded-r text-xs hover:bg-green-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  {/* Next Month Priorities */}
                  <div>
                    <label className="text-sm text-gray-600">Next Month Priorities</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {focus.nextMonthPriorities.map((priority, pIndex) => (
                        <span key={pIndex} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          {priority}
                        </span>
                      ))}
                    </div>
                    <div className="flex mt-2">
                      <input
                        type="text"
                        placeholder="Add priority..."
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addToParentingArray(index, 'nextMonthPriorities', newPriority);
                            setNewPriority('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          addToParentingArray(index, 'nextMonthPriorities', newPriority);
                          setNewPriority('');
                        }}
                        className="px-2 py-1 bg-yellow-600 text-white rounded-r text-xs hover:bg-yellow-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Parenting Focus */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <h4 className="font-medium mb-3">Add Child Focus</h4>
              <input
                type="text"
                placeholder="Child's name..."
                value={newParentingFocus.childName}
                onChange={(e) => setNewParentingFocus(prev => ({ ...prev, childName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
              />
              <button
                onClick={addParentingFocus}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              >
                Add Child Focus
              </button>
            </div>
          </div>
        </div>
        
        {/* Couple Time Quality */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Couple Time Quality</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-600">Last Month Quality (1-10)</label>
              <div className="mt-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={relationshipData.coupleTimeQuality}
                  onChange={(e) => setRelationshipData(prev => ({ ...prev, coupleTimeQuality: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Poor (1)</span>
                  <span className="font-semibold text-lg text-gray-700">{relationshipData.coupleTimeQuality}</span>
                  <span>Excellent (10)</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-600">Quality Indicator</label>
              <div className="mt-2 p-3 rounded-lg text-center text-sm font-medium"
                style={{
                  backgroundColor: relationshipData.coupleTimeQuality >= 8 ? '#dcfce7' : 
                                  relationshipData.coupleTimeQuality >= 6 ? '#fef3c7' : 
                                  relationshipData.coupleTimeQuality >= 4 ? '#fed7aa' : '#fecaca',
                  color: relationshipData.coupleTimeQuality >= 8 ? '#166534' : 
                         relationshipData.coupleTimeQuality >= 6 ? '#92400e' : 
                         relationshipData.coupleTimeQuality >= 4 ? '#ea580c' : '#dc2626'
                }}
              >
                {relationshipData.coupleTimeQuality >= 8 ? 'Excellent Connection' :
                 relationshipData.coupleTimeQuality >= 6 ? 'Good Quality Time' :
                 relationshipData.coupleTimeQuality >= 4 ? 'Needs Attention' : 'Requires Focus'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Upcoming Opportunities */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Date Opportunities</h4>
              <div className="space-y-2">
                {relationshipData.upcomingOpportunities.map((opportunity, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm">{opportunity}</span>
                    <button
                      onClick={() => removeOpportunity(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex mt-2">
                <input
                  type="text"
                  placeholder="Add opportunity..."
                  value={newOpportunity}
                  onChange={(e) => setNewOpportunity(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addOpportunity();
                    }
                  }}
                />
                <button
                  onClick={addOpportunity}
                  className="px-3 py-1 bg-blue-600 text-white rounded-r text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
            
            {/* Scheduled Dates */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Scheduled Dates</h4>
              <div className="space-y-2">
                {relationshipData.scheduledDates.map((date, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm">{date}</span>
                    <button
                      onClick={() => removeScheduledDate(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex mt-2">
                <input
                  type="text"
                  placeholder="Add scheduled date..."
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded-l text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addScheduledDate();
                    }
                  }}
                />
                <button
                  onClick={addScheduledDate}
                  className="px-3 py-1 bg-green-600 text-white rounded-r text-sm hover:bg-green-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onComplete}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Routine Review
        </button>
      </div>
    </div>
  );
};

// Routine Step Component
const RoutineStep: React.FC<{ session: PlanningSession; onComplete: () => void }> = ({ session, onComplete }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Routine Delegation Review</h2>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Current Delegations</h3>
          <p className="text-gray-600 text-sm mb-4">Review effectiveness of current task assignments</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-center">No current delegations</p>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">New Delegation Opportunities</h3>
          <p className="text-gray-600 text-sm mb-4">Identify tasks that could be delegated</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-center">No delegation opportunities identified</p>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Family Workload Balance</h3>
          <p className="text-gray-600 text-sm mb-4">Assess current workload distribution</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-500 text-center">No workload data available</p>
          </div>
        </div>
        
        <button 
          onClick={onComplete}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue to Finalize
        </button>
      </div>
    </div>
  );
};

// Finalize Step Component
const FinalizeStep: React.FC<{ session: PlanningSession; onComplete: () => void }> = ({ session, onComplete }) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Finalize Monthly Planning</h2>
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Planning Session Complete</h3>
          <p className="text-green-700">
            Your monthly planning session has been completed. All review areas have been addressed.
          </p>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Session Summary</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Financial review completed
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Project prioritization reviewed
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Relationship and parenting assessed
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Routine delegation optimized
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Next Steps</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Implement agreed-upon changes</li>
            <li>• Schedule next monthly planning session</li>
            <li>• Monitor progress throughout the month</li>
          </ul>
        </div>
        
        <button 
          onClick={onComplete}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
        >
          Complete Monthly Planning
        </button>
      </div>
    </div>
  );
};