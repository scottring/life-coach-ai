// src/components/EditSOPModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import { DogSOP, SOPStep } from '../types/dogBehavior';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface EditSOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  sopToEdit?: DogSOP | null; // Pass SOP to edit, or null/undefined for new SOP
  onSave: (sopData: Omit<DogSOP, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const EditSOPModal: React.FC<EditSOPModalProps> = ({ isOpen, onClose, sopToEdit, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<Partial<SOPStep>[]>([{ description: '' }]);

  useEffect(() => {
    if (sopToEdit) {
      setName(sopToEdit.name);
      setDescription(sopToEdit.description || '');
      setSteps(sopToEdit.steps.map(s => ({ ...s }))); // Ensure we have descriptions
    } else {
      setName('');
      setDescription('');
      setSteps([{ description: '' }]);
    }
  }, [sopToEdit, isOpen]); // Reset when modal opens or sopToEdit changes

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], description: value };
    setSteps(newSteps);
  };

  const addStep = () => {
    setSteps([...steps, { description: '' }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('SOP Name is required.');
      return;
    }
    const finalSteps = steps
      .map((step, index) => ({
        id: sopToEdit?.steps[index]?.id || `new-step-${Date.now()}-${index}`,
        description: step.description || '',
      }))
      .filter(step => step.description.trim() !== '');

    if (finalSteps.length === 0) {
      alert('At least one step is required.');
      return;
    }

    onSave({
      name,
      description,
      steps: finalSteps,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={sopToEdit ? 'Edit SOP' : 'Add New SOP'}>
      <div className="space-y-6">
        <div>
          <label htmlFor="sop-name" className="block text-sm font-medium text-gray-700">
            SOP Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="sop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Leaving the House"
          />
        </div>

        <div>
          <label htmlFor="sop-description" className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <textarea
            id="sop-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Standard procedure for when everyone leaves the house."
          />
        </div>

        <div>
          <h4 className="font-medium text-gray-800 mb-2">Steps <span className="text-red-500">*</span></h4>
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={step.description || ''}
                onChange={(e) => handleStepChange(index, e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder={`Step ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                disabled={steps.length <= 1}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStep}
            className="mt-1 flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <PlusIcon className="h-4 w-4 mr-1" /> Add Step
          </button>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none"
          >
            Save SOP
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditSOPModal;
