import React, { useState } from 'react';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { sopService } from '../../../shared/services/sopService';
import { SOP } from '../../../shared/types/sop';

interface SOPStatsProps {
  sops: SOP[];
  contextId: string;
  userId: string;
  onSOPsUpdated: () => void;
}

export const SOPStats: React.FC<SOPStatsProps> = ({ 
  sops, 
  contextId, 
  userId, 
  onSOPsUpdated 
}) => {
  const [creating, setCreating] = useState(false);

  const createSampleSOPs = async () => {
    setCreating(true);
    
    const sampleSOPs = [
      {
        name: 'Morning Routine',
        description: 'Start the day right with a structured morning routine',
        category: 'morning' as const,
        difficulty: 'easy' as const,
        tags: ['daily', 'morning', 'wellness'],
        steps: [
          {
            stepNumber: 1,
            title: 'Make the bed',
            description: 'Straighten sheets and arrange pillows',
            estimatedDuration: 3,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 2,
            title: 'Brush teeth',
            description: 'Brush for at least 2 minutes',
            estimatedDuration: 3,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 3,
            title: 'Review daily goals',
            description: 'Check calendar and set 3 priorities',
            estimatedDuration: 5,
            isOptional: false,
            type: 'standard' as const
          }
        ],
        assignableMembers: [],
        requiresConfirmation: false,
        canBeEmbedded: true,
        isRecurring: true,
        createdBy: userId,
        status: 'active' as const,
        isStandalone: true,
        executionOrder: 'sequential' as const
      },
      {
        name: 'Evening Wind Down',
        description: 'Prepare for a good night\'s sleep',
        category: 'evening' as const,
        difficulty: 'easy' as const,
        tags: ['daily', 'evening', 'sleep'],
        steps: [
          {
            stepNumber: 1,
            title: 'Tidy living spaces',
            description: 'Quick 10-minute pickup of main areas',
            estimatedDuration: 10,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 2,
            title: 'Plan tomorrow',
            description: 'Review calendar and set out clothes',
            estimatedDuration: 5,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 3,
            title: 'Read or meditate',
            description: 'Quiet activity before bed',
            estimatedDuration: 15,
            isOptional: true,
            type: 'standard' as const
          }
        ],
        assignableMembers: [],
        requiresConfirmation: false,
        canBeEmbedded: true,
        isRecurring: true,
        createdBy: userId,
        status: 'active' as const,
        isStandalone: true,
        executionOrder: 'sequential' as const
      },
      {
        name: 'Weekly Meal Prep',
        description: 'Prepare healthy meals for the week ahead',
        category: 'meal-prep' as const,
        difficulty: 'medium' as const,
        tags: ['weekly', 'cooking', 'health'],
        steps: [
          {
            stepNumber: 1,
            title: 'Plan meals',
            description: 'Choose 3-4 recipes for the week',
            estimatedDuration: 15,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 2,
            title: 'Create shopping list',
            description: 'List all ingredients needed',
            estimatedDuration: 10,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 3,
            title: 'Prep ingredients',
            description: 'Wash, chop, and portion ingredients',
            estimatedDuration: 45,
            isOptional: false,
            type: 'standard' as const
          },
          {
            stepNumber: 4,
            title: 'Cook and store',
            description: 'Prepare meals and store in containers',
            estimatedDuration: 60,
            isOptional: false,
            type: 'standard' as const
          }
        ],
        assignableMembers: [],
        requiresConfirmation: false,
        canBeEmbedded: false,
        isRecurring: true,
        createdBy: userId,
        status: 'active' as const,
        isStandalone: true,
        executionOrder: 'sequential' as const
      }
    ];

    try {
      for (const sopData of sampleSOPs) {
        await sopService.createSOP(contextId, { contextId, ...sopData });
      }
      
      onSOPsUpdated();
      alert('✅ Sample SOPs created successfully!');
    } catch (error) {
      console.error('Error creating sample SOPs:', error);
      alert('Failed to create sample SOPs. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const activeSops = sops.filter(sop => sop.status === 'active');
  const totalDuration = activeSops.reduce((sum, sop) => sum + sop.estimatedDuration, 0);
  const avgDuration = activeSops.length > 0 ? Math.round(totalDuration / activeSops.length) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total SOPs:</span>
          <span className="font-medium">{sops.length}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Active:</span>
          <span className="font-medium text-green-600">{activeSops.length}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Avg Duration:</span>
          <span className="font-medium">{avgDuration}m</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Time:</span>
          <span className="font-medium">{Math.round(totalDuration / 60)}h {totalDuration % 60}m</span>
        </div>
      </div>

      {sops.length === 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <SparklesIcon className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-2">Get Started</h4>
            <p className="text-xs text-gray-500 mb-4">
              Create your first SOPs or try our samples
            </p>
            <button
              onClick={createSampleSOPs}
              disabled={creating}
              className="flex items-center space-x-2 mx-auto px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{creating ? 'Creating...' : 'Add Sample SOPs'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};