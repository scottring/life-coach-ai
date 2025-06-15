import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  ClockIcon, 
  UserGroupIcon,
  PlayIcon,
  CheckCircleIcon,
  EllipsisVerticalIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { SOP, SOPCategory } from '../types/sop';
import { ContextMember } from '../types/context';
import { sopService, getCategoryColor } from '../services/sopService';
import { contextService } from '../services/contextService';

interface SOPWidgetProps {
  contextId: string;
  userId: string;
  onCreateSOP?: () => void;
  onEditSOP?: (sop: SOP) => void;
  onExecuteSOP?: (sop: SOP) => void;
}

const SOPWidget: React.FC<SOPWidgetProps> = ({ 
  contextId, 
  userId, 
  onCreateSOP, 
  onEditSOP, 
  onExecuteSOP 
}) => {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [members, setMembers] = useState<ContextMember[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SOPCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [contextId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sopsData, membersData] = await Promise.all([
        sopService.getSOPsForContext(contextId),
        contextService.getContextMembers(contextId)
      ]);
      
      setSOPs(sopsData);
      setMembers(membersData);
      setError(null);
    } catch (err) {
      console.error('Error loading SOP data:', err);
      setError('Failed to load SOPs');
    } finally {
      setLoading(false);
    }
  };

  const filteredSOPs = selectedCategory === 'all' 
    ? sops 
    : sops.filter(sop => sop.category === selectedCategory);

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

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.userId === memberId);
    return member?.displayName || 'Unknown';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button 
            onClick={loadData}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with category filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Standard Operating Procedures</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            {filteredSOPs.length}
          </span>
        </div>
        <button
          onClick={onCreateSOP}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New SOP</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
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

      {/* SOPs List */}
      <div className="space-y-3">
        {filteredSOPs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-500 mb-4">
              {selectedCategory === 'all' 
                ? 'No SOPs created yet' 
                : `No ${categories.find(c => c.value === selectedCategory)?.label} SOPs`}
            </p>
            <button
              onClick={onCreateSOP}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create your first SOP</span>
            </button>
          </div>
        ) : (
          filteredSOPs.map(sop => (
            <div
              key={sop.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Title and Category */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900 truncate">{sop.name}</h4>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(sop.category) }}
                      title={sop.category}
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(sop.difficulty)}`}>
                      {sop.difficulty}
                    </span>
                  </div>

                  {/* Description */}
                  {sop.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sop.description}</p>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatDuration(sop.estimatedDuration)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <TagIcon className="w-3 h-3" />
                      <span>{sop.steps.length} steps</span>
                    </div>

                    {sop.assignableMembers.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <UserGroupIcon className="w-3 h-3" />
                        <span>
                          {sop.assignableMembers.length === 1 
                            ? getMemberName(sop.assignableMembers[0])
                            : `${sop.assignableMembers.length} people`}
                        </span>
                      </div>
                    )}

                    {sop.isRecurring && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                        Recurring
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {sop.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sop.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {sop.tags.length > 3 && (
                        <span className="text-gray-400 text-xs">
                          +{sop.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onExecuteSOP?.(sop)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    title="Execute SOP"
                  >
                    <PlayIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Execute</span>
                  </button>
                  
                  <button
                    onClick={() => onEditSOP?.(sop)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                    title="Edit SOP"
                  >
                    <EllipsisVerticalIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions for Recent/Popular SOPs */}
      {sops.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            {sops
              .filter(sop => sop.isRecurring || sop.category === 'morning' || sop.category === 'evening')
              .slice(0, 3)
              .map(sop => (
                <button
                  key={sop.id}
                  onClick={() => onExecuteSOP?.(sop)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors text-sm"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(sop.category) }}
                  />
                  <span>{sop.name}</span>
                  <ClockIcon className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-500">{formatDuration(sop.estimatedDuration)}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SOPWidget;