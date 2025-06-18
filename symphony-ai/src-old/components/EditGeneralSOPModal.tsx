import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import Modal from './common/Modal';
import { SOP, SOPStep, SOPCategory, SOPStepType } from '../types/sop';
import { ContextMember } from '../types/context';
import { sopService } from '../services/sopService';
import { contextService } from '../services/contextService';

interface EditGeneralSOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  sop?: SOP;
  contextId: string;
  userId?: string;
  onSOPUpdated?: () => void;
  onSOPDeleted?: () => void;
}

const EditGeneralSOPModal: React.FC<EditGeneralSOPModalProps> = ({
  isOpen,
  onClose,
  sop,
  contextId,
  userId,
  onSOPUpdated,
  onSOPDeleted
}) => {
  const [name, setName] = useState(sop?.name || '');
  const [description, setDescription] = useState(sop?.description || '');
  const [category, setCategory] = useState<SOPCategory>(sop?.category || 'custom');
  const [difficulty, setDifficulty] = useState(sop?.difficulty || 'medium');
  const [tags, setTags] = useState(sop?.tags.join(', ') || '');
  const [steps, setSteps] = useState<SOPStep[]>(sop?.steps || []);
  const [members, setMembers] = useState<ContextMember[]>([]);
  const [assignableMembers, setAssignableMembers] = useState<string[]>(sop?.assignableMembers || []);
  const [defaultAssignee, setDefaultAssignee] = useState(sop?.defaultAssignee || '');
  const [requiresConfirmation, setRequiresConfirmation] = useState(sop?.requiresConfirmation || false);
  const [isRecurring, setIsRecurring] = useState(sop?.isRecurring || false);
  const [canBeEmbedded, setCanBeEmbedded] = useState(sop?.canBeEmbedded || false);
  const [isStandalone, setIsStandalone] = useState(sop?.isStandalone ?? true);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [availableSOPs, setAvailableSOPs] = useState<SOP[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      // Reset form when sop changes
      setName(sop?.name || '');
      setDescription(sop?.description || '');
      setCategory(sop?.category || 'custom');
      setDifficulty(sop?.difficulty || 'medium');
      setTags(sop?.tags.join(', ') || '');
      setSteps(sop?.steps || []);
      setAssignableMembers(sop?.assignableMembers || []);
      setDefaultAssignee(sop?.defaultAssignee || '');
      setRequiresConfirmation(sop?.requiresConfirmation || false);
      setIsRecurring(sop?.isRecurring || false);
      setCanBeEmbedded(sop?.canBeEmbedded || false);
      setIsStandalone(sop?.isStandalone ?? true);
    }
  }, [isOpen, sop]);

  const loadMembers = async () => {
    try {
      const [membersData, embeddableSOPs] = await Promise.all([
        contextService.getContextMembers(contextId),
        sopService.getEmbeddableSOPs(contextId)
      ]);
      setMembers(membersData);
      // Filter out the current SOP to prevent self-embedding
      setAvailableSOPs(embeddableSOPs.filter(s => s.id !== sop?.id));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addStep = () => {
    const newStep: SOPStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      stepNumber: steps.length + 1,
      title: '',
      description: '',
      estimatedDuration: 5,
      isOptional: false,
      type: 'standard'
    };
    setSteps([...steps, newStep]);
  };

  const addEmbeddedSOP = (embeddedSOPId: string) => {
    const embeddedSOP = availableSOPs.find(s => s.id === embeddedSOPId);
    if (!embeddedSOP) return;

    const newStep: SOPStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      stepNumber: steps.length + 1,
      title: embeddedSOP.name,
      description: `Embedded SOP: ${embeddedSOP.description}`,
      estimatedDuration: embeddedSOP.estimatedDuration,
      isOptional: false,
      type: 'embedded_sop',
      embeddedSOPId: embeddedSOPId
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, field: keyof SOPStep, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setSteps(updatedSteps);
  };

  const removeStep = (index: number) => {
    const updatedSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1
    }));
    setSteps(renumberedSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const updatedSteps = [...steps];
    const [movedStep] = updatedSteps.splice(index, 1);
    updatedSteps.splice(newIndex, 0, movedStep);
    
    // Renumber all steps
    const renumberedSteps = updatedSteps.map((step, i) => ({
      ...step,
      stepNumber: i + 1
    }));
    
    setSteps(renumberedSteps);
  };

  const toggleMemberAssignment = (memberId: string) => {
    if (assignableMembers.includes(memberId)) {
      setAssignableMembers(assignableMembers.filter(id => id !== memberId));
      if (defaultAssignee === memberId) {
        setDefaultAssignee('');
      }
    } else {
      setAssignableMembers([...assignableMembers, memberId]);
    }
  };

  const calculateTotalDuration = () => {
    return steps.reduce((total, step) => total + step.estimatedDuration, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a name for the SOP');
      return;
    }

    if (steps.length === 0) {
      alert('Please add at least one step');
      return;
    }

    if (steps.some(step => !step.title.trim())) {
      alert('All steps must have a title');
      return;
    }

    setLoading(true);
    
    try {
      const updates: Partial<SOP> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        difficulty,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        steps,
        assignableMembers,
        ...(defaultAssignee && assignableMembers.includes(defaultAssignee) && { defaultAssignee }),
        requiresConfirmation,
        isRecurring,
        canBeEmbedded,
        isStandalone
      };

      if (sop?.id) {
        // Update existing SOP
        await sopService.updateSOP(sop.id, updates);
      } else {
        // Create new SOP
        const newSOPData = {
          ...updates,
          createdBy: userId || '',
          status: 'active' as const
        };
        await sopService.createSOP(contextId, newSOPData as Omit<SOP, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'estimatedDuration'>);
      }
      onSOPUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating SOP:', error);
      alert('Failed to update SOP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sop?.id) return;
    
    setLoading(true);
    try {
      await sopService.deleteSOP(sop.id);
      onSOPDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting SOP:', error);
      alert('Failed to delete SOP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories: { value: SOPCategory; label: string }[] = [
    { value: 'morning', label: 'Morning Routine' },
    { value: 'evening', label: 'Evening Routine' },
    { value: 'leaving', label: 'Leaving House' },
    { value: 'cleanup', label: 'Cleanup' },
    { value: 'meal-prep', label: 'Meal Preparation' },
    { value: 'work', label: 'Work Process' },
    { value: 'custom', label: 'Custom' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={sop ? "Edit SOP" : "Create New SOP"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SOP Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Morning Routine, Leave for Work"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of this SOP..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SOPCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="productivity, routine, daily"
            />
          </div>
        </div>

        {/* Assignment */}
        {members.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who can be assigned this SOP?
            </label>
            <div className="space-y-2">
              {members.map(member => (
                <label key={member.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={assignableMembers.includes(member.userId)}
                    onChange={() => toggleMemberAssignment(member.userId)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{member.displayName}</span>
                </label>
              ))}
            </div>
            
            {assignableMembers.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Assignee
                </label>
                <select
                  value={defaultAssignee}
                  onChange={(e) => setDefaultAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select default assignee...</option>
                  {assignableMembers.map(memberId => {
                    const member = members.find(m => m.userId === memberId);
                    return (
                      <option key={memberId} value={memberId}>
                        {member?.displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={requiresConfirmation}
              onChange={(e) => setRequiresConfirmation(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Requires confirmation before execution</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">This is a recurring SOP</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={canBeEmbedded}
              onChange={(e) => setCanBeEmbedded(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Allow this SOP to be embedded in other SOPs</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isStandalone}
              onChange={(e) => setIsStandalone(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">This SOP can be executed independently</span>
          </label>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Steps * ({steps.length})
            </label>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <ClockIcon className="w-4 h-4" />
              <span>Total: {calculateTotalDuration()} min</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className={`border rounded-md p-3 ${
                step.type === 'embedded_sop' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">Step {index + 1}</span>
                    {step.type === 'embedded_sop' && (
                      <span className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        <CubeIcon className="w-3 h-3" />
                        <span>Embedded SOP</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === steps.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Delete step"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Step Type Selector */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Type:</label>
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(index, 'type', e.target.value as SOPStepType)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="standard">Standard Step</option>
                      <option value="list">Checklist/List</option>
                      <option value="embedded_sop">Embedded SOP</option>
                    </select>
                  </div>

                  {step.type === 'embedded_sop' ? (
                    <>
                      <div className="bg-white rounded border p-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">{step.title}</div>
                        <div className="text-xs text-gray-600">{step.description}</div>
                        <div className="text-xs text-blue-600 mt-2">
                          This will execute all steps from the "{step.title}" SOP
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-700">Duration:</label>
                          <input
                            type="number"
                            min="1"
                            value={step.estimatedDuration}
                            onChange={(e) => updateStep(index, 'estimatedDuration', parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm text-gray-500">min</span>
                        </div>
                        
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={step.isOptional}
                            onChange={(e) => updateStep(index, 'isOptional', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-1 text-gray-700">Optional</span>
                        </label>
                      </div>
                    </>
                  ) : step.type === 'list' ? (
                    <>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="List title (e.g., 'Summer Camp Packing List')..."
                        required
                      />
                      
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">List Items:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const newItem = {
                                id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                                text: '',
                                isCompleted: false,
                                isOptional: false
                              };
                              const updatedItems = [...(step.listItems || []), newItem];
                              updateStep(index, 'listItems', updatedItems);
                            }}
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Item</span>
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {(step.listItems || []).map((item, itemIndex) => (
                            <div key={item.id} className="flex items-center space-x-2 bg-white rounded p-2">
                              <input
                                type="text"
                                value={item.text}
                                onChange={(e) => {
                                  const updatedItems = [...(step.listItems || [])];
                                  updatedItems[itemIndex] = { ...item, text: e.target.value };
                                  updateStep(index, 'listItems', updatedItems);
                                }}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder="List item..."
                              />
                              <label className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={item.isOptional}
                                  onChange={(e) => {
                                    const updatedItems = [...(step.listItems || [])];
                                    updatedItems[itemIndex] = { ...item, isOptional: e.target.checked };
                                    updateStep(index, 'listItems', updatedItems);
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-1 text-gray-600">Optional</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = (step.listItems || []).filter((_, i) => i !== itemIndex);
                                  updateStep(index, 'listItems', updatedItems);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          
                          {(!step.listItems || step.listItems.length === 0) && (
                            <div className="text-sm text-gray-500 text-center py-2">
                              No items yet. Click "Add Item" to start building your list.
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-700">Duration:</label>
                          <input
                            type="number"
                            min="1"
                            value={step.estimatedDuration}
                            onChange={(e) => updateStep(index, 'estimatedDuration', parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm text-gray-500">min</span>
                        </div>
                        
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={step.isOptional}
                            onChange={(e) => updateStep(index, 'isOptional', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-1 text-gray-700">Optional</span>
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Step title..."
                        required
                      />
                      
                      <textarea
                        value={step.description || ''}
                        onChange={(e) => updateStep(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Step description (optional)..."
                      />
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-700">Duration:</label>
                          <input
                            type="number"
                            min="1"
                            value={step.estimatedDuration}
                            onChange={(e) => updateStep(index, 'estimatedDuration', parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-sm text-gray-500">min</span>
                        </div>
                        
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={step.isOptional}
                            onChange={(e) => updateStep(index, 'isOptional', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-1 text-gray-700">Optional</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={addStep}
                className="w-full flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Step</span>
              </button>
              
              {availableSOPs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or embed an existing SOP:
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        addEmbeddedSOP(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Select SOP to embed...</option>
                    {availableSOPs.map(sopOption => (
                      <option key={sopOption.id} value={sopOption.id}>
                        {sopOption.name} ({sopOption.estimatedDuration}m)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          {sop && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete SOP
            </button>
          )}
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (sop ? 'Updating...' : 'Creating...') : (sop ? 'Update SOP' : 'Create SOP')}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete SOP</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{sop?.name}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditGeneralSOPModal;