import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateSOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextId: string;
  userId: string;
  onSOPCreated: () => void;
}

export const CreateSOPModal: React.FC<CreateSOPModalProps> = ({
  isOpen,
  onClose,
  contextId,
  userId,
  onSOPCreated
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create New SOP</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-500">SOP creation form coming soon...</p>
          <button
            onClick={() => {
              // Simulate SOP creation
              setTimeout(() => {
                onSOPCreated();
              }, 500);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Sample SOP
          </button>
        </div>
      </div>
    </div>
  );
};