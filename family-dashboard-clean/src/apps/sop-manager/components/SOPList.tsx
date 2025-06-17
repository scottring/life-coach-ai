import React, { useState } from 'react';
import { 
  PlayIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  ClockIcon,
  TagIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { SOP, SOPCategory } from '../../../shared/types/sop';
import { sopService } from '../../../shared/services/sopService';
import { taskManager } from '../../../shared/services/taskManagerService';

interface SOPListProps {
  sops: SOP[];
  contextId: string;
  userId: string;
  onSOPUpdated: () => void;
  onSOPEdit: (sop: SOP) => void;
}

const categories: { value: SOPCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All SOPs', icon: '📋' },
  { value: 'morning', label: 'Morning', icon: '🌅' },
  { value: 'evening', label: 'Evening', icon: '🌙' },
  { value: 'leaving', label: 'Leaving House', icon: '🏃‍♂️' },
  { value: 'cleanup', label: 'Cleanup', icon: '🧹' },
  { value: 'meal-prep', label: 'Meal Prep', icon: '👨‍🍳' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'custom', label: 'Custom', icon: '⚙️' }
];

export const SOPList: React.FC<SOPListProps> = ({ 
  sops, 
  contextId, 
  userId, 
  onSOPUpdated,
  onSOPEdit
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SOPCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSOPs = sops.filter(sop => {
    const matchesCategory = selectedCategory === 'all' || sop.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      sop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch && sop.status === 'active';
  });

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExecute = async (sop: SOP) => {
    console.log('Executing SOP:', sop);
    console.log('Context ID:', contextId);
    console.log('User ID:', userId);
    
    try {
      // Create a task for this SOP execution
      const sopTask = {
        id: `sop_task_${sop.id}_${Date.now()}`,
        title: `Execute: ${sop.name}`,
        type: 'sop' as const,
        context: 'family' as const, // You might want to make this dynamic
        priority: 'medium' as const,
        status: 'pending' as const,
        duration: sop.estimatedDuration,
        assignedTo: sop.defaultAssignee || userId,
        createdBy: userId,
        contextId,
        tags: [...sop.tags, 'sop-execution'],
        notes: `SOP ID: ${sop.id}\n\nSteps:\n${sop.steps.map((step, i) => `${i + 1}. ${step.title} (${step.estimatedDuration}min)`).join('\n')}`,
        source: 'manual' as const
      };

      // Create task using the new direct method
      const createdTask = await taskManager.createTask(sopTask);
      
      if (createdTask) {
        console.log(`✅ SOP "${sop.name}" added to your task list!`);
        alert(`✅ SOP "${sop.name}" has been added to your tasks! Check the Today or Planning view to schedule it.`);
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating SOP task:', error);
      console.error('Error details:', error);
      alert(`❌ Failed to create SOP task. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  };

  const handleEdit = (sop: SOP) => {
    console.log('Edit SOP:', sop.name);
    onSOPEdit(sop);
  };

  const handleDelete = async (sop: SOP) => {
    if (window.confirm(`Are you sure you want to delete "${sop.name}"?`)) {
      try {
        await sopService.deleteSOP(sop.id);
        onSOPUpdated();
      } catch (error) {
        console.error('Error deleting SOP:', error);
        alert('Failed to delete SOP. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search SOPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SOPs Grid */}
      <div className="space-y-4">
        {filteredSOPs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SOPs found</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? `No SOPs match "${searchQuery}"`
                : selectedCategory === 'all'
                ? 'Create your first SOP to get started'
                : `No ${categories.find(c => c.value === selectedCategory)?.label} SOPs`
              }
            </p>
          </div>
        ) : (
          filteredSOPs.map(sop => (
            <div
              key={sop.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{sop.name}</h3>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sopService.getCategoryColor(sop.category) }}
                      title={sop.category}
                    />
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getDifficultyColor(sop.difficulty)}`}>
                      {sop.difficulty}
                    </span>
                  </div>

                  {/* Description */}
                  {sop.description && (
                    <p className="text-gray-600 mb-4">{sop.description}</p>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatDuration(sop.estimatedDuration)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <TagIcon className="w-4 h-4" />
                      <span>{sop.steps.length} steps</span>
                    </div>

                    {sop.assignableMembers.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <UserGroupIcon className="w-4 h-4" />
                        <span>{sop.assignableMembers.length} assignee(s)</span>
                      </div>
                    )}

                    {sop.isRecurring && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        Recurring
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {sop.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sop.tags.slice(0, 5).map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {sop.tags.length > 5 && (
                        <span className="text-gray-400 text-xs">
                          +{sop.tags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-6">
                  <div 
                    className="p-2 text-gray-400 hover:text-gray-600 cursor-move"
                    title="Drag to schedule (coming soon)"
                    onClick={() => alert('Drag-and-drop scheduling coming soon! Use Execute button to add to tasks.')}
                  >
                    <Bars3Icon className="w-5 h-5" />
                  </div>
                  
                  <button
                    onClick={() => handleExecute(sop)}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    <span>Execute</span>
                  </button>
                  
                  <button
                    onClick={() => handleEdit(sop)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(sop)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};