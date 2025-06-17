import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  FlagIcon,
  ArrowPathIcon,
  TagIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Modal from './common/Modal';
import { GoalTask, GoalPriority, Goal, Milestone, Project } from '../types/goals';
import { ContextMember } from '../types/context';
import { goalService } from '../services/goalService';
import { contextService } from '../services/contextService';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextId: string;
  userId: string;
  onTaskCreated: (task: GoalTask) => void;
  preselectedGoalId?: string;
  preselectedMilestoneId?: string;
  preselectedProjectId?: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  contextId,
  userId,
  onTaskCreated,
  preselectedGoalId,
  preselectedMilestoneId,
  preselectedProjectId
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as GoalPriority,
    estimatedDuration: 30,
    dueDate: '',
    assignedTo: '',
    goalId: preselectedGoalId || '',
    milestoneId: preselectedMilestoneId || '',
    projectId: preselectedProjectId || '',
    tags: [] as string[],
    isRecurring: false,
    recurringPattern: {
      frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
      interval: 1,
      daysOfWeek: [] as number[],
      endDate: ''
    },
    scheduledTime: ''
  });

  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ContextMember[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen, contextId]);

  const loadData = async () => {
    try {
      const [contextGoals, contextMilestones, contextProjects, contextMembers] = await Promise.all([
        goalService.getGoalsByContext(contextId),
        goalService.getMilestonesByContext(contextId),
        goalService.getProjectsByContext(contextId),
        contextService.getContextMembers(contextId)
      ]);

      setGoals(contextGoals);
      setMilestones(contextMilestones);
      setProjects(contextProjects);
      setMembers(contextMembers);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      estimatedDuration: 30,
      dueDate: '',
      assignedTo: '',
      goalId: preselectedGoalId || '',
      milestoneId: preselectedMilestoneId || '',
      projectId: preselectedProjectId || '',
      tags: [],
      isRecurring: false,
      recurringPattern: {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [],
        endDate: ''
      },
      scheduledTime: ''
    });
    setNewTag('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = 'Duration must be greater than 0';
    }

    if (formData.isRecurring) {
      if (formData.recurringPattern.frequency === 'weekly' && formData.recurringPattern.daysOfWeek.length === 0) {
        newErrors.recurringPattern = 'Select at least one day for weekly recurrence';
      }
      if (!formData.scheduledTime) {
        newErrors.scheduledTime = 'Scheduled time is required for recurring tasks';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      const taskData: Omit<GoalTask, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description,
        status: 'pending',
        priority: formData.priority,
        assignedTo: formData.assignedTo || undefined,
        estimatedDuration: formData.estimatedDuration,
        dueDate: formData.dueDate || undefined,
        scheduledTime: formData.scheduledTime || undefined,
        dependencies: [],
        tags: formData.tags,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? formData.recurringPattern : undefined,
        goalId: formData.goalId,
        milestoneId: formData.milestoneId || undefined,
        projectId: formData.projectId || undefined,
        contextId
      };

      const taskId = await goalService.createTask(taskData);
      
      // Get the created task
      const createdTask: GoalTask = {
        ...taskData,
        id: taskId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onTaskCreated(createdTask);
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ submit: 'Failed to create task. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurringPattern: {
        ...prev.recurringPattern,
        daysOfWeek: prev.recurringPattern.daysOfWeek.includes(day)
          ? prev.recurringPattern.daysOfWeek.filter(d => d !== day)
          : [...prev.recurringPattern.daysOfWeek, day].sort()
      }
    }));
  };

  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.userId === memberId);
    return member?.displayName || 'Unknown';
  };

  const getGoalName = (goalId: string): string => {
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || 'Unknown Goal';
  };

  const getMilestoneName = (milestoneId: string): string => {
    const milestone = milestones.find(m => m.id === milestoneId);
    return milestone?.title || 'Unknown Milestone';
  };

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.title || 'Unknown Project';
  };

  const getDayName = (day: number): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter task title..."
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as GoalPriority }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 0 }))}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.estimatedDuration ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.estimatedDuration && <p className="text-red-600 text-sm mt-1">{errors.estimatedDuration}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select member...</option>
                {members.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Associations */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Associations</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal
              </label>
              <select
                value={formData.goalId}
                onChange={(e) => setFormData(prev => ({ ...prev, goalId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select goal...</option>
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>

            {formData.goalId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Milestone
                  </label>
                  <select
                    value={formData.milestoneId}
                    onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select milestone...</option>
                    {milestones
                      .filter(m => m.goalId === formData.goalId)
                      .map(milestone => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select project...</option>
                    {projects
                      .filter(p => p.goalId === formData.goalId)
                      .map(project => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recurring Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
              Make this a recurring task
            </label>
          </div>

          {formData.isRecurring && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.recurringPattern.frequency}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      recurringPattern: {
                        ...prev.recurringPattern,
                        frequency: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Time *
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.scheduledTime ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.scheduledTime && <p className="text-red-600 text-sm mt-1">{errors.scheduledTime}</p>}
                </div>
              </div>

              {formData.recurringPattern.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days of Week
                  </label>
                  <div className="flex space-x-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(day)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          formData.recurringPattern.daysOfWeek.includes(day)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getDayName(day)}
                      </button>
                    ))}
                  </div>
                  {errors.recurringPattern && <p className="text-red-600 text-sm mt-1">{errors.recurringPattern}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.recurringPattern.endDate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    recurringPattern: {
                      ...prev.recurringPattern,
                      endDate: e.target.value
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errors.submit && (
          <div className="text-red-600 text-sm">{errors.submit}</div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;