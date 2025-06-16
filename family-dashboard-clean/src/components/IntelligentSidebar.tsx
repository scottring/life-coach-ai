import React, { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  FlagIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { SchedulableItem, GoalPriority } from '../types/goals';
import { goalService } from '../services/goalService';
import { calendarService } from '../services/calendarService';

interface IntelligentSidebarProps {
  contextId: string;
  userId: string;
  isVisible: boolean;
  onToggle: () => void;
  onItemDragStart: (item: SchedulableItem) => void;
  onItemScheduled?: (item: SchedulableItem) => void;
  onCreateTask: () => void;
  onCreateGoal: () => void;
  onCreateProject: () => void;
  refreshTrigger?: number; // Add this to trigger refresh from parent
}

interface SidebarFilters {
  priority: GoalPriority[];
  assignedTo: string[];
  dueToday: boolean;
  overdue: boolean;
  search: string;
  itemTypes: ('task' | 'milestone' | 'goal' | 'sop' | 'project')[];
}

const IntelligentSidebar: React.FC<IntelligentSidebarProps> = ({
  contextId,
  userId,
  isVisible,
  onToggle,
  onItemDragStart,
  onItemScheduled,
  onCreateTask,
  onCreateGoal,
  onCreateProject,
  refreshTrigger
}) => {
  const [items, setItems] = useState<SchedulableItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SchedulableItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [filters, setFilters] = useState<SidebarFilters>({
    priority: [],
    assignedTo: [],
    dueToday: false,
    overdue: false,
    search: '',
    itemTypes: ['task', 'milestone', 'goal', 'sop', 'project']
  });

  useEffect(() => {
    if (contextId) {
      loadSidebarData();
    }
  }, [contextId, refreshTrigger]);

  // Function to remove item from sidebar when scheduled
  const handleItemScheduled = (item: SchedulableItem) => {
    setItems(prevItems => prevItems.filter(i => i.id !== item.id));
    setFilteredItems(prevItems => prevItems.filter(i => i.id !== item.id));
    onItemScheduled?.(item);
  };


  useEffect(() => {
    applyFilters();
  }, [items, filters]);

  // Handle quick add from inbox input
  const handleQuickAdd = async (title: string) => {
    if (!title.trim()) return;

    try {
      const taskData = {
        title: title.trim(),
        description: '',
        priority: 'medium' as GoalPriority,
        estimatedDuration: 30,
        status: 'pending' as const,
        contextId: contextId,
        isRecurring: false,
        dependencies: [],
        tags: ['inbox', 'quick-add'],
        assignedTo: undefined,
        dueDate: undefined,
        goalId: '',
        projectId: undefined,
        milestoneId: undefined
      };

      await goalService.createTask(taskData);
      await loadSidebarData(); // Refresh the sidebar
    } catch (error) {
      console.error('Failed to create quick task:', error);
    }
  };

  // Component for inbox task items (simpler layout)
  const InboxTaskItem = ({ item }: { item: SchedulableItem }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
      className={`bg-gray-50 border border-gray-200 rounded-md p-2 cursor-move hover:shadow-sm transition-shadow border-l-4 ${getPriorityBorderColor(item.priority)}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircleIcon className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">{item.title}</span>
        </div>
        {getPriorityIcon(item.priority)}
      </div>
      
      {item.description && (
        <p className="text-xs text-gray-600 mt-1 ml-5">{item.description}</p>
      )}
      
      <div className="flex items-center justify-between mt-2 ml-5 text-xs text-gray-500">
        <span>{item.estimatedDuration}m</span>
        {item.dueDate && (
          <span className={
            isOverdue(item.dueDate) ? 'text-red-600' :
            isDueToday(item.dueDate) ? 'text-orange-600' :
            'text-gray-500'
          }>
            {formatDueDate(item.dueDate)}
          </span>
        )}
      </div>
    </div>
  );

  const sortSchedulableItems = (items: SchedulableItem[]): SchedulableItem[] => {
    return items.sort((a, b) => {
      // 1. Priority order (critical > high > medium > low)
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 2. Due date (overdue first, then soonest)
      const today = new Date().toISOString().split('T')[0];
      const aOverdue = a.dueDate && a.dueDate < today;
      const bOverdue = b.dueDate && b.dueDate < today;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // 3. Type order (tasks > milestones > goals > projects > sops)
      const typeOrder = { task: 5, milestone: 4, goal: 3, project: 2, sop: 1 };
      const typeDiff = typeOrder[b.type] - typeOrder[a.type];
      if (typeDiff !== 0) return typeDiff;

      // 4. Duration (shorter tasks first)
      return a.estimatedDuration - b.estimatedDuration;
    });
  };

  const loadSidebarData = async () => {
    try {
      setLoading(true);
      
      // Gather data from multiple sources with graceful error handling
      let schedulableItems: SchedulableItem[] = [];
      let contextMembers: any[] = [];
      
      try {
        // For now, use placeholder members - would integrate with actual family service
        contextMembers = [];
      } catch (error) {
        console.warn('Failed to load family members:', error);
      }
      
      // Get current week date range
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const weekStart = monday.toISOString().split('T')[0];
      const weekEnd = sunday.toISOString().split('T')[0];

      // 1. Load unscheduled tasks from goal service
      try {
        const unscheduledTasks = await goalService.getUnscheduledItems(contextId);
        schedulableItems.push(...unscheduledTasks);
      } catch (error) {
        console.warn('Failed to load unscheduled tasks:', error);
      }


      // 2. Load available SOPs (filtered by scheduled status)
      try {
        // Get scheduled SOP IDs for the current week
        const scheduledSOPIds = await calendarService.getScheduledSOPIds(contextId, {
          start: weekStart,
          end: weekEnd
        });

        // Define available SOPs and filter out already scheduled ones
        const allSOPs: SchedulableItem[] = [
          {
            id: 'sop-1',
            type: 'sop' as const,
            title: 'Morning Routine Review',
            description: 'Review and execute morning routine checklist',
            estimatedDuration: 30,
            priority: 'medium' as GoalPriority,
            assignedTo: undefined,
            dueDate: undefined,
            canSchedule: true,
            isRecurring: false,
            contextId: contextId
          },
          {
            id: 'sop-2',
            type: 'sop' as const,
            title: 'Weekly Planning Session',
            description: 'Plan upcoming week activities and priorities',
            estimatedDuration: 60,
            priority: 'high' as GoalPriority,
            assignedTo: undefined,
            dueDate: undefined,
            canSchedule: true,
            isRecurring: false,
            contextId: contextId
          }
        ];

        // Filter out already scheduled SOPs
        const availableSOPs = allSOPs.filter(sop => 
          !scheduledSOPIds.includes(sop.id)
        );

        schedulableItems.push(...availableSOPs);
      } catch (error) {
        console.warn('Failed to load SOPs:', error);
      }

      // 3. Load weekly goals that need attention
      try {
        const weeklyGoals = await goalService.getGoalsByContext(contextId, {
          status: ['in_progress', 'not_started']
        });
        
        const goalItems: SchedulableItem[] = weeklyGoals
          .filter(goal => {
            // Include goals with target dates in current week or overdue
            if (!goal.targetDate) return false;
            return goal.targetDate >= weekStart && goal.targetDate <= weekEnd;
          })
          .map(goal => ({
            id: goal.id,
            type: 'goal' as const,
            title: `Goal: ${goal.title}`,
            description: goal.description,
            estimatedDuration: 60, // Default 1 hour for goal review
            priority: goal.priority,
            assignedTo: goal.assignedMembers[0],
            dueDate: goal.targetDate,
            canSchedule: true,
            isRecurring: false,
            contextId: goal.contextId
          }));
        schedulableItems.push(...goalItems);
      } catch (error) {
        console.warn('Failed to load weekly goals:', error);
      }

      // 4. Load unscheduled milestones
      try {
        const milestones = await goalService.getMilestonesByContext(contextId);
        const milestoneItems: SchedulableItem[] = milestones
          .filter(milestone => 
            milestone.status !== 'completed' && 
            milestone.targetDate >= weekStart &&
            milestone.targetDate <= weekEnd
          )
          .map(milestone => ({
            id: milestone.id,
            type: 'milestone' as const,
            title: `Milestone: ${milestone.title}`,
            description: milestone.description,
            estimatedDuration: 30, // Default 30 min for milestone review
            priority: 'high' as GoalPriority,
            assignedTo: undefined,
            dueDate: milestone.targetDate,
            goalId: milestone.goalId,
            projectId: milestone.projectId,
            canSchedule: true,
            isRecurring: false,
            contextId: milestone.contextId
          }));
        schedulableItems.push(...milestoneItems);
      } catch (error) {
        console.warn('Failed to load milestones:', error);
      }

      // 5. Load active projects that need attention
      try {
        const projects = await goalService.getProjectsByContext(contextId);
        const projectItems: SchedulableItem[] = projects
          .filter(project => 
            project.status === 'active' && 
            project.targetEndDate >= weekStart &&
            project.targetEndDate <= weekEnd
          )
          .map(project => ({
            id: project.id,
            type: 'project' as const,
            title: `Project: ${project.title}`,
            description: project.description,
            estimatedDuration: 90, // Default 1.5 hours for project review
            priority: project.priority,
            assignedTo: project.assignedMembers[0],
            dueDate: project.targetEndDate,
            goalId: project.goalId,
            canSchedule: true,
            isRecurring: false,
            contextId: project.contextId
          }));
        schedulableItems.push(...projectItems);
      } catch (error) {
        console.warn('Failed to load projects:', error);
      }

      // Sort all items intelligently
      const sortedItems = sortSchedulableItems(schedulableItems);
      
      setItems(sortedItems);
      setMembers(contextMembers);
      
      console.log('Loaded sidebar items:', {
        total: sortedItems.length,
        tasks: sortedItems.filter(i => i.type === 'task').length,
        sops: sortedItems.filter(i => i.type === 'sop').length,
        goals: sortedItems.filter(i => i.type === 'goal').length,
        milestones: sortedItems.filter(i => i.type === 'milestone').length,
        projects: sortedItems.filter(i => i.type === 'project').length
      });
      
    } catch (error) {
      console.error('Error loading sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(item => filters.priority.includes(item.priority));
    }

    // Assigned to filter
    if (filters.assignedTo.length > 0) {
      filtered = filtered.filter(item => 
        item.assignedTo && filters.assignedTo.includes(item.assignedTo)
      );
    }

    // Due today filter
    if (filters.dueToday) {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(item => item.dueDate === today);
    }

    // Overdue filter
    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(item => 
        item.dueDate && item.dueDate < today
      );
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    setFilteredItems(filtered);
  };

  const handleDragStart = (e: React.DragEvent, item: SchedulableItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'schedulable_item',
      data: item
    }));
    onItemDragStart(item);
  };

  const getMemberName = (memberId: string): string => {
    const member = members.find((m: any) => m.userId === memberId || m.id === memberId);
    return member?.displayName || member?.name || 'Unknown';
  };

  const getPriorityIcon = (priority: GoalPriority) => {
    switch (priority) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      case 'high':
        return <FlagIcon className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <FlagIcon className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <FlagIcon className="w-4 h-4 text-green-600" />;
      default:
        return <FlagIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityBorderColor = (priority: GoalPriority): string => {
    switch (priority) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircleIcon className="w-4 h-4 text-blue-600" />;
      case 'milestone':
        return <FlagIcon className="w-4 h-4 text-purple-600" />;
      case 'project':
        return <CubeIcon className="w-4 h-4 text-indigo-600" />;
      case 'goal':
        return <FlagIcon className="w-4 h-4 text-green-600" />;
      case 'sop':
        return <ClipboardDocumentListIcon className="w-4 h-4 text-amber-600" />;
      default:
        return <CheckCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'task':
        return 'text-blue-600 bg-blue-50';
      case 'milestone':
        return 'text-purple-600 bg-purple-50';
      case 'project':
        return 'text-indigo-600 bg-indigo-50';
      case 'goal':
        return 'text-green-600 bg-green-50';
      case 'sop':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  const isDueToday = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate === today;
  };

  const formatDueDate = (dueDate?: string): string => {
    if (!dueDate) return '';
    
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (dueDate === today.toISOString().split('T')[0]) {
      return 'Due Today';
    } else if (dueDate === tomorrow.toISOString().split('T')[0]) {
      return 'Due Tomorrow';
    } else if (date < today) {
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const toggleFilter = (type: keyof SidebarFilters, value: any) => {
    setFilters(prev => {
      if (type === 'priority' || type === 'assignedTo') {
        const currentArray = prev[type] as any[];
        const newArray = currentArray.includes(value)
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value];
        return { ...prev, [type]: newArray };
      } else {
        return { ...prev, [type]: value };
      }
    });
  };

  if (loading) {
    return (
      <div className={`fixed left-0 top-[100px] h-[calc(100vh-100px)] w-96 bg-white shadow-lg border-r border-gray-200 z-10 transition-transform duration-300 ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed left-0 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-r-md shadow-lg z-50 transition-all duration-300 ${
          isVisible ? 'translate-x-96' : 'translate-x-0'
        }`}
      >
        {isVisible ? (
          <ChevronLeftIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
      </button>

      {/* Sidebar */}
      <div className={`fixed left-0 top-[100px] h-[calc(100vh-100px)] w-96 bg-white shadow-lg border-r border-gray-200 z-10 transition-transform duration-300 ${
        isVisible ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">✨ Smart Suggestions</h3>
            <button
              onClick={loadSidebarData}
              className="p-2 text-blue-500 hover:text-blue-700 bg-white rounded-full shadow-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for anything..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button className="flex flex-col items-center p-3 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all">
              <PlusIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Quick Task</span>
            </button>
            <button className="flex flex-col items-center p-3 bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all">
              <ClipboardDocumentListIcon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">New SOP</span>
            </button>
          </div>
          
          {/* Quick Add Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="💭 What's on your mind?"
              className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuickAdd(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm"
              title="Add to inbox"
            >
              ➕
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto">
          {/* AI Curated SOPs */}
          <div className="p-4">
            <div className="flex items-center mb-3">
              <span className="text-lg">🎯</span>
              <h5 className="text-sm font-semibold text-gray-700 ml-2">Smart SOPs for Today</h5>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div 
                draggable
                onDragStart={(e) => handleDragStart(e, {
                  id: 'sop-morning',
                  type: 'sop' as const,
                  title: 'Morning Routine',
                  description: 'Perfect start to your day',
                  estimatedDuration: 30,
                  priority: 'medium' as GoalPriority,
                  canSchedule: true,
                  isRecurring: false,
                  contextId: contextId
                })}
                className="bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-200 rounded-xl p-3 cursor-move hover:shadow-lg transition-all group"
              >
                <div className="text-2xl mb-2">☀️</div>
                <div className="text-xs font-semibold text-gray-700">Morning Routine</div>
                <div className="text-xs text-gray-500">30 min • Perfect start</div>
                <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                  ✕
                </button>
              </div>
              
              <div 
                draggable
                onDragStart={(e) => handleDragStart(e, {
                  id: 'sop-weekly',
                  type: 'sop' as const,
                  title: 'Weekly Review',
                  description: 'Plan your week ahead',
                  estimatedDuration: 45,
                  priority: 'high' as GoalPriority,
                  canSchedule: true,
                  isRecurring: false,
                  contextId: contextId
                })}
                className="bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-blue-200 rounded-xl p-3 cursor-move hover:shadow-lg transition-all group relative"
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="text-xs font-semibold text-gray-700">Weekly Review</div>
                <div className="text-xs text-gray-500">45 min • Planning</div>
                <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Inbox Tasks */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center mb-3">
              <span className="text-lg">📥</span>
              <h5 className="text-sm font-semibold text-gray-700 ml-2">
                Inbox ({filteredItems.filter(item => item.tags?.includes('inbox')).length})
              </h5>
            </div>
            <div className="space-y-2">
              {filteredItems
                .filter(item => item.tags?.includes('inbox'))
                .map((item) => (
                  <InboxTaskItem key={item.id} item={item} />
                ))}
              {filteredItems.filter(item => item.tags?.includes('inbox')).length === 0 && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-xs text-gray-500">Inbox is empty!</p>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Items */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center mb-3">
              <span className="text-lg">💡</span>
              <h5 className="text-sm font-semibold text-gray-700 ml-2">
                AI Suggestions ({filteredItems.filter(item => !item.tags?.includes('inbox')).length})
              </h5>
            </div>
            <div className="space-y-3">
          {filteredItems.filter(item => !item.tags?.includes('inbox')).length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🤖</div>
              <p className="text-xs text-gray-500">AI is thinking...</p>
            </div>
          ) : (
            filteredItems
              .filter(item => !item.tags?.includes('inbox'))
              .map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className={`bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md transition-all group ${getPriorityBorderColor(item.priority)} hover:scale-105`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 rounded-full bg-gray-100">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        {item.type}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {item.estimatedDuration}m
                      </span>
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                    ✕
                  </button>
                </div>

                <h4 className="font-semibold text-gray-900 text-sm mb-1 leading-tight">{item.title}</h4>
                
                {item.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{item.description}</p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex space-x-1">
                    {item.priority === 'high' && <span className="text-xs">🔥</span>}
                    {item.priority === 'medium' && <span className="text-xs">⚡</span>}
                    {item.priority === 'low' && <span className="text-xs">💤</span>}
                  </div>
                  <span className="text-xs text-gray-400">Drag to schedule →</span>
                </div>

              </div>
            ))
          )}
            </div>
          </div>
        </div>

      </div>

      {/* Quick Task Creation Modal */}
      {showCreateTaskModal && <QuickTaskModal />}
    </>
  );

  function QuickTaskModal() {
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskPriority, setTaskPriority] = useState<GoalPriority>('medium');
    const [taskDuration, setTaskDuration] = useState(30);
    const [taskDueDate, setTaskDueDate] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreateTask = async () => {
      if (!taskTitle.trim()) return;

      setCreating(true);
      try {
        // Create task using the goal service
        const taskData = {
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          estimatedDuration: taskDuration,
          dueDate: taskDueDate || undefined,
          status: 'pending' as const,
          contextId: contextId,
          isRecurring: false,
          dependencies: [],
          tags: ['quick-add'],
          assignedTo: undefined,
          goalId: '', // Will be assigned to inbox/general
          projectId: undefined,
          milestoneId: undefined
        };

        await goalService.createTask(taskData);
        
        // Refresh the sidebar data
        await loadSidebarData();
        
        // Close modal and reset form
        setShowCreateTaskModal(false);
        setTaskTitle('');
        setTaskDescription('');
        setTaskPriority('medium');
        setTaskDuration(30);
        setTaskDueDate('');
      } catch (error) {
        console.error('Failed to create task:', error);
      } finally {
        setCreating(false);
      }
    };

    const handleClose = () => {
      setShowCreateTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDuration(30);
      setTaskDueDate('');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Quick Add Task</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as GoalPriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={taskDuration}
                  onChange={(e) => setTaskDuration(parseInt(e.target.value) || 30)}
                  min="5"
                  max="480"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date (optional)
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || creating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default IntelligentSidebar;