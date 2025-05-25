import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';
import { useAIAssistant } from '../hooks/useAIAssistant';
import DashboardSelector from '../components/DashboardSelector';
import { PaperAirplaneIcon, ChevronDownIcon, ChevronRightIcon, PlusCircleIcon, FolderIcon, ArrowUturnLeftIcon, XMarkIcon, EyeIcon, EyeSlashIcon, TrashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ClockIcon, CalendarIcon, ExclamationCircleIcon, InformationCircleIcon, CheckIcon } from '@heroicons/react/24/solid';

function DashboardPage() {
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks();
  const { events, loading: eventsLoading } = useCalendarIntegration();
  const { processCommand } = useAIAssistant();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activities, setActivities] = useState({});
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [undoStack, setUndoStack] = useState([]);
  const [showUndo, setShowUndo] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved activities from localStorage
  useEffect(() => {
    const savedActivities = localStorage.getItem('taskActivities');
    if (savedActivities) {
      setActivities(JSON.parse(savedActivities));
    }
  }, []);

  // Save activities to localStorage when they change
  useEffect(() => {
    localStorage.setItem('taskActivities', JSON.stringify(activities));
  }, [activities]);

  // Handle task completion with undo
  const handleToggleComplete = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      
      // Add to undo stack
      setUndoStack(prev => [...prev, {
        action: 'toggle_complete',
        taskId,
        previousStatus: task.status,
        timestamp: Date.now()
      }]);
      
      // Show undo notification
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
      
      await updateTask(taskId, { status: newStatus });
    }
  };

  // Handle task deletion with undo
  const handleDeleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Add to undo stack
      setUndoStack(prev => [...prev, {
        action: 'delete',
        task: task,
        timestamp: Date.now()
      }]);
      
      // Show undo notification
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
      
      await deleteTask(taskId);
    }
  };

  // Handle defer task to tomorrow
  const handleDeferTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // Set to 9 AM tomorrow
      
      // Add to undo stack
      setUndoStack(prev => [...prev, {
        action: 'defer',
        taskId,
        previousDeadline: task.deadline,
        timestamp: Date.now()
      }]);
      
      // Show undo notification
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
      
      await updateTask(taskId, { deadline: tomorrow.toISOString() });
    }
  };

  // Undo last action
  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    switch (lastAction.action) {
      case 'toggle_complete':
        await updateTask(lastAction.taskId, { status: lastAction.previousStatus });
        break;
      case 'delete':
        await createTask(lastAction.task);
        break;
      case 'defer':
        await updateTask(lastAction.taskId, { deadline: lastAction.previousDeadline });
        break;
    }
    
    setShowUndo(false);
  };

  // Handle activity creation
  const createActivity = () => {
    if (newActivityName && selectedTasks.length > 0) {
      const activityId = `activity-${Date.now()}`;
      setActivities(prev => ({
        ...prev,
        [activityId]: {
          id: activityId,
          name: newActivityName,
          taskIds: selectedTasks,
          createdAt: new Date().toISOString()
        }
      }));
      setSelectedTasks([]);
      setNewActivityName('');
      setIsGrouping(false);
    }
  };

  // Get today's timeline items with smart categorization
  const getOrganizedItems = () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTasks = tasks.filter(task => {
      if (task.status === 'completed') return false;
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return taskDate >= today && taskDate < tomorrow;
    });

    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate < tomorrow;
    });

    // Combine all items with metadata
    const allItems = [
      ...todayTasks.map(task => ({
        ...task,
        type: 'task',
        time: new Date(task.deadline),
        displayTime: new Date(task.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        duration: 30 // Default task duration in minutes
      })),
      ...todayEvents.map(event => ({
        ...event,
        type: 'event',
        time: new Date(event.start),
        endTime: new Date(event.end || event.start),
        displayTime: new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        duration: event.end ? (new Date(event.end) - new Date(event.start)) / 60000 : 60
      }))
    ];

    // Smart categorization
    const categories = {
      now: {
        title: 'Happening Now',
        icon: '🔴',
        items: [],
        description: 'Current and overdue items'
      },
      next: {
        title: 'Up Next',
        icon: '🟡',
        items: [],
        description: 'Within the next 2 hours'
      },
      today: {
        title: 'Later Today',
        icon: '🟢',
        items: [],
        description: 'After 2 hours'
      },
      evening: {
        title: 'This Evening',
        icon: '🌙',
        items: [],
        description: 'After 5 PM'
      }
    };

    // Time boundaries
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const fivePM = new Date(today);
    fivePM.setHours(17, 0, 0, 0);

    // First, organize by activities
    const activityGroups = {};
    const ungroupedItems = [];

    // Group tasks by activities
    Object.values(activities).forEach(activity => {
      activityGroups[activity.id] = {
        ...activity,
        items: allItems.filter(item => 
          item.type === 'task' && activity.taskIds.includes(item.id)
        )
      };
    });

    // Find ungrouped items
    allItems.forEach(item => {
      const isInActivity = Object.values(activities).some(activity => 
        item.type === 'task' && activity.taskIds.includes(item.id)
      );
      if (!isInActivity) {
        ungroupedItems.push(item);
      }
    });

    // Then categorize by time
    const categorizeByTime = (items) => {
      const timeCats = {
        now: [],
        next: [],
        today: [],
        evening: []
      };

      items.forEach(item => {
        if (item.type === 'event' && item.time <= now && item.endTime > now) {
          timeCats.now.push(item);
        } else if (item.time < now) {
          timeCats.now.push({ ...item, isOverdue: true });
        } else if (item.time <= twoHoursLater) {
          timeCats.next.push(item);
        } else if (item.time >= fivePM) {
          timeCats.evening.push(item);
        } else {
          timeCats.today.push(item);
        }
      });

      return timeCats;
    };

    // Apply time categorization to ungrouped items
    const ungroupedByTime = categorizeByTime(ungroupedItems);

    // Update main categories with ungrouped items
    Object.keys(categories).forEach(key => {
      categories[key].items = ungroupedByTime[key] || [];
    });

    // Sort items within each category
    Object.values(categories).forEach(category => {
      category.items.sort((a, b) => a.time - b.time);
    });

    // Add smart insights
    const insights = [];
    const totalItems = allItems.length;
    const highPriorityCount = allItems.filter(item => item.priority >= 4).length;
    const meetingTime = allItems
      .filter(item => item.type === 'event')
      .reduce((sum, item) => sum + item.duration, 0);

    if (totalItems === 0) {
      insights.push({ type: 'free', text: 'Your day is completely free!' });
    } else if (categories.now.items.length > 2) {
      insights.push({ type: 'warning', text: `${categories.now.items.length} items need immediate attention` });
    } else if (meetingTime > 240) {
      insights.push({ type: 'info', text: 'Heavy meeting day - remember to take breaks' });
    } else if (highPriorityCount > 3) {
      insights.push({ type: 'warning', text: 'Multiple high-priority items today' });
    }

    return { categories, insights, activityGroups };
  };

  const { categories, insights, activityGroups } = getOrganizedItems();
  const [expandedCategories, setExpandedCategories] = useState({
    now: true,
    next: true,
    today: false,
    evening: false,
    activities: true
  });

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsProcessing(true);

    try {
      const response = await processCommand(message, {
        tasks,
        events,
        createTask,
        updateTask,
        deleteTask
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get limited chat history for mobile
  const displayedChatHistory = isMobile 
    ? chatHistory.slice(-3) // Show last 3 messages on mobile
    : chatHistory;

  // Handle drag start
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e, targetTask) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.id === targetTask.id) return;

    // Update task order logic here
    // For now, we'll swap the deadlines to reorder
    const draggedDeadline = draggedTask.deadline;
    const targetDeadline = targetTask.deadline;
    
    await updateTask(draggedTask.id, { deadline: targetDeadline });
    await updateTask(targetTask.id, { deadline: draggedDeadline });
    
    setDraggedTask(null);
  };

  if (tasksLoading || eventsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'flex flex-col' : 'flex'} h-screen bg-gray-50`}>
      {/* Mobile Layout */}
      {isMobile ? (
        <>
          {/* Timeline Panel - Top on Mobile */}
          <div className="flex-1 overflow-y-auto bg-white">
            <MobileTimeline 
              categories={categories}
              insights={insights}
              activityGroups={activityGroups}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              handleToggleComplete={handleToggleComplete}
              selectedTasks={selectedTasks}
              setSelectedTasks={setSelectedTasks}
              isGrouping={isGrouping}
              setIsGrouping={setIsGrouping}
              showSubtasks={showSubtasks}
              setShowSubtasks={setShowSubtasks}
              newActivityName={newActivityName}
              setNewActivityName={setNewActivityName}
              createActivity={createActivity}
              setSelectedTask={setSelectedTask}
              tasks={tasks}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDeleteTask={handleDeleteTask}
              handleDeferTask={handleDeferTask}
            />
          </div>

          {/* Chat Interface - Bottom on Mobile */}
          <div className="border-t border-gray-200 bg-white">
            {/* Recent Messages */}
            <div className="max-h-32 overflow-y-auto p-3">
              {displayedChatHistory.length > 0 ? (
                <div className="space-y-2">
                  {displayedChatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-xs text-gray-500">Ask me anything...</p>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isProcessing}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Layout - Original Two Column */}
          {/* Chat Panel - Left Side */}
          <div className="flex w-1/2 flex-col border-r border-gray-200 bg-white">
            {/* Chat Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
                <DashboardSelector />
              </div>
              <p className="mt-1 text-sm text-gray-600">Ask me to view, create, or manage your tasks and events</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p className="text-sm">Start a conversation to manage your day</p>
                  <div className="mt-4 text-xs text-gray-400 space-y-1">
                    <p>Try: "What do I have today?"</p>
                    <p>"Add a task to review project proposal at 2pm"</p>
                    <p>"Mark my morning meeting as complete"</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 ${msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isProcessing}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Panel - Right Side */}
          <div className="flex w-1/2 flex-col bg-white relative">
            {/* Undo Notification */}
            {showUndo && undoStack.length > 0 && (
              <div className="absolute top-4 right-4 z-10 flex items-center space-x-2 rounded-lg bg-gray-900 px-4 py-2 text-white shadow-lg">
                <span className="text-sm">
                  {undoStack[undoStack.length - 1]?.action === 'delete' && 'Task deleted'}
                  {undoStack[undoStack.length - 1]?.action === 'defer' && 'Task deferred'}
                  {undoStack[undoStack.length - 1]?.action === 'toggle_complete' && 'Task updated'}
                </span>
                <button
                  onClick={handleUndo}
                  className="flex items-center space-x-1 rounded bg-gray-700 px-2 py-1 text-xs font-medium hover:bg-gray-600"
                >
                  <ArrowUturnLeftIcon className="h-3 w-3" />
                  <span>Undo</span>
                </button>
              </div>
            )}
            
            {/* Timeline Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Today's Timeline</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="rounded-lg px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center space-x-1"
                    title={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
                  >
                    {showSubtasks ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    <span>Subtasks</span>
                  </button>
                  <button
                    onClick={() => setIsGrouping(!isGrouping)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isGrouping
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isGrouping ? 'Cancel Grouping' : 'Group Tasks'}
                  </button>
                </div>
              </div>
              
              {/* Activity Creation Bar */}
              {isGrouping && selectedTasks.length > 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  <input
                    type="text"
                    value={newActivityName}
                    onChange={(e) => setNewActivityName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createActivity()}
                    placeholder="Name this activity (e.g., 'Shopping Errands')..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={createActivity}
                    disabled={!newActivityName}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Create Activity
                  </button>
                </div>
              )}
            </div>

            {/* Smart Organized Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Insights Bar */}
              {insights.length > 0 && (
                <div className="border-b border-gray-200 bg-gray-50 p-4">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      {insight.type === 'warning' && <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />}
                      {insight.type === 'info' && <InformationCircleIcon className="h-5 w-5 text-blue-500" />}
                      {insight.type === 'free' && <CalendarIcon className="h-5 w-5 text-green-500" />}
                      <span className="text-sm text-gray-700">{insight.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4">
                {/* Activities Section */}
                {Object.keys(activityGroups).length > 0 && (
                  <div className="mb-6">
                    <button
                      onClick={() => toggleCategory('activities')}
                      className="flex w-full items-center justify-between rounded-lg bg-purple-50 px-4 py-3 hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-5 w-5 text-purple-600" />
                        <div className="text-left">
                          <h3 className="text-sm font-semibold text-gray-900">Activities</h3>
                          <p className="text-xs text-gray-500">{Object.keys(activityGroups).length} grouped activities</p>
                        </div>
                      </div>
                      {expandedCategories.activities ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {expandedCategories.activities && (
                      <div className="mt-2 space-y-3">
                        {Object.values(activityGroups).map((activity) => (
                          <div key={activity.id} className="ml-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                            <h4 className="mb-2 flex items-center justify-between text-sm font-semibold text-purple-900">
                              <span>{activity.name}</span>
                              <span className="text-xs font-normal text-purple-600">
                                {activity.items.filter(item => item.status !== 'completed').length} of {activity.items.length} remaining
                              </span>
                            </h4>
                            <div className="space-y-2">
                              {activity.items.map((task) => (
                                <TaskItem
                                  key={task.id}
                                  task={task}
                                  onToggleComplete={handleToggleComplete}
                                  isSelectable={isGrouping}
                                  isSelected={selectedTasks.includes(task.id)}
                                  onSelect={(id) => {
                                    setSelectedTasks(prev => 
                                      prev.includes(id) 
                                        ? prev.filter(t => t !== id)
                                        : [...prev, id]
                                    );
                                  }}
                                  onTaskClick={setSelectedTask}
                                  onDragStart={handleDragStart}
                                  onDragOver={handleDragOver}
                                  onDrop={handleDrop}
                                  onDelete={handleDeleteTask}
                                  onDefer={handleDeferTask}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time-based Categories */}
                {Object.entries(categories).map(([key, category]) => {
                  if (category.items.length === 0) return null;

                  return (
                    <div key={key} className="mb-6">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(key)}
                        className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{category.icon}</span>
                          <div className="text-left">
                            <h3 className="text-sm font-semibold text-gray-900">{category.title}</h3>
                            <p className="text-xs text-gray-500">{category.items.length} items • {category.description}</p>
                          </div>
                        </div>
                        {expandedCategories[key] ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {/* Category Items */}
                      {expandedCategories[key] && (
                        <div className="mt-2 space-y-2">
                          {category.items.map((item) => {
                            // Include subtasks if showSubtasks is true
                            const itemsToShow = [item];
                            if (showSubtasks && item.type === 'task') {
                              const subtasks = tasks.filter(t => t.parentId === item.id && t.status !== 'completed');
                              itemsToShow.push(...subtasks.map(subtask => ({
                                ...subtask,
                                type: 'task',
                                time: new Date(subtask.deadline || item.deadline),
                                displayTime: subtask.deadline 
                                  ? new Date(subtask.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                  : item.displayTime
                              })));
                            }
                            
                            return itemsToShow.map((taskItem) => (
                              <TaskItem
                                key={`${taskItem.type}-${taskItem.id}`}
                                task={taskItem}
                                onToggleComplete={handleToggleComplete}
                                isSelectable={isGrouping && taskItem.type === 'task'}
                                isSelected={selectedTasks.includes(taskItem.id)}
                                onSelect={(id) => {
                                  setSelectedTasks(prev => 
                                    prev.includes(id) 
                                      ? prev.filter(t => t !== id)
                                      : [...prev, id]
                                  );
                                }}
                                categoryKey={key}
                                onTaskClick={setSelectedTask}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDelete={handleDeleteTask}
                                onDefer={handleDeferTask}
                              />
                            ));
                          }).flat()}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Empty State */}
                {Object.values(categories).every(cat => cat.items.length === 0) && (
                  <div className="text-center text-gray-500 mt-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm">Your schedule is completely clear today!</p>
                    <p className="mt-1 text-xs text-gray-400">Use the chat to add tasks or events</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Task Details Panel - Works on both mobile and desktop */}
      {selectedTask && (
        <TaskDetailsPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (updates) => {
            await updateTask(selectedTask.id, updates);
            setSelectedTask(prev => ({ ...prev, ...updates }));
          }}
          onCreateSubtask={async (subtask) => {
            await createTask({
              ...subtask,
              parentId: selectedTask.id,
              deadline: selectedTask.deadline,
              context: selectedTask.context
            });
          }}
        />
      )}
    </div>
  );
}

// Mobile Timeline Component
function MobileTimeline({ 
  categories, 
  insights, 
  activityGroups, 
  expandedCategories, 
  toggleCategory,
  handleToggleComplete,
  selectedTasks,
  setSelectedTasks,
  isGrouping,
  setIsGrouping,
  showSubtasks,
  setShowSubtasks,
  newActivityName,
  setNewActivityName,
  createActivity,
  setSelectedTask,
  tasks,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDeleteTask,
  handleDeferTask
}) {
  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Today</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
              title={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
            >
              {showSubtasks ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setIsGrouping(!isGrouping)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                isGrouping
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isGrouping ? 'Done' : 'Group'}
            </button>
          </div>
        </div>
        
        {/* Activity Creation Bar */}
        {isGrouping && selectedTasks.length > 0 && (
          <div className="mt-2 flex items-center space-x-2">
            <input
              type="text"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createActivity()}
              placeholder="Activity name..."
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              onClick={createActivity}
              disabled={!newActivityName}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:bg-gray-400"
            >
              Create
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Insights */}
        {insights.length > 0 && (
          <div className="mb-3 rounded-lg bg-gray-50 p-2">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-center space-x-2 text-xs">
                {insight.type === 'warning' && <ExclamationCircleIcon className="h-4 w-4 text-amber-500" />}
                {insight.type === 'info' && <InformationCircleIcon className="h-4 w-4 text-blue-500" />}
                {insight.type === 'free' && <CalendarIcon className="h-4 w-4 text-green-500" />}
                <span className="text-gray-700">{insight.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Activities */}
        {Object.keys(activityGroups).length > 0 && (
          <div className="mb-4">
            {Object.values(activityGroups).map((activity) => (
              <div key={activity.id} className="mb-2 rounded-lg border border-purple-200 bg-purple-50 p-2">
                <h4 className="mb-1 text-xs font-semibold text-purple-900">{activity.name}</h4>
                <div className="space-y-1">
                  {activity.items.map((task) => (
                    <MobileTaskItem
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      isSelectable={isGrouping}
                      isSelected={selectedTasks.includes(task.id)}
                      onSelect={(id) => {
                        setSelectedTasks(prev => 
                          prev.includes(id) 
                            ? prev.filter(t => t !== id)
                            : [...prev, id]
                        );
                      }}
                      onTaskClick={setSelectedTask}
                      onDelete={handleDeleteTask}
                      onDefer={handleDeferTask}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Time Categories */}
        {Object.entries(categories).map(([key, category]) => {
          if (category.items.length === 0) return null;

          return (
            <div key={key} className="mb-3">
              <div className="mb-1 flex items-center space-x-2">
                <span className="text-sm">{category.icon}</span>
                <h3 className="text-sm font-semibold text-gray-900">{category.title}</h3>
                <span className="text-xs text-gray-500">({category.items.length})</span>
              </div>
              <div className="space-y-1">
                {category.items.slice(0, expandedCategories[key] ? undefined : 3).map((item) => {
                  const itemsToShow = [item];
                  if (showSubtasks && item.type === 'task') {
                    const subtasks = tasks.filter(t => t.parentId === item.id && t.status !== 'completed');
                    itemsToShow.push(...subtasks);
                  }
                  
                  return itemsToShow.map((taskItem) => (
                    <MobileTaskItem
                      key={`${taskItem.type}-${taskItem.id}`}
                      task={taskItem}
                      onToggleComplete={handleToggleComplete}
                      isSelectable={isGrouping && taskItem.type === 'task'}
                      isSelected={selectedTasks.includes(taskItem.id)}
                      onSelect={(id) => {
                        setSelectedTasks(prev => 
                          prev.includes(id) 
                            ? prev.filter(t => t !== id)
                            : [...prev, id]
                        );
                      }}
                      onTaskClick={setSelectedTask}
                      isSubtask={taskItem.parentId != null}
                      onDelete={handleDeleteTask}
                      onDefer={handleDeferTask}
                    />
                  ));
                }).flat()}
                
                {category.items.length > 3 && !expandedCategories[key] && (
                  <button
                    onClick={() => toggleCategory(key)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Show {category.items.length - 3} more...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// Mobile Task Item Component
function MobileTaskItem({ task, onToggleComplete, isSelectable, isSelected, onSelect, onTaskClick, isSubtask, onDelete, onDefer }) {
  const isTask = task.type === 'task';
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className={`relative flex items-center space-x-2 rounded-lg p-2 ${
        task.isOverdue
          ? 'bg-red-50 border border-red-200'
          : 'bg-white border border-gray-200'
      } ${isSubtask ? 'ml-4' : ''}`}
      onClick={() => {
        if (isSelectable && onSelect) {
          onSelect(task.id);
        } else if (onTaskClick && isTask) {
          onTaskClick(task);
        }
      }}
    >
      {isSelectable ? (
        <div className={`h-4 w-4 rounded border-2 ${
          isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
        }`}>
          {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
        </div>
      ) : isTask ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task.id);
          }}
        >
          <CheckCircleIcon 
            className={`h-4 w-4 ${
              task.status === 'completed' 
                ? 'text-green-600' 
                : 'text-gray-400'
            }`} 
          />
        </button>
      ) : (
        <ClockIcon className="h-4 w-4 text-green-500" />
      )}
      
      <div className={`flex-1 ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
        <p className="text-sm font-medium text-gray-900">
          {isSubtask && <span className="text-gray-400 mr-1">↳</span>}
          {task.title || task.summary}
        </p>
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500">
          {task.displayTime || (task.deadline && new Date(task.deadline).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}
        </span>
        {isTask && !isSelectable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1 rounded hover:bg-gray-100"
          >
            <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Action buttons */}
      {showActions && isTask && (
        <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDefer(task.id);
              setShowActions(false);
            }}
            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 w-full"
          >
            <ArrowRightIcon className="h-3 w-3 mr-2" />
            Tomorrow
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
              setShowActions(false);
            }}
            className="flex items-center px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 w-full"
          >
            <TrashIcon className="h-3 w-3 mr-2" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Task Item Component
