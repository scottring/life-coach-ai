import React, { useState } from 'react';
import { XMarkIcon, HomeIcon } from '@heroicons/react/24/outline';
import { LeaveSessionLog } from '../types/dogBehavior';
import { DogBehaviorService } from '../services/dogBehaviorService';

interface ReturnHomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LeaveSessionLog;
  onSessionCompleted: () => void;
}

export default function ReturnHomeModal({ isOpen, onClose, session, onSessionCompleted }: ReturnHomeModalProps) {
  const defaultObservations: Required<NonNullable<LeaveSessionLog['returnObservations']>> = {
    barkingOccurred: false,
    barkingIntensity: 'none',
    barkingDuration: 0,
    barkingTimes: [],
    wasInCrate: false,
    crateCondition: 'clean',
    accidents: { occurred: false },
    destructiveBehavior: { occurred: false },
    foodWaterStatus: { foodFinished: false, waterFinished: false },
    overallMood: 'calm',
    notes: ''
  };

  const [observations, setObservations] = useState<Required<NonNullable<LeaveSessionLog['returnObservations']>>>(defaultObservations);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateObservations = (updates: Partial<Required<NonNullable<LeaveSessionLog['returnObservations']>>>) => {
    setObservations(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Complete Wyze monitoring first (analyzes event history)
      await DogBehaviorService.completeWyzeMonitoring(session.id, session.familyId);
      
      // Then save return observations
      await DogBehaviorService.completeLeaveSession(session.id, observations);
      
      onSessionCompleted();
      onClose();
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to save return observations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeAway = session.departureTime ? new Date().getTime() - session.departureTime.getTime() : 0;
  const hoursAway = Math.floor(timeAway / (1000 * 60 * 60));
  const minutesAway = Math.floor((timeAway % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full h-full flex flex-col" style={{ background: '#f5f5f7' }}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <div className="flex items-center">
            <HomeIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-green)' }} />
            <div>
              <h2 className="apple-title text-xl text-gray-800">Welcome Home!</h2>
              <p className="apple-caption text-gray-600">
                You were away for {hoursAway}h {minutesAway}m
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
            <XMarkIcon className="w-6 h-6 sf-icon" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'white' }}>
          <form onSubmit={handleSubmit} className="p-8 max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Departure Summary */}
            {session.departureParameters && session.departureParameters.length > 0 && (
              <div className="apple-card p-4" style={{ background: 'rgba(0, 122, 255, 0.05)' }}>
                <h3 className="apple-subtitle text-gray-800 mb-3">What You Did Before Leaving</h3>
                <div className="flex flex-wrap gap-2">
                  {session.departureParameters
                    .filter(param => param.isSelected)
                    .map(param => (
                      <span key={param.parameterId} className="inline-flex items-center px-3 py-1 rounded-full apple-caption"
                            style={{ background: 'rgba(0, 122, 255, 0.1)', color: 'var(--apple-blue)' }}>
                        {param.parameterName}
                        {param.quantity && param.quantity > 1 && (
                          <span className="ml-1 text-xs">×{param.quantity}</span>
                        )}
                      </span>
                    ))}
                </div>
              </div>
            )}
            {/* Barking Section */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="apple-subtitle text-gray-800 mb-3">Barking Behavior</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="barkingOccurred"
                    checked={observations?.barkingOccurred || false}
                    onChange={(e) => updateObservations({
                      barkingOccurred: e.target.checked,
                      barkingIntensity: e.target.checked ? observations.barkingIntensity || 'light' : 'none'
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <label htmlFor="barkingOccurred" className="apple-caption text-gray-800">
                    Barking occurred while away
                  </label>
                </div>

                {observations?.barkingOccurred && (
                  <>
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Barking Intensity</label>
                      <select
                        value={observations?.barkingIntensity || 'light'}
                        onChange={(e) => updateObservations({
                          barkingIntensity: e.target.value as any
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                      >
                        <option value="light">Light (occasional barks)</option>
                        <option value="moderate">Moderate (regular barking)</option>
                        <option value="heavy">Heavy (constant barking)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">
                        Estimated Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={observations?.barkingDuration || ''}
                        onChange={(e) => updateObservations({
                          barkingDuration: parseInt(e.target.value) || 0
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                        placeholder="e.g., 15"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Crate Section */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="apple-subtitle text-gray-800 mb-3">Crate Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="wasInCrate"
                    checked={observations?.wasInCrate || false}
                    onChange={(e) => updateObservations({
                      wasInCrate: e.target.checked
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <label htmlFor="wasInCrate" className="apple-caption text-gray-800">
                    Dog was in crate
                  </label>
                </div>

                {observations?.wasInCrate && (
                  <div>
                    <label className="block apple-caption text-gray-600 mb-2">Crate Condition</label>
                    <select
                      value={observations?.crateCondition || 'clean'}
                      onChange={(e) => updateObservations({
                        crateCondition: e.target.value as any
                      })}
                      className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                    >
                      <option value="clean">Clean</option>
                      <option value="minor_mess">Minor mess (water spilled, toys scattered)</option>
                      <option value="major_mess">Major mess (accidents, destroyed items)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Accidents Section */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="apple-subtitle text-gray-800 mb-3">Accidents</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="accidentsOccurred"
                    checked={observations?.accidents?.occurred || false}
                    onChange={(e) => updateObservations({
                      accidents: {
                        ...observations?.accidents,
                        occurred: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <label htmlFor="accidentsOccurred" className="apple-caption text-gray-800">
                    Accidents occurred
                  </label>
                </div>

                {observations?.accidents?.occurred && (
                  <>
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Type</label>
                      <select
                        value={observations?.accidents?.type || 'urine'}
                        onChange={(e) => updateObservations({
                          accidents: {
                            ...observations?.accidents,
                            occurred: true,
                            type: e.target.value as any
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                      >
                        <option value="urine">Urine</option>
                        <option value="feces">Feces</option>
                        <option value="both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Location</label>
                      <input
                        type="text"
                        value={observations?.accidents?.location || ''}
                        onChange={(e) => updateObservations({
                          accidents: {
                            ...observations?.accidents,
                            occurred: true,
                            location: e.target.value
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                        placeholder="e.g., kitchen, living room"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Destructive Behavior Section */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="apple-subtitle text-gray-800 mb-3">Destructive Behavior</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="destructiveOccurred"
                    checked={observations?.destructiveBehavior?.occurred || false}
                    onChange={(e) => updateObservations({
                      destructiveBehavior: {
                        ...observations?.destructiveBehavior,
                        occurred: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <label htmlFor="destructiveOccurred" className="apple-caption text-gray-800">
                    Destructive behavior occurred
                  </label>
                </div>

                {observations?.destructiveBehavior?.occurred && (
                  <>
                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Severity</label>
                      <select
                        value={observations?.destructiveBehavior?.severity || 'minor'}
                        onChange={(e) => updateObservations({
                          destructiveBehavior: {
                            ...observations?.destructiveBehavior,
                            occurred: true,
                            severity: e.target.value as any
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                      >
                        <option value="minor">Minor (small items, easily replaceable)</option>
                        <option value="moderate">Moderate (some damage, cleanup required)</option>
                        <option value="severe">Severe (significant damage, expensive replacement)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block apple-caption text-gray-600 mb-2">Description</label>
                      <textarea
                        value={observations?.destructiveBehavior?.description || ''}
                        onChange={(e) => updateObservations({
                          destructiveBehavior: {
                            ...observations?.destructiveBehavior,
                            occurred: true,
                            description: e.target.value
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
                        rows={2}
                        placeholder="Describe what was damaged..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Food & Water Section */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="apple-subtitle text-gray-800 mb-3">Food & Water</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="foodFinished"
                    checked={observations?.foodWaterStatus?.foodFinished || false}
                    onChange={(e) => updateObservations({
                      foodWaterStatus: {
                        ...observations?.foodWaterStatus,
                        foodFinished: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <label htmlFor="foodFinished" className="apple-caption text-gray-800">
                    Food finished
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="waterFinished"
                    checked={observations?.foodWaterStatus?.waterFinished || false}
                    onChange={(e) => updateObservations({
                      foodWaterStatus: {
                        ...observations?.foodWaterStatus,
                        waterFinished: e.target.checked
                      }
                    })}
                    className="h-4 w-4 rounded border-gray-300"
                    style={{ accentColor: 'var(--apple-blue)' }}
                  />
                  <label htmlFor="waterFinished" className="apple-caption text-gray-800">
                    Water finished
                  </label>
                </div>
              </div>
            </div>

            {/* Overall Mood Section */}
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <h3 className="apple-subtitle text-gray-800 mb-3">Overall Mood Upon Return</h3>
              
              <select
                value={observations?.overallMood || 'calm'}
                onChange={(e) => updateObservations({
                  overallMood: e.target.value as any
                })}
                className="w-full p-2 border border-gray-300 rounded-lg apple-caption"
              >
                <option value="calm">Calm (relaxed, normal greeting)</option>
                <option value="excited">Excited (happy, energetic greeting)</option>
                <option value="anxious">Anxious (stressed, panting, hiding)</option>
                <option value="destructive">Destructive (hyperactive, continued bad behavior)</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block apple-subtitle text-gray-800 mb-2">Additional Notes</label>
              <textarea
                value={observations?.notes || ''}
                onChange={(e) => updateObservations({
                  notes: e.target.value
                })}
                className="w-full p-3 border border-gray-300 rounded-lg apple-caption"
                rows={3}
                placeholder="Any other observations about your dog's behavior while you were away..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 apple-caption font-medium hover:bg-gray-100 rounded-lg apple-transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-white apple-caption font-medium rounded-lg apple-transition"
              style={{ background: isSubmitting ? 'rgba(52, 199, 89, 0.5)' : 'var(--apple-green)' }}
            >
              {isSubmitting ? 'Saving...' : 'Complete Session'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}