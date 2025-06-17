import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  CalendarDaysIcon,
  FlagIcon,
  UserIcon,
  TagIcon,
  TrashIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import Modal from './common/Modal';
import { Project, GoalPriority, GoalCategory, Goal, Milestone } from '../types/goals';
import { ContextMember } from '../types/context';
import { goalService } from '../services/goalService';
import { contextService } from '../services/contextService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextId: string;
  userId: string;
  onProjectCreated: (project: Project) => void;
  preselectedGoalId?: string;
}

interface NewMilestone {
  title: string;
  description: string;
  targetDate: string;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  contextId,
  userId,
  onProjectCreated,
  preselectedGoalId
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as GoalPriority,
    category: 'personal' as GoalCategory,
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: '',
    budget: 0,
    goalId: preselectedGoalId || '',
    assignedMembers: [] as string[],
    tags: [] as string[]
  });

  const [milestones, setMilestones] = useState<NewMilestone[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
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
      const [contextGoals, contextMembers] = await Promise.all([
        goalService.getGoalsByContext(contextId),
        contextService.getContextMembers(contextId)
      ]);

      setGoals(contextGoals);
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
      category: 'personal',
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: '',
      budget: 0,
      goalId: preselectedGoalId || '',
      assignedMembers: [],
      tags: []
    });
    setMilestones([]);
    setNewTag('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.targetEndDate) {
      newErrors.targetEndDate = 'Target end date is required';
    } else if (formData.targetEndDate <= formData.startDate) {
      newErrors.targetEndDate = 'Target end date must be after start date';
    }

    if (formData.budget < 0) {
      newErrors.budget = 'Budget cannot be negative';
    }

    milestones.forEach((milestone, index) => {
      if (!milestone.title.trim()) {
        newErrors[`milestone_${index}_title`] = 'Milestone title is required';
      }
      if (!milestone.targetDate) {
        newErrors[`milestone_${index}_targetDate`] = 'Milestone target date is required';
      } else if (milestone.targetDate > formData.targetEndDate) {
        newErrors[`milestone_${index}_targetDate`] = 'Milestone date cannot be after project end date';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Create the project first
      const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        status: 'planning',
        progress: 0,
        milestones: [],
        tasks: [],
        goalId: formData.goalId || undefined,
        contextId,
        createdBy: userId
      };

      const projectId = await goalService.createProject(projectData);

      // Create milestones if any
      const createdMilestones: Milestone[] = [];
      for (const milestone of milestones) {
        const milestoneData: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'> = {
          title: milestone.title,
          description: milestone.description,
          status: 'pending',
          targetDate: milestone.targetDate,
          progress: 0,
          tasks: [],
          dependencies: [],
          goalId: formData.goalId,
          projectId,
          contextId
        };

        const milestoneId = await goalService.createMilestone(milestoneData);
        createdMilestones.push({
          ...milestoneData,
          id: milestoneId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Create the complete project object
      const createdProject: Project = {
        ...projectData,
        id: projectId,
        milestones: createdMilestones,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onProjectCreated(createdProject);
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      setErrors({ submit: 'Failed to create project. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, {
      title: '',
      description: '',
      targetDate: ''
    }]);
  };

  const updateMilestone = (index: number, field: keyof NewMilestone, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const removeMilestone = (index: number) => {
    const updated = milestones.filter((_, i) => i !== index);
    setMilestones(updated);
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

  const toggleMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedMembers: prev.assignedMembers.includes(memberId)
        ? prev.assignedMembers.filter(id => id !== memberId)
        : [...prev.assignedMembers, memberId]
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter project title..."
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
              placeholder="Describe your project..."
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
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as GoalCategory }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="personal">Personal</option>
                <option value="family">Family</option>
                <option value="work">Work</option>
                <option value="health">Health</option>
                <option value="financial">Financial</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target End Date *
              </label>
              <input
                type="date"
                value={formData.targetEndDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetEndDate: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.targetEndDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.targetEndDate && <p className="text-red-600 text-sm mt-1">{errors.targetEndDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Budget (optional)
            </label>
            <div className="relative">
              <CurrencyDollarIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.01"
                className={`w-full pl-9 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.budget ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.budget && <p className="text-red-600 text-sm mt-1">{errors.budget}</p>}
          </div>
        </div>

        {/* Goal Association */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Associated Goal (optional)
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

        {/* Assigned Members */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assigned Members
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <button
                key={member.userId}
                type="button"
                onClick={() => toggleMember(member.userId)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                  formData.assignedMembers.includes(member.userId)
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UserIcon className="w-3 h-3" />
                <span>{member.displayName}</span>
              </button>
            ))}
          </div>
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

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Project Milestones
            </label>
            <button
              type="button"
              onClick={addMilestone}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Milestone</span>
            </button>
          </div>

          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Milestone {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                    placeholder="Milestone title..."
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`milestone_${index}_title`] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors[`milestone_${index}_title`] && (
                    <p className="text-red-600 text-sm">{errors[`milestone_${index}_title`]}</p>
                  )}

                  <textarea
                    value={milestone.description}
                    onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                    placeholder="Milestone description..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  <input
                    type="date"
                    value={milestone.targetDate}
                    onChange={(e) => updateMilestone(index, 'targetDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`milestone_${index}_targetDate`] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors[`milestone_${index}_targetDate`] && (
                    <p className="text-red-600 text-sm">{errors[`milestone_${index}_targetDate`]}</p>
                  )}
                </div>
              </div>
            ))}
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
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProjectModal;