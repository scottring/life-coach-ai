import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { sopService } from '../../../shared/services/sopService';
import { SOP, SOPCategory, SOPDifficulty, SOPStep } from '../../../shared/types/sop';

interface CreateSOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextId: string;
  userId: string;
  onSOPCreated: () => void;
  editingSOP?: SOP | null;
}

interface FormData {
  name: string;
  description: string;
  category: SOPCategory;
  difficulty: SOPDifficulty;
  tags: string[];
  steps: Omit<SOPStep, 'id'>[];
  assignableMembers: string[];
  defaultAssignee?: string;
  requiresConfirmation: boolean;
  canBeEmbedded: boolean;
  isRecurring: boolean;
}

const categories: { value: SOPCategory; label: string; icon: string }[] = [
  { value: 'morning', label: 'Morning', icon: '🌅' },
  { value: 'evening', label: 'Evening', icon: '🌙' },
  { value: 'leaving', label: 'Leaving House', icon: '🏃‍♂️' },
  { value: 'cleanup', label: 'Cleanup', icon: '🧹' },
  { value: 'meal-prep', label: 'Meal Prep', icon: '👨‍🍳' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'custom', label: 'Custom', icon: '⚙️' }
];

const difficulties: { value: SOPDifficulty; label: string; color: string }[] = [
  { value: 'easy', label: 'Easy', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'hard', label: 'Hard', color: 'text-red-600' }
];

export const CreateSOPModal: React.FC<CreateSOPModalProps> = ({
  isOpen,
  onClose,
  contextId,
  userId,
  onSOPCreated,
  editingSOP
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'morning',
    difficulty: 'easy',
    tags: [],
    steps: [{
      stepNumber: 1,
      title: '',
      description: '',
      estimatedDuration: 5,
      isOptional: false,
      type: 'standard'
    }],
    assignableMembers: [],
    requiresConfirmation: false,
    canBeEmbedded: true,
    isRecurring: false
  });
  
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingSOP) {
      setFormData({
        name: editingSOP.name,
        description: editingSOP.description || '',
        category: editingSOP.category,
        difficulty: editingSOP.difficulty,
        tags: editingSOP.tags || [],
        steps: editingSOP.steps?.map(step => ({
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description || '',
          estimatedDuration: step.estimatedDuration,
          isOptional: step.isOptional,
          type: step.type
        })) || [{
          stepNumber: 1,
          title: '',
          description: '',
          estimatedDuration: 5,
          isOptional: false,
          type: 'standard'
        }],
        assignableMembers: editingSOP.assignableMembers || [],
        defaultAssignee: editingSOP.defaultAssignee,
        requiresConfirmation: editingSOP.requiresConfirmation || false,
        canBeEmbedded: editingSOP.canBeEmbedded || true,
        isRecurring: editingSOP.isRecurring || false
      });
    }
  }, [editingSOP]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (formData.steps.length === 0 || !formData.steps[0].title.trim()) {
      setError('At least one step is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingSOP) {
        // Update existing SOP - preserve existing step IDs
        const stepsWithIds = formData.steps.map((step, index) => ({
          ...step,
          id: editingSOP.steps?.[index]?.id || `step_${Date.now()}_${index}`
        }));
        
        await sopService.updateSOP(editingSOP.id, {
          ...formData,
          steps: stepsWithIds,
          updatedAt: new Date()
        });
      } else {
        // Create new SOP
        await sopService.createSOP(contextId, {
          contextId,
          ...formData,
          createdBy: userId,
          status: 'active',
          isStandalone: true,
          executionOrder: 'sequential'
        });
      }
      onSOPCreated();
      onClose();
    } catch (err) {
      console.error(editingSOP ? 'Error updating SOP:' : 'Error creating SOP:', err);
      setError(editingSOP ? 'Failed to update SOP. Please try again.' : 'Failed to create SOP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, {
        stepNumber: prev.steps.length + 1,
        title: '',
        description: '',
        estimatedDuration: 5,
        isOptional: false,
        type: 'standard'
      }]
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepNumber: i + 1 }))
    }));
  };

  const updateStep = (index: number, field: keyof SOPStep, value: any) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingSOP ? 'Edit SOP' : 'Create New SOP'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Morning Routine"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as SOPCategory }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Describe what this SOP accomplishes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <div className="flex space-x-4">
                {difficulties.map(diff => (
                  <label key={diff.value} className="flex items-center">
                    <input
                      type="radio"
                      value={diff.value}
                      checked={formData.difficulty === diff.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as SOPDifficulty }))}
                      className="mr-2"
                    />
                    <span className={diff.color}>{diff.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Steps *
                </label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Step</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.steps.map((step, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Step {step.stepNumber}
                      </span>
                      {formData.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateStep(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Step title..."
                          required
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={step.estimatedDuration}
                            onChange={(e) => updateStep(index, 'estimatedDuration', parseInt(e.target.value) || 5)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="1"
                            max="480"
                          />
                          <span className="text-sm text-gray-500">min</span>
                        </div>
                      </div>
                    </div>
                    
                    <textarea
                      value={step.description || ''}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="Step description (optional)..."
                    />
                    
                    <label className="flex items-center mt-3">
                      <input
                        type="checkbox"
                        checked={step.isOptional}
                        onChange={(e) => updateStep(index, 'isOptional', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Optional step</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requiresConfirmation}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresConfirmation: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Requires confirmation</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.canBeEmbedded}
                  onChange={(e) => setFormData(prev => ({ ...prev, canBeEmbedded: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Can be embedded</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create SOP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};