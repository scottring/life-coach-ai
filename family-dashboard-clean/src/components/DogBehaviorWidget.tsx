// src/components/DogBehaviorWidget.tsx
import React, { useState, useEffect } from 'react';
import { DogSOP, SOPLogEntry } from '../types/dogBehavior';
import { DogBehaviorService } from '../services/dogBehaviorService';
import { ClipboardDocumentListIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'; // Added PencilSquareIcon
import LogSOPModal from './LogSOPModal';
import EditSOPModal from './EditSOPModal';

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
  const [isEditSOPModalOpen, setIsEditSOPModalOpen] = useState(false);
  // We'll use sopToEdit for editing later. For now, null means 'new SOP'.
  const [sopToEdit, setSopToEdit] = useState<DogSOP | null>(null);

  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const fetchedSops = await DogBehaviorService.getSOPs(familyId);
      setSops(fetchedSops);
      setError(null);
    } catch (err) {
      console.error('Error fetching SOPs:', err);
      setError('Failed to load dog behavior protocols.');
      setSops([]); // Clear SOPs on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      fetchSOPs();
    }
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

  const handleAddNewSOP = () => {
    setSopToEdit(null); // Clear sopToEdit for new SOP
    setIsEditSOPModalOpen(true);
  };

  const handleEditSOP = (sop: DogSOP) => {
    setSopToEdit(sop); // Set the SOP to be edited
    setIsEditSOPModalOpen(true);
  };

  const handleSaveSOP = async (sopData: Omit<DogSOP, 'id' | 'createdAt' | 'updatedAt' | 'familyId'>) => { // familyId is not part of the form data
    try {
      if (sopToEdit && sopToEdit.id) {
        // Editing existing SOP
        await DogBehaviorService.updateSOP(sopToEdit.id, sopData);
        console.log('SOP updated successfully!');
      } else {
        // Adding new SOP
        await DogBehaviorService.addSOP(familyId, sopData as Omit<DogSOP, 'id' | 'createdAt' | 'updatedAt'>); // Type assertion for addSOP
        console.log('New SOP added successfully!');
      }
      fetchSOPs(); // Refresh the SOP list
      setIsEditSOPModalOpen(false);
      setSopToEdit(null); // Reset sopToEdit
    } catch (err) {
      console.error('Failed to save SOP:', err);
      // Handle error display to user (e.g., set an error state for the modal)
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end mb-4">
        <button onClick={handleAddNewSOP} className="p-2 rounded-full hover:bg-gray-100" title="Add new SOP">
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
                    className="flex items-center justify-center w-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition duration-150 ease-in-out"
                  >
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-1 sm:mr-2" />
                    Log
                  </button>
                  <button
                    onClick={() => handleEditSOP(sop)}
                    className="flex items-center justify-center w-auto bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg text-sm transition duration-150 ease-in-out ml-2"
                    title="Edit SOP"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
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
      <EditSOPModal
        isOpen={isEditSOPModalOpen}
        onClose={() => setIsEditSOPModalOpen(false)}
        sopToEdit={sopToEdit}
        onSave={handleSaveSOP}
      />
    </div>
  );
};

export default DogBehaviorWidget;
