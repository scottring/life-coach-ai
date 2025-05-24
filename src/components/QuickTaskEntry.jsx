import React, { useState, useEffect, useRef } from 'react';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { useTasks } from '../providers/TaskProvider';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';

function QuickTaskEntry({ isOpen, onClose }) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef(null);
  const { processNaturalLanguageTask } = useAIAssistant();
  const { addTask } = useTasks();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K to open quick entry
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // If already open, close it
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      // Process natural language input
      const taskData = await processNaturalLanguageTask(input);
      
      // Add the task
      await addTask(taskData);
      
      // Clear input and close
      setInput('');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setInput('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center px-4 pt-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit} className="bg-white p-6">
            <div className="mb-4">
              <label htmlFor="quick-task" className="block text-sm font-medium text-gray-700 mb-2">
                Quick Task Entry
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="quick-task"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., 'Schedule dentist appointment for next Tuesday at 2pm'"
                  className="block w-full rounded-md border-gray-300 pr-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={isProcessing}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <SparklesIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Use natural language to describe your task. Press Enter to add, Esc to cancel.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setInput('');
                  onClose();
                }}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300"
                disabled={!input.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                    Add Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default QuickTaskEntry;