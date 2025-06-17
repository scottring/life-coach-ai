import React, { useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { DepartureParameter, DepartureParameterLog } from '../types/dogBehavior';

interface DepartureParameterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedParameters: DepartureParameterLog[]) => void;
  savedTemplate?: DepartureParameterLog[];
}

const defaultParameters: DepartureParameter[] = [
  {
    id: 'kong-toy',
    name: 'Kong Toy',
    icon: '🦴',
    category: 'comfort',
    isQuantifiable: true,
    maxQuantity: 5,
    unit: 'toys',
    color: 'bg-orange-500',
    isActive: true
  },
  {
    id: 'white-noise',
    name: 'White Noise',
    icon: '🎵',
    category: 'environment',
    isQuantifiable: false,
    color: 'bg-blue-500',
    isActive: true
  },
  {
    id: 'pre-walk',
    name: 'Pre-Walk',
    icon: '🚶‍♂️',
    category: 'activity',
    isQuantifiable: true,
    maxQuantity: 60,
    unit: 'minutes',
    color: 'bg-green-500',
    isActive: true
  },
  {
    id: 'medication',
    name: 'Medication',
    icon: '💊',
    category: 'medication',
    isQuantifiable: true,
    maxQuantity: 10,
    unit: 'pills',
    color: 'bg-red-500',
    isActive: true
  },
  {
    id: 'treats',
    name: 'Special Treats',
    icon: '🍖',
    category: 'comfort',
    isQuantifiable: true,
    maxQuantity: 20,
    unit: 'treats',
    color: 'bg-yellow-500',
    isActive: true
  },
  {
    id: 'puzzle-toy',
    name: 'Puzzle Toy',
    icon: '🧩',
    category: 'comfort',
    isQuantifiable: false,
    color: 'bg-purple-500',
    isActive: true
  },
  {
    id: 'blanket',
    name: 'Comfort Blanket',
    icon: '🛏️',
    category: 'comfort',
    isQuantifiable: false,
    color: 'bg-pink-500',
    isActive: true
  },
  {
    id: 'tv-on',
    name: 'TV/Music On',
    icon: '📺',
    category: 'environment',
    isQuantifiable: false,
    color: 'bg-indigo-500',
    isActive: true
  },
  {
    id: 'crate-setup',
    name: 'Crate Setup',
    icon: '🏠',
    category: 'environment',
    isQuantifiable: false,
    color: 'bg-gray-600',
    isActive: true
  },
  {
    id: 'bathroom-break',
    name: 'Bathroom Break',
    icon: '🌳',
    category: 'activity',
    isQuantifiable: false,
    color: 'bg-emerald-500',
    isActive: true
  }
];

