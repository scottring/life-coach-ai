import React, { useState, useRef, useEffect } from 'react';
import { openai } from '../lib/openaiClient';
import { useTasks } from '../providers/TaskProvider';
import { useGoals } from '../providers/GoalProvider';
import { useUserContext } from '../providers/UserContextProvider';
import { useAuthState } from '../hooks/useAuthState';

function AIAssistant({ onClose, initialContext = null, onActionComplete = null }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { user } = useAuthState();
  const { tasks, createTask, updateTask } = useTasks();
  const { goals, createGoal } = useGoals();
  const { userContext } = useUserContext();

  useEffect(() => {
    // Initial greeting with context
    const initialMessage = {
      id: Date.now(),
      role: 'assistant',
      content: getInitialGreeting(),
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, [initialContext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getInitialGreeting = () => {
    if (initialContext === 'task-creation') {
      return "Hi! I'm here to help you create tasks. Just tell me what you need to get done in natural language, and I'll help you organize it properly. What would you like to work on?";
    } else if (initialContext === 'goal-setting') {
      return "Hello! I'm your goal-setting assistant. Describe your aspirations or objectives, and I'll help you create structured, achievable goals. What would you like to accomplish?";
    } else {
      return `Hi ${user?.email?.split('@')[0] || 'there'}! I'm your AI productivity assistant. I can help you:
      
📝 Create and organize tasks
🎯 Set and track goals  
📊 Analyze your productivity patterns
📅 Plan your schedule
🔍 Find and prioritize what matters most

What would you like to work on today?`;
    }
  };

  const getCurrentSystemContext = () => {
    const recentTasks = tasks.slice(0, 5);
    const activeGoals = goals.filter(g => g.status === 'active');
    
    return {
      user_email: user?.email,
      current_context: userContext,
      recent_tasks: recentTasks.map(t => ({ 
        id: t.id, 
        title: t.title, 
        priority: t.priority, 
        context: t.context, 
        status: t.status 
      })),
      active_goals: activeGoals.map(g => ({ 
        id: g.id, 
        title: g.title, 
        timeframe: g.timeframe 
      })),
      total_pending_tasks: tasks.filter(t => t.status === 'pending').length,
      total_active_goals: activeGoals.length
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const systemContext = getCurrentSystemContext();
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an AI productivity assistant for a life coach application. You help users create tasks, set goals, and manage their productivity.

Current user context: ${JSON.stringify(systemContext, null, 2)}

Your capabilities:
1. CREATE_TASK: When users describe work to be done, create tasks with proper fields
2. CREATE_GOAL: When users describe aspirations/objectives, create goals 
3. UPDATE_TASK: Modify existing tasks
4. ANALYZE_PRODUCTIVITY: Provide insights on their current tasks/goals
5. GENERAL_ADVICE: Give productivity and life coaching advice

When creating tasks or goals, respond with JSON in this format:
{
  "type": "CREATE_TASK",
  "data": {
    "title": "Clear, actionable title",
    "description": "Detailed description", 
    "priority": 1-5,
    "context": "Work|Personal|Family|Learning",
    "deadline": "YYYY-MM-DD" or null
  },
  "message": "Friendly confirmation message"
}

For goals:
{
  "type": "CREATE_GOAL", 
  "data": {
    "title": "Goal title",
    "description": "Goal description",
    "timeframe": "week|month|quarter|year|life"
  },
  "message": "Motivational message"
}

For regular conversation, just respond normally with helpful advice. Be conversational, supportive, and focus on helping them achieve their goals.`
          },
          ...conversationHistory,
          {
            role: "user", 
            content: userMessage.content
          }
        ]
      });

      const assistantResponse = response.choices[0].message.content;
      
      // Try to parse as JSON for actions
      let actionTaken = false;
      let actionData = null;
      let displayMessage = assistantResponse;
      
      try {
        actionData = JSON.parse(assistantResponse);
        if (actionData.type && actionData.data) {
          actionTaken = await handleAssistantAction(actionData);
          if (actionTaken) {
            // Create a beautiful human-readable message instead of showing JSON
            displayMessage = formatActionMessage(actionData);
          }
        }
      } catch (e) {
        // Not JSON, treat as regular message
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: displayMessage,
        timestamp: new Date(),
        action: actionTaken ? actionData : null
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatActionMessage = (actionData) => {
    switch (actionData.type) {
      case 'CREATE_TASK':
        const task = actionData.data;
        const priorityText = getPriorityText(task.priority);
        const deadlineText = task.deadline ? ` by ${new Date(task.deadline).toLocaleDateString()}` : '';
        
        return `Perfect! I've created a new task for you:

📝 **${task.title}**
${task.description ? `\n📄 ${task.description}` : ''}
📊 Priority: ${priorityText}
🏷️ Context: ${task.context}${deadlineText ? `\n📅 Due${deadlineText}` : ''}

The task has been added to your task list. You can find it in the Tasks page or on your dashboard. Is there anything else you'd like me to help you with?`;

      case 'CREATE_GOAL':
        const goal = actionData.data;
        const timeframeText = goal.timeframe.charAt(0).toUpperCase() + goal.timeframe.slice(1);
        
        return `Excellent! I've created a new goal for you:

🎯 **${goal.title}**
${goal.description ? `\n📝 ${goal.description}` : ''}
⏱️ Timeframe: ${timeframeText}

This goal has been added to your goals list. I recommend breaking it down into smaller, actionable tasks. Would you like me to help you create some tasks to work towards this goal?`;

      case 'UPDATE_TASK':
        return `✅ I've successfully updated your task with the new information. The changes have been saved and you should see them reflected in your task list.`;

      default:
        return actionData.message || "Action completed successfully!";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 5: return 'Highest (🔴)';
      case 4: return 'High (🟠)';  
      case 3: return 'Medium (🟡)';
      case 2: return 'Low (🟢)';
      case 1: return 'Lowest (🔵)';
      default: return 'Medium (🟡)';
    }
  };

  const getActionDisplayText = (action) => {
    switch (action.type) {
      case 'CREATE_TASK':
        return `Task created: "${action.data.title}"`;
      case 'CREATE_GOAL':
        return `Goal created: "${action.data.title}"`;
      case 'UPDATE_TASK':
        return `Task updated successfully`;
      default:
        return action.type.replace('_', ' ').toLowerCase();
    }
  };

  const handleAssistantAction = async (actionData) => {
    try {
      switch (actionData.type) {
        case 'CREATE_TASK':
          await createTask(actionData.data);
          if (onActionComplete) onActionComplete('task_created', actionData.data);
          return true;
          
        case 'CREATE_GOAL':
          await createGoal(actionData.data);
          if (onActionComplete) onActionComplete('goal_created', actionData.data);
          return true;
          
        case 'UPDATE_TASK':
          if (actionData.data.id) {
            await updateTask(actionData.data.id, actionData.data);
            if (onActionComplete) onActionComplete('task_updated', actionData.data);
            return true;
          }
          break;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Error executing assistant action:', error);
      return false;
    }
    return false;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-2.646-.4c-.9.35-1.89.4-2.846.4-1.25 0-2.455-.2-3.57-.57a8.996 8.996 0 01-3.93-3.93C.2 12.455 0 11.25 0 10c0-.956.05-1.946.4-2.846A8.959 8.959 0 014 4c4.418 0 8 3.582 8 8z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg bg-white shadow-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg bg-blue-600 p-4 text-white">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="font-medium">AI Assistant</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="rounded p-1 hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.action && (
                <div className="mt-2 rounded bg-green-50 p-2 text-xs text-green-800">
                  ✅ {getActionDisplayText(message.action)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="rounded-b-lg border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me what you need help with..."
            className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            rows="2"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;