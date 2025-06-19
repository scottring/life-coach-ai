import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ClockIcon, 
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { aiGuidanceService, GuidancePrompt, PlanningContext } from '../shared/services/aiGuidanceService';
import { aiPlanningService, PlanningSession, ConversationMessage } from '../shared/services/aiPlanningService';

interface AIGuidancePanelProps {
  context: PlanningContext;
  onSectionComplete?: (section: string) => void;
  onSessionComplete?: () => void;
  className?: string;
  sessionId?: string; // For persistent AI sessions
}

export const AIGuidancePanel: React.FC<AIGuidancePanelProps> = ({ 
  context, 
  onSectionComplete, 
  onSessionComplete,
  className = '',
  sessionId
}) => {
  const [currentGuidance, setCurrentGuidance] = useState<GuidancePrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [showReminder, setShowReminder] = useState(false);
  const [planningSession, setPlanningSession] = useState<PlanningSession | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');

  // Load initial guidance when component mounts or context changes
  useEffect(() => {
    loadGuidance();
  }, [context.currentStep]);

  // Load or create AI planning session
  useEffect(() => {
    if (sessionId) {
      loadPlanningSession();
    }
  }, [sessionId]);

  const loadPlanningSession = async () => {
    if (!sessionId) return;
    
    try {
      const session = await aiPlanningService.getSession(sessionId);
      if (session) {
        setPlanningSession(session);
        setConversation(session.conversation);
      }
    } catch (error) {
      console.error('Error loading planning session:', error);
    }
  };

  // Time tracking
  const timeUsed = Math.round((Date.now() - sessionStartTime) / 60000); // minutes
  const timeRemaining = context.timeAllocated - timeUsed;
  const progressPercent = (timeUsed / context.timeAllocated) * 100;

  const loadGuidance = async () => {
    setLoading(true);
    try {
      let guidance: GuidancePrompt;
      
      if (!context.currentStep || context.currentStep === 'intro') {
        guidance = await aiGuidanceService.getSessionIntro(context);
      } else {
        guidance = await aiGuidanceService.getSectionGuidance(context);
      }
      
      setCurrentGuidance(guidance);
    } catch (error) {
      console.error('Error loading AI guidance:', error);
      setCurrentGuidance({
        type: 'section',
        title: 'Continue Planning',
        content: 'Keep working through your planning session. Focus on the current section and make steady progress.',
        timeEstimate: '10-15 minutes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSectionComplete = async () => {
    if (!currentGuidance || !context.currentStep) return;
    
    setLoading(true);
    try {
      // If we have a planning session, process through AI planning service
      if (planningSession?.id) {
        const completionMessage = `Completed section: ${context.currentStep}`;
        const aiResponse = await aiPlanningService.processUserMessage(planningSession.id, completionMessage);
        
        // Update conversation
        const updatedSession = await aiPlanningService.getSession(planningSession.id);
        if (updatedSession) {
          setPlanningSession(updatedSession);
          setConversation(updatedSession.conversation);
        }
      }
      
      // Get transition guidance
      const nextSection = currentGuidance.nextStep;
      if (nextSection) {
        const transitionGuidance = await aiGuidanceService.getTransitionGuidance(
          { ...context, timeUsed },
          context.currentStep,
          nextSection
        );
        setCurrentGuidance(transitionGuidance);
        
        // Auto-load next section guidance after 3 seconds
        setTimeout(() => {
          onSectionComplete?.(context.currentStep);
        }, 3000);
      } else {
        // Session complete
        const completionGuidance = await aiGuidanceService.getCompletionGuidance(
          { ...context, timeUsed },
          { completed: true }
        );
        setCurrentGuidance(completionGuidance);
        onSessionComplete?.();
      }
    } catch (error) {
      console.error('Error getting transition guidance:', error);
      onSectionComplete?.(context.currentStep);
    } finally {
      setLoading(false);
    }
  };

  const getTimeCheckReminder = async () => {
    setLoading(true);
    try {
      const reminder = await aiGuidanceService.getReminderGuidance(
        { ...context, timeUsed },
        'time'
      );
      setCurrentGuidance(reminder);
      setShowReminder(true);
      
      // Return to main guidance after 5 seconds
      setTimeout(() => {
        setShowReminder(false);
        loadGuidance();
      }, 5000);
    } catch (error) {
      console.error('Error getting reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFocusReminder = async () => {
    setLoading(true);
    try {
      const reminder = await aiGuidanceService.getReminderGuidance(
        { ...context, timeUsed },
        'focus'
      );
      setCurrentGuidance(reminder);
      setShowReminder(true);
      
      setTimeout(() => {
        setShowReminder(false);
        loadGuidance();
      }, 5000);
    } catch (error) {
      console.error('Error getting focus reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGuidanceIcon = (type: string) => {
    switch (type) {
      case 'intro':
        return <SparklesIcon className="w-5 h-5 text-blue-600" />;
      case 'section':
        return <LightBulbIcon className="w-5 h-5 text-yellow-600" />;
      case 'transition':
        return <ArrowRightIcon className="w-5 h-5 text-green-600" />;
      case 'completion':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'reminder':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />;
      default:
        return <SparklesIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!currentGuidance) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Time Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span className="flex items-center">
            <ClockIcon className="w-4 h-4 mr-1" />
            {timeUsed}m used / {context.timeAllocated}m total
          </span>
          <span className={timeRemaining < 10 ? 'text-red-600 font-medium' : ''}>
            {timeRemaining}m remaining
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              progressPercent > 90 ? 'bg-red-500' :
              progressPercent > 75 ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          ></div>
        </div>
      </div>

      {/* AI Guidance Content */}
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {getGuidanceIcon(currentGuidance.type)}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 mb-2">
              {currentGuidance.title}
            </h3>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line mb-3">
              {currentGuidance.content}
            </div>
            
            {currentGuidance.suggestedActions && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                  Key Actions:
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {currentGuidance.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentGuidance.timeEstimate && (
              <div className="text-xs text-gray-500 mb-3">
                ⏱️ Estimated time: {currentGuidance.timeEstimate}
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Interface - only show if we have a planning session */}
        {planningSession && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-600 mb-2">AI Assistant Chat</div>
            
            {/* Recent conversation messages */}
            <div className="max-h-32 overflow-y-auto mb-3 space-y-2">
              {conversation.slice(-3).map((msg) => (
                <div key={msg.id} className={`text-xs p-2 rounded ${
                  msg.speaker === 'ai' ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-700'
                }`}>
                  <div className="font-medium mb-1">{msg.speaker === 'ai' ? '🤖 AI' : '👤 You'}:</div>
                  <div>{msg.content}</div>
                </div>
              ))}
            </div>
            
            {/* Input for user messages */}
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask AI for help or guidance..."
                className="flex-1 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim()}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {currentGuidance.type === 'section' && !showReminder && (
            <>
              <button
                onClick={handleSectionComplete}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Complete Section →'}
              </button>
              
              <button
                onClick={getFocusReminder}
                disabled={loading}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Need Focus?
              </button>
            </>
          )}

          {currentGuidance.type === 'intro' && (
            <button
              onClick={() => onSectionComplete?.('start')}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Start Planning Session →
            </button>
          )}

          {currentGuidance.type === 'completion' && (
            <button
              onClick={onSessionComplete}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Finish Session ✓
            </button>
          )}

          <button
            onClick={getTimeCheckReminder}
            disabled={loading}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors text-xs"
          >
            Time Check
          </button>
        </div>

        {/* Next Step Preview */}
        {currentGuidance.nextStep && currentGuidance.type !== 'completion' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Next: {currentGuidance.nextStep}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  async function handleSendMessage() {
    if (!userInput.trim() || !planningSession?.id || loading) return;
    
    const message = userInput.trim();
    setUserInput('');
    setLoading(true);
    
    try {
      // Send message to AI planning service
      const aiResponse = await aiPlanningService.processUserMessage(planningSession.id, message);
      
      // Update conversation and session
      const updatedSession = await aiPlanningService.getSession(planningSession.id);
      if (updatedSession) {
        setPlanningSession(updatedSession);
        setConversation(updatedSession.conversation);
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
    } finally {
      setLoading(false);
    }
  }
};

export default AIGuidancePanel;