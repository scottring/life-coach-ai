// src/components/LogSOPModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import { DogSOP, SOPLogEntry, SOPStep } from '../types/dogBehavior';

interface LogSOPModalProps {
  isOpen: boolean;
  onClose: () => void;
  sop: DogSOP | null;
  onSave: (log: Omit<SOPLogEntry, 'id' | 'executedAt' | 'userId' | 'userName' | 'sopId' | 'sopName'>) => void;
}

const LogSOPModal: React.FC<LogSOPModalProps> = ({ isOpen, onClose, sop, onSave }) => {
  const [completedSteps, setCompletedSteps] = useState<SOPStep[]>([]);
  const [notes, setNotes] = useState('');
  const [accidents, setAccidents] = useState('');

  useEffect(() => {
    if (sop) {
      // Initialize all steps as completed by default for convenience
      setCompletedSteps(sop.steps.map(step => ({ ...step, isCompleted: true })));
      setNotes('');
      setAccidents('');
    } else {
      // Reset when no SOP is selected or modal is closed
      setCompletedSteps([]);
      setNotes('');
      setAccidents('');
    }
  }, [sop]);

  const handleStepToggle = (stepId: string) => {
    setCompletedSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step
      )
    );
  };

  const handleSave = () => {
    if (!sop) return;

    const logData = {
      completedSteps,
      notes,
      observations: {
        accidents: accidents || undefined,
      },
    };
    onSave(logData);
    onClose();
  };

  if (!sop) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Log: ${sop.name}`}>
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Checklist:</h4>
          <ul className="space-y-3">
            {completedSteps.map(step => (
              <li key={step.id} className="flex items-center">
                <input
                  id={`step-${step.id}`}
                  type="checkbox"
                  checked={step.isCompleted}
                  onChange={() => handleStepToggle(step.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`step-${step.id}`} className="ml-3 block text-sm text-gray-700">
                  {step.description}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Gave him 2 kongs - one with peanut butter..."
          />
        </div>

        <div>
          <label htmlFor="accidents" className="block text-sm font-medium text-gray-700">
            Observations (Accidents, etc.)
          </label>
          <input
            id="accidents"
            type="text"
            value={accidents}
            onChange={e => setAccidents(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Pee in the kitchen"
          />
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
            Save Log
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LogSOPModal;
