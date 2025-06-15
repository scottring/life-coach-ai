import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Context, ContextType } from '../types/context';
import { contextService } from '../services/contextService';

interface ContextSwitcherProps {
  userId: string;
  onContextChange: (context: Context) => void;
}

const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ userId, onContextChange }) => {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [activeContext, setActiveContext] = useState<Context | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [newContextName, setNewContextName] = useState('');
  const [newContextType, setNewContextType] = useState<ContextType>('personal');

  useEffect(() => {
    loadContexts();
  }, [userId]);

  const loadContexts = async () => {
    try {
      const userContexts = await contextService.getContextsForUser(userId);
      const active = await contextService.getActiveContext(userId);
      
      setContexts(userContexts);
      setActiveContext(active);
      
      if (active) {
        onContextChange(active);
      } else if (userContexts.length > 0) {
        // If no active context, set first one as active
        await contextService.switchActiveContext(userId, userContexts[0].id);
        setActiveContext(userContexts[0]);
        onContextChange(userContexts[0]);
      }
    } catch (error) {
      console.error('Error loading contexts:', error);
    }
  };

  const handleContextSwitch = async (context: Context) => {
    try {
      await contextService.switchActiveContext(userId, context.id);
      setActiveContext(context);
      onContextChange(context);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching context:', error);
    }
  };

  const handleCreateContext = async () => {
    if (!newContextName.trim()) return;
    
    try {
      const newContext = await contextService.createContext(
        newContextName.trim(),
        newContextType,
        userId
      );
      
      await loadContexts(); // Reload contexts
      await handleContextSwitch(newContext); // Switch to new context
      
      setShowCreateForm(false);
      setNewContextName('');
      setNewContextType('personal');
    } catch (error) {
      console.error('Error creating context:', error);
    }
  };

  const getContextIcon = (type: ContextType) => {
    switch (type) {
      case 'family': return '👨‍👩‍👧‍👦';
      case 'work': return '💼';
      case 'personal': return '🧑';
      default: return '📋';
    }
  };

  const getContextColor = (type: ContextType) => {
    switch (type) {
      case 'family': return 'bg-blue-100 text-blue-800';
      case 'work': return 'bg-green-100 text-green-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  if (!activeContext) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg px-4 py-2 w-48 h-10"></div>
    );
  }

  return (
    <div className="relative">
      {/* Active Context Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
      >
        <span className="text-lg">{getContextIcon(activeContext.type)}</span>
        <div className="text-left">
          <div className="font-medium text-gray-900">{activeContext.name}</div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${getContextColor(activeContext.type)}`}>
            {activeContext.type}
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
              Your Contexts
            </div>
            
            {/* Context List */}
            {contexts.map((context) => (
              <button
                key={context.id}
                onClick={() => handleContextSwitch(context)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 transition-colors ${
                  context.id === activeContext.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                }`}
              >
                <span className="text-lg">{getContextIcon(context.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{context.name}</div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getContextColor(context.type)}`}>
                      {context.type}
                    </span>
                    {context.description && (
                      <span className="text-xs text-gray-500 truncate">{context.description}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Create New Context */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="text-sm">Create New Context</span>
                </button>
              ) : (
                <div className="space-y-3 p-3 bg-gray-50 rounded-md">
                  <input
                    type="text"
                    placeholder="Context name"
                    value={newContextName}
                    onChange={(e) => setNewContextName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={newContextType}
                    onChange={(e) => setNewContextType(e.target.value as ContextType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="family">Family</option>
                    <option value="work">Work</option>
                    <option value="custom">Custom</option>
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateContext}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewContextName('');
                        setNewContextType('personal');
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ContextSwitcher;