function TaskItem({ task, onToggleComplete, isSelectable, isSelected, onSelect, categoryKey, onTaskClick, onDragStart, onDragOver, onDrop, onDelete, onDefer }) {
  const isOverdue = task.isOverdue;
  const isTask = task.type === 'task';
  const isSubtask = task.parentId != null;
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className={`${isSubtask ? 'ml-12' : 'ml-8'} flex items-start space-x-3 rounded-lg p-3 group ${
        isOverdue
          ? 'bg-red-50 border border-red-200'
          : categoryKey === 'now'
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-white border border-gray-200 hover:border-gray-300'
      } ${
        isSelectable ? 'cursor-pointer' : 'cursor-pointer hover:shadow-md'
      } ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } transition-all`}
      draggable={!isSelectable && isTask}
      onDragStart={(e) => onDragStart && onDragStart(e, task)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, task)}
      onClick={() => {
        if (isSelectable && onSelect) {
          onSelect(task.id);
        } else if (onTaskClick && isTask) {
          onTaskClick(task);
        }
      }}
    >
      {isSelectable ? (
        <div className="flex-shrink-0 mt-0.5">
          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
            isSelected 
              ? 'border-blue-600 bg-blue-600' 
              : 'border-gray-300 bg-white'
          }`}>
            {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
          </div>
        </div>
      ) : isTask ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task.id);
          }}
          className="flex-shrink-0 mt-0.5"
        >
          <CheckCircleIcon 
            className={`h-4 w-4 ${
              task.status === 'completed' 
                ? 'text-green-600' 
                : isOverdue 
                ? 'text-red-500' 
                : categoryKey === 'now' 
                ? 'text-amber-500' 
                : 'text-gray-400 hover:text-blue-500'
            } transition-colors`} 
          />
        </button>
      ) : (
        <div className="flex-shrink-0 mt-0.5">
          <ClockIcon className={`h-4 w-4 ${
            isOverdue ? 'text-red-500' : categoryKey === 'now' ? 'text-amber-500' : 'text-green-500'
          }`} />
        </div>
      )}
      
      <div className={`flex-1 min-w-0 ${
        task.status === 'completed' ? 'opacity-50 line-through' : ''
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {isSubtask && <span className="text-gray-400 mr-1">↳</span>}
              {task.title || task.summary}
            </p>
            {task.description && (
              <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
            )}
          </div>
          <div className="ml-2 flex flex-col items-end">
            <span className="text-xs font-medium text-gray-600">
              {task.displayTime}
            </span>
            {task.duration && (
              <span className="text-xs text-gray-400 mt-0.5">
                {task.duration < 60 ? `${task.duration}m` : `${Math.round(task.duration / 60)}h`}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isTask && task.priority >= 4 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                High Priority
              </span>
            )}
            {isOverdue && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                Overdue
              </span>
            )}
            {task.context && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                {task.context}
              </span>
            )}
          </div>
          
          {/* Action buttons for desktop */}
          {isTask && !isSelectable && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDefer(task.id);
                }}
                className="p-1 rounded hover:bg-gray-100"
                title="Defer to tomorrow"
              >
                <ArrowRightIcon className="h-4 w-4 text-gray-400 hover:text-blue-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="p-1 rounded hover:bg-gray-100"
                title="Delete task"
              >
                <TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Task Details Panel Component  