export default function DepartureParameterSelector({ 
  isOpen, 
  onClose, 
  onConfirm, 
  savedTemplate 
}: DepartureParameterSelectorProps) {
  const [parameters] = useState<DepartureParameter[]>(defaultParameters);
  const [selectedParams, setSelectedParams] = useState<Map<string, DepartureParameterLog>>(new Map());
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customParam, setCustomParam] = useState({ name: '', icon: '🐕', notes: '' });

  useEffect(() => {
    if (savedTemplate) {
      const templateMap = new Map<string, DepartureParameterLog>();
      savedTemplate.forEach(param => {
        templateMap.set(param.parameterId, param);
      });
      setSelectedParams(templateMap);
    }
  }, [savedTemplate]);

  if (!isOpen) return null;

  const toggleParameter = (param: DepartureParameter) => {
    const newSelected = new Map(selectedParams);
    const paramKey = param.id;
    
    if (newSelected.has(paramKey)) {
      newSelected.delete(paramKey);
    } else {
      newSelected.set(paramKey, {
        parameterId: param.id,
        parameterName: param.name,
        isSelected: true,
        quantity: param.isQuantifiable ? 1 : undefined,
        notes: ''
      });
    }
    setSelectedParams(newSelected);
  };

  const updateQuantity = (paramId: string, quantity: number) => {
    const newSelected = new Map(selectedParams);
    const param = newSelected.get(paramId);
    if (param) {
      param.quantity = Math.max(1, quantity);
      newSelected.set(paramId, param);
      setSelectedParams(newSelected);
    }
  };

  const addCustomParameter = () => {
    if (!customParam.name.trim()) return;
    
    const customId = `custom-${Date.now()}`;
    const newSelected = new Map(selectedParams);
    newSelected.set(customId, {
      parameterId: customId,
      parameterName: customParam.name,
      isSelected: true,
      notes: customParam.notes
    });
    
    setSelectedParams(newSelected);
    setCustomParam({ name: '', icon: '🐕', notes: '' });
    setShowAddCustom(false);
  };

  const getCategoryParams = (category: DepartureParameter['category']) => {
    return parameters.filter(p => p.category === category && p.isActive);
  };

  const categoryColors = {
    comfort: 'bg-orange-100 border-orange-200',
    activity: 'bg-green-100 border-green-200', 
    medication: 'bg-red-100 border-red-200',
    environment: 'bg-blue-100 border-blue-200',
    custom: 'bg-purple-100 border-purple-200'
  };

  const categoryTitles = {
    comfort: 'Comfort & Toys',
    activity: 'Pre-Departure Activities',
    medication: 'Medication & Health',
    environment: 'Environment Setup',
    custom: 'Custom Parameters'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative apple-card w-full max-w-4xl max-h-[90vh] overflow-y-auto" style={{ background: '#f5f5f7' }}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200/50" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <div className="flex items-center">
            <span className="text-2xl mr-3">🐕</span>
            <div>
              <h2 className="apple-title text-xl text-gray-800">Departure Setup</h2>
              <p className="apple-caption text-gray-600">Select what you're doing before leaving</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
            <XMarkIcon className="w-6 h-6 sf-icon" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6" style={{ background: 'white' }}>
          {/* Selected Count */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
              <CheckIcon className="h-5 w-5 mr-2 sf-icon" style={{ color: 'var(--apple-green)' }} />
              <span className="apple-subtitle" style={{ color: 'var(--apple-green)' }}>
                {selectedParams.size} items selected
              </span>
            </div>
          </div>

          {/* Parameter Categories */}
          <div className="space-y-8">
            {(['comfort', 'activity', 'environment', 'medication'] as const).map(category => {
              const categoryParams = getCategoryParams(category);
              if (categoryParams.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="apple-subtitle text-gray-800 mb-4 flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${category === 'comfort' ? 'bg-orange-500' : 
                                                                    category === 'activity' ? 'bg-green-500' :
                                                                    category === 'environment' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    {categoryTitles[category]}
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categoryParams.map(param => {
                      const isSelected = selectedParams.has(param.id);
                      const selectedParam = selectedParams.get(param.id);
                      
                      return (
                        <div key={param.id} className="relative">
                          <button
                            onClick={() => toggleParameter(param)}
                            className={`w-full p-4 rounded-xl border-2 apple-transition transform hover:scale-105 ${
                              isSelected 
                                ? 'border-green-400 shadow-lg' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={{ 
                              background: isSelected 
                                ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.05))' 
                                : 'white'
                            }}
                          >
                            <div className="text-center">
                              <div className="text-3xl mb-2">{param.icon}</div>
                              <div className="apple-caption font-medium text-gray-800">{param.name}</div>
                              {param.isQuantifiable && (
                                <div className="apple-caption text-gray-600 mt-1">
                                  {param.unit}
                                </div>
                              )}
                            </div>
                            
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                   style={{ background: 'var(--apple-green)' }}>
                                <CheckIcon className="w-4 h-4 text-white sf-icon" />
                              </div>
                            )}
                          </button>
                          
                          {/* Quantity Selector */}
                          {isSelected && param.isQuantifiable && selectedParam && (
                            <div className="mt-2 flex items-center justify-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(param.id, (selectedParam.quantity || 1) - 1);
                                }}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center apple-transition"
                                disabled={(selectedParam.quantity || 1) <= 1}
                              >
                                <span className="text-gray-600 text-sm">−</span>
                              </button>
                              
                              <span className="apple-caption font-medium text-gray-800 min-w-[3rem] text-center">
                                {selectedParam.quantity || 1} {param.unit}
                              </span>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(param.id, (selectedParam.quantity || 1) + 1);
                                }}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center apple-transition"
                                disabled={(selectedParam.quantity || 1) >= (param.maxQuantity || 999)}
                              >
                                <span className="text-gray-600 text-sm">+</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Custom Parameters Section */}
            <div>
              <h3 className="apple-subtitle text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-3"></div>
                Custom Parameters
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Add Custom Button */}
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 apple-transition flex flex-col items-center justify-center text-gray-500 hover:text-purple-600"
                >
                  <PlusIcon className="w-8 h-8 mb-2 sf-icon" />
                  <span className="apple-caption">Add Custom</span>
                </button>
                
                {/* Display Custom Parameters */}
                {Array.from(selectedParams.entries())
                  .filter(([id]) => id.startsWith('custom-'))
                  .map(([id, param]) => (
                    <div key={id} className="relative">
                      <div className="w-full p-4 rounded-xl border-2 border-purple-400 shadow-lg"
                           style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05))' }}>
                        <div className="text-center">
                          <div className="text-3xl mb-2">🐕</div>
                          <div className="apple-caption font-medium text-gray-800">{param.parameterName}</div>
                        </div>
                        
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                             style={{ background: 'var(--apple-purple)' }}>
                          <CheckIcon className="w-4 h-4 text-white sf-icon" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Custom Parameter Modal */}
          {showAddCustom && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/20" onClick={() => setShowAddCustom(false)}></div>
              
              <div className="relative apple-card p-6" style={{ background: 'white' }}>
                <h3 className="apple-subtitle text-gray-800 mb-4">Add Custom Parameter</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block apple-caption text-gray-600 mb-2">Parameter Name</label>
                    <input
                      type="text"
                      value={customParam.name}
                      onChange={(e) => setCustomParam(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                      placeholder="e.g., Extra playtime, Special toy..."
                    />
                  </div>
                  
                  <div>
                    <label className="block apple-caption text-gray-600 mb-2">Notes (optional)</label>
                    <textarea
                      value={customParam.notes}
                      onChange={(e) => setCustomParam(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                      rows={2}
                      placeholder="Any additional details..."
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={addCustomParameter}
                      disabled={!customParam.name.trim()}
                      className="flex-1 px-4 py-2 text-white apple-caption font-medium rounded-lg apple-transition"
                      style={{ background: !customParam.name.trim() ? 'rgba(168, 85, 247, 0.5)' : 'var(--apple-purple)' }}
                    >
                      Add Parameter
                    </button>
                    <button
                      onClick={() => setShowAddCustom(false)}
                      className="px-4 py-2 text-gray-600 apple-caption rounded-lg hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-between space-x-4 p-6 border-t border-gray-200/50" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-gray-700 apple-caption font-medium rounded-lg hover:bg-gray-100 apple-transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selectedParams.values()))}
            disabled={selectedParams.size === 0}
            className="flex-1 px-6 py-3 text-white apple-caption font-medium rounded-lg apple-transition"
            style={{ background: selectedParams.size === 0 ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
          >
            Start Monitoring ({selectedParams.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
}