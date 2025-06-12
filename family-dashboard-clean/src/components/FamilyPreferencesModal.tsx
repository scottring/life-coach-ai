import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  PlusIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { MealPlanningService } from '../services/mealPlanningService';
import { FamilyMember, DietaryRestriction } from '../types/mealPlanning';

interface FamilyPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

export default function FamilyPreferencesModal({ isOpen, onClose, familyId }: FamilyPreferencesModalProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    ageGroup: 'adult' as 'toddler' | 'child' | 'teen' | 'adult',
    dietaryRestrictions: [] as DietaryRestriction[],
    dislikedIngredients: '',
    allergens: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadFamilyMembers();
    }
  }, [isOpen, familyId]);

  const loadFamilyMembers = async () => {
    setLoading(true);
    try {
      const members = await MealPlanningService.getFamilyMembers(familyId);
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error loading family members:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFamilyMember = async () => {
    try {
      setLoading(true);
      const memberId = await MealPlanningService.addFamilyMember({
        familyId,
        name: newMember.name,
        ageGroup: newMember.ageGroup,
        dietaryRestrictions: newMember.dietaryRestrictions,
        favoriteFoods: [],
        dislikedIngredients: newMember.dislikedIngredients.split(',').map(s => s.trim()).filter(s => s),
        allergens: newMember.allergens.split(',').map(s => s.trim()).filter(s => s)
      });
      
      if (memberId) {
        await loadFamilyMembers(); // Refresh the list
        setNewMember({
          name: '',
          ageGroup: 'adult',
          dietaryRestrictions: [] as DietaryRestriction[],
          dislikedIngredients: '',
          allergens: ''
        });
        setShowAddMember(false);
      }
    } catch (error) {
      console.error('Error adding family member:', error);
    } finally {
      setLoading(false);
    }
  };

  const editFamilyMember = (member: FamilyMember) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      ageGroup: member.ageGroup,
      dietaryRestrictions: member.dietaryRestrictions,
      dislikedIngredients: member.dislikedIngredients.join(', '),
      allergens: member.allergens.join(', ')
    });
    setShowAddMember(true);
  };

  const updateFamilyMember = async () => {
    if (!editingMember) return;

    try {
      setLoading(true);
      const success = await MealPlanningService.updateFamilyMember(editingMember.id, {
        name: newMember.name,
        ageGroup: newMember.ageGroup,
        dietaryRestrictions: newMember.dietaryRestrictions,
        dislikedIngredients: newMember.dislikedIngredients.split(',').map(s => s.trim()).filter(s => s),
        allergens: newMember.allergens.split(',').map(s => s.trim()).filter(s => s)
      });
      
      if (success) {
        await loadFamilyMembers(); // Refresh the list
        setNewMember({
          name: '',
          ageGroup: 'adult',
          dietaryRestrictions: [] as DietaryRestriction[],
          dislikedIngredients: '',
          allergens: ''
        });
        setEditingMember(null);
        setShowAddMember(false);
      }
    } catch (error) {
      console.error('Error updating family member:', error);
      alert(`Error updating family member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteFamilyMember = async (memberId: string, memberName: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete ${memberName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      // Add delete method to MealPlanningService if it doesn't exist
      const success = await MealPlanningService.deleteFamilyMember(memberId);
      
      if (success) {
        await loadFamilyMembers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting family member:', error);
      alert(`Error deleting family member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (editingMember) {
      updateFamilyMember();
    } else {
      addFamilyMember();
    }
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setShowAddMember(false);
    setNewMember({
      name: '',
      ageGroup: 'adult',
      dietaryRestrictions: [] as DietaryRestriction[],
      dislikedIngredients: '',
      allergens: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom apple-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-4xl" style={{ background: '#f5f5f7' }}>
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <UserGroupIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-blue)' }} />
                <h2 className="apple-title text-xl text-gray-800">Family Preferences</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50"
              >
                <XMarkIcon className="w-6 h-6 sf-icon" />
              </button>
            </div>
          </div>
          
          <div className="px-4 pb-4 sm:p-6" style={{ background: 'white' }}>
            {/* Content */}
            <div className="space-y-6">
              {/* Add Family Member Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Family Members</h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Member
                </button>
              </div>

              {/* Family Members List */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : familyMembers.length > 0 ? (
                <div className="grid gap-4">
                  {familyMembers.map(member => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                            {member.ageGroup}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => editFamilyMember(member)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit member"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteFamilyMember(member.id, member.name)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete member"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 font-medium">Favorite Foods:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {member.favoriteFoods.length > 0 ? (
                              member.favoriteFoods.map(food => (
                                <span key={food} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  {food}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None added yet</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Dietary Restrictions:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {member.dietaryRestrictions.length > 0 ? (
                              member.dietaryRestrictions.map(restriction => (
                                <span key={restriction} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                                  {restriction}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Allergens:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {member.allergens.length > 0 ? (
                              member.allergens.map(allergen => (
                                <span key={allergen} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                  {allergen}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No family members added yet</p>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Add your first family member
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Family Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Group
                </label>
                <select
                  value={newMember.ageGroup}
                  onChange={(e) => setNewMember(prev => ({ ...prev, ageGroup: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="toddler">Toddler (1-3 years)</option>
                  <option value="child">Child (4-12 years)</option>
                  <option value="teen">Teen (13-17 years)</option>
                  <option value="adult">Adult (18+ years)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Restrictions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb'].map((restriction) => (
                    <label key={restriction} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newMember.dietaryRestrictions.includes(restriction as DietaryRestriction)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMember(prev => ({
                              ...prev,
                              dietaryRestrictions: [...prev.dietaryRestrictions, restriction as DietaryRestriction]
                            }));
                          } else {
                            setNewMember(prev => ({
                              ...prev,
                              dietaryRestrictions: prev.dietaryRestrictions.filter(r => r !== restriction)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{restriction.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disliked Ingredients
                </label>
                <input
                  type="text"
                  value={newMember.dislikedIngredients}
                  onChange={(e) => setNewMember(prev => ({ ...prev, dislikedIngredients: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="mushrooms, olives, etc. (comma separated)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergens
                </label>
                <input
                  type="text"
                  value={newMember.allergens}
                  onChange={(e) => setNewMember(prev => ({ ...prev, allergens: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="nuts, shellfish, etc. (comma separated)"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={cancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newMember.name.trim() || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading 
                  ? (editingMember ? 'Updating...' : 'Adding...') 
                  : (editingMember ? 'Update Member' : 'Add Member')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}