function TaskDetailsPanel({ task, onClose, onUpdate, onCreateSubtask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [newSubtask, setNewSubtask] = useState('');
  const { tasks } = useTasks();
  
  const subtasks = tasks.filter(t => t.parentId === task.id);

  const handleSave = async () => {
    await onUpdate(editedTask);
    setIsEditing(false);
  };

  const handleAddSubtask = async () => {
    if (newSubtask.trim()) {
      await onCreateSubtask({
        title: newSubtask,
        status: 'pending',
        priority: task.priority
      });
      setNewSubtask('');
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex bg-black bg-opacity-50">
      <div className="ml-auto h-full w-96 bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={editedTask.title}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={editedTask.description || ''}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-start justify-between">
                    <h4 className="text-lg font-medium text-gray-900">{task.title}</h4>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                  {task.description && (
                    <p className="mt-2 text-sm text-gray-600">{task.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={task.status === 'completed' ? 'text-green-600' : 'text-amber-600'}>
                      {task.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Priority:</span>
                    <span className="font-medium">{task.priority}/5</span>
                  </div>
                  {task.deadline && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Due:</span>
                      <span>{new Date(task.deadline).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Subtasks */}
                <div>
                  <h5 className="mb-2 text-sm font-semibold text-gray-900">Subtasks ({subtasks.length})</h5>
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center space-x-2 rounded-lg border border-gray-200 p-2">
                        <CheckCircleIcon 
                          className={`h-4 w-4 cursor-pointer ${
                            subtask.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                          }`}
                          onClick={() => onUpdate({ ...subtask, status: subtask.status === 'completed' ? 'pending' : 'completed' })}
                        />
                        <span className={`flex-1 text-sm ${
                          subtask.status === 'completed' ? 'line-through text-gray-500' : ''
                        }`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                        placeholder="Add a subtask..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.trim()}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;