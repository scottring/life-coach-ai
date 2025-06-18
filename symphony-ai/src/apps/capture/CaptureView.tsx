import React, { useState, useRef, useEffect } from 'react';
import {
  PlusIcon,
  SparklesIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { AICaptureService } from '../../shared/services/aiCaptureService';
import { taskManager } from '../../shared/services/taskManagerService';

interface CaptureViewProps {
  contextId: string;
  userId: string;
}

interface CaptureResult {
  id: string;
  originalInput: string;
  parsedItems: ParsedItem[];
  timestamp: Date;
  processed: boolean;
}

interface ParsedItem {
  id: string;
  title: string;
  type: 'task' | 'event' | 'project' | 'sop' | 'meal' | 'note';
  context: 'work' | 'family' | 'personal' | 'auto-detected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate?: Date;
  scheduledTime?: string;
  duration?: number;
  assignedTo?: string;
  tags?: string[];
  confidence: number; // AI confidence in parsing
}

interface AIProcessingResult {
  intent: string;
  items: ParsedItem[];
  suggestions: string[];
  clarificationNeeded?: string;
}

export const CaptureView: React.FC<CaptureViewProps> = ({ contextId, userId }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentCaptures, setRecentCaptures] = useState<CaptureResult[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const aiService = new AICaptureService();

  // Quick templates for common captures
  const templates = [
    {
      title: 'Meeting Follow-up',
      template: 'Follow up on [topic] with [person] by [date]'
    },
    {
      title: 'Weekly Meal Prep',
      template: 'Plan meals for next week, shop for groceries on [day], prep on [day]'
    },
    {
      title: 'Family Activity',
      template: '[Activity] with family on [date] at [time], need to [preparation]'
    },
    {
      title: 'Work Project',
      template: 'Start [project name], first step: [action], deadline: [date]'
    }
  ];

  useEffect(() => {
    // Auto-focus the input when component mounts
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const processInput = async (inputText: string): Promise<AIProcessingResult> => {
    const userContext = {
      currentTime: new Date(),
      activeContext: 'family' as const, // TODO: Get from actual context
      familyMembers: ['Sarah', 'You'], // TODO: Get from family service
      recentTasks: [] // TODO: Get recent task titles for context
    };

    return await aiService.processInput(inputText, contextId, userContext);
  };

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const result = await processInput(input);
      
      // Add tasks to the global task manager
      const addedTasks = await taskManager.addTasksFromCapture(result.items, contextId, userId);
      
      const capture: CaptureResult = {
        id: `capture_${Date.now()}`,
        originalInput: input,
        parsedItems: result.items,
        timestamp: new Date(),
        processed: true
      };

      setRecentCaptures(prev => [capture, ...prev.slice(0, 4)]); // Keep last 5
      setInput('');
      
      // Show success message
      console.log(`✅ Added ${addedTasks.length} tasks to your system!`);
      
      // Provide user feedback
      if (addedTasks.length > 0) {
        // You could add a toast notification here
        console.log('Tasks successfully saved to database!');
      }
      
    } catch (error) {
      console.error('Error processing input:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startVoiceCapture = () => {
    setIsListening(true);
    // In real implementation, integrate with Web Speech API
    setTimeout(() => {
      setIsListening(false);
      setInput(prev => prev + " [Voice input would go here]");
    }, 2000);
  };

  const applyTemplate = (template: string) => {
    setInput(template);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return '✅';
      case 'event': return '📅';
      case 'meal': return '🍽️';
      case 'project': return '📁';
      case 'sop': return '📋';
      default: return '📝';
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'work': return 'bg-green-100 text-green-800';
      case 'family': return 'bg-blue-100 text-blue-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Capture</h1>
        <p className="text-gray-500">
          Brain dump everything. AI will organize it for you.
        </p>
      </div>

      {/* Main Input Area */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
        <div className="p-6">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type anything... 'Need to call dentist tomorrow at 2pm, plan dinner for Friday with Sarah, review the Q4 budget by Thursday...'"
              className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              disabled={isProcessing}
            />
            
            {isProcessing && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-3">
                  <SparklesIcon className="w-5 h-5 text-blue-600 animate-pulse" />
                  <span className="text-blue-600 font-medium">AI is processing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <TagIcon className="w-4 h-4" />
                <span className="text-sm">Templates</span>
              </button>
              
              <button
                onClick={startVoiceCapture}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  isListening 
                    ? 'bg-red-100 text-red-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <MicrophoneIcon className="w-4 h-4" />
                <span className="text-sm">{isListening ? 'Listening...' : 'Voice'}</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500">⌘ + Enter to process</span>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isProcessing}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                <span>Process</span>
              </button>
            </div>
          </div>

          {/* Templates Dropdown */}
          {showTemplates && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Templates</h4>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template.template)}
                    className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="font-medium text-sm text-gray-900">{template.title}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{template.template}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Captures */}
      {recentCaptures.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Captures</h3>
          
          {recentCaptures.map((capture) => (
            <div key={capture.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-gray-700 italic">"{capture.originalInput}"</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {capture.timestamp.toLocaleString()}
                  </p>
                </div>
                <SparklesIcon className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">AI Created:</h4>
                {capture.parsedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getTypeIcon(item.type)}</span>
                      <div>
                        <h5 className="font-medium text-gray-900">{item.title}</h5>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getContextColor(item.context)}`}>
                            {item.context}
                          </span>
                          {item.scheduledDate && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              {item.scheduledDate.toLocaleDateString()}
                              {item.scheduledTime && ` at ${item.scheduledTime}`}
                            </span>
                          )}
                          {item.duration && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {item.duration}m
                            </span>
                          )}
                          {item.assignedTo && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <UserIcon className="w-3 h-3 mr-1" />
                              {item.assignedTo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {Math.round(item.confidence * 100)}% confident
                      </span>
                      <button 
                        onClick={() => {
                          // Task is already added to system, just provide feedback
                          alert('✅ Task added to your system! Check Today or Planning views.');
                        }}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        ✓ Added
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};