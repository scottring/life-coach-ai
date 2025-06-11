// src/components/DogBehaviorWidget.tsx
import React, { useState, useEffect } from 'react';
import { DogSOP, SOPLogEntry } from '../types/dogBehavior';
import { DogBehaviorService } from '../services/dogBehaviorService';
import { ClipboardDocumentListIcon, PlusIcon } from '@heroicons/react/24/outline';
import LogSOPModal from './LogSOPModal';

interface DogBehaviorWidgetProps {
  familyId: string;
  userId: string;
}

const DogBehaviorWidget: React.FC<DogBehaviorWidgetProps> = ({ familyId, userId }) => {
  const [sops, setSops] = useState<DogSOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSop, setSelectedSop] = useState<DogSOP | null>(null);

  useEffect(() => {
    const fetchSOPs = async () => {
      try {
        setLoading(true);
        // Using sample data for UI development. The actual Firebase call is commented out.
        const sampleSOPs: DogSOP[] = [
          {
            id: 'sop-1',
            name: 'Leaving the House',
            description: 'Standard procedure for when everyone leaves the house.',
            steps: [
              { id: 'step-1', description: 'Take for a walk (15-20 mins)' },
              { id: 'step-2', description: 'Prepare Kong toys with treats' },
              { id: 'step-3', description: 'Close all blinds' },
              { id: 'step-4', description: 'Turn on white noise machine' },
              { id: 'step-5', description: 'Ensure dog camera is on' },
              { id: 'step-6', description: 'Quietly exit the house' },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'sop-2',
            name: 'Returning to the House',
            description: 'Procedure for when arriving back home.',
            steps: [
              { id: 'step-1', description: 'Enter calmly, ignore dog for first 5 mins' },
              { id: 'step-2', description: 'Check for any accidents (poop/pee)' },
              { id: 'step-3', description: 'Note down any observations' },
              { id: 'step-4', description: 'Let dog out for potty break' },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        setSops(sampleSOPs);
        // const fetchedSops = await DogBehaviorService.getSOPs(familyId);
        // setSops(fetchedSops);
        setError(null);
      } catch (err) {
        console.error('Error fetching SOPs:', err);
        setError('Failed to load dog behavior protocols.');
      } finally {
        setLoading(false);
      }
    };

    fetchSOPs();
  }, [familyId]);

  const handleLogClick = (sop: DogSOP) => {
    setSelectedSop(sop);
    setIsModalOpen(true);
  };

  const handleSaveLog = async (logData: Omit<SOPLogEntry, 'id' | 'executedAt' | 'userId' | 'userName' | 'sopId' | 'sopName'>) => {
    if (!selectedSop) return;

    const newLog = {
      ...logData,
      sopId: selectedSop.id,
      sopName: selectedSop.name,
      userId: userId,
      userName: 'Demo User', // In a real app, get from user profile
    };

    try {
      await DogBehaviorService.logSOP(familyId, newLog);
      // Optionally, you could refresh logs here or show a success message
      console.log('SOP Logged successfully!');
    } catch (err) {
      console.error('Failed to save log:', err);
      // Handle error display to user
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md col-span-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Dog Behavior Tracker</h2>
        <button className="p-2 rounded-full hover:bg-gray-100" title="Add new SOP">
          <PlusIcon className="h-6 w-6 text-gray-500" />
        </button>
      </div>
      {loading && <p className="text-gray-500">Loading protocols...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="space-y-4">
          {sops.length > 0 ? (
            sops.map((sop) => (
              <div key={sop.id} className="border border-gray-200 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{sop.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{sop.description}</p>
                  </div>
                  <button
                    onClick={() => handleLogClick(sop)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-600"
                  >
                    Log
                  </button>
                </div>
                <div className="mt-4">
                  <ul className="space-y-2">
                    {sop.steps.map(step => (
                      <li key={step.id} className="flex items-center text-sm">
                        <ClipboardDocumentListIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{step.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No SOPs found. Add one to get started!</p>
          )}
        </div>
      )}
      <LogSOPModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sop={selectedSop}
        onSave={handleSaveLog}
      />
    </div>
  );
};

export default DogBehaviorWidget;
