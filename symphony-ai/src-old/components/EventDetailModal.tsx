import React, { useState, useEffect } from 'react';
import { 
  ClockIcon,
  UserIcon,
  CubeIcon,
  CalendarDaysIcon,
  TagIcon,
  PlayIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Modal from './common/Modal';
import { CalendarEvent } from '../types/calendar';
import { SOP, SOPStep } from '../types/sop';
import { ContextMember } from '../types/context';
import { sopService } from '../services/sopService';
import { contextService } from '../services/contextService';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  onExecuteEvent?: (event: CalendarEvent) => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onEditEvent,
  onDeleteEvent,
  onExecuteEvent
}) => {
  const [sop, setSOP] = useState<SOP | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<SOPStep[]>([]);
  const [members, setMembers] = useState<ContextMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpandedView, setShowExpandedView] = useState(false);

  useEffect(() => {
    if (isOpen && event.sopId) {
      loadEventDetails();
    }
  }, [isOpen, event.sopId]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      
      const [sopData, membersData] = await Promise.all([
        sopService.getSOPById(event.sopId!),
        contextService.getContextMembers(event.contextId)
      ]);
      
      setSOP(sopData);
      setMembers(membersData);
      
      if (sopData) {
        const expanded = await sopService.getExpandedSteps(sopData.id);
        setExpandedSteps(expanded);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.userId === memberId);
    return member?.displayName || 'Unknown';
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStepsList = (steps: SOPStep[], isExpanded = false) => {
    return (
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`border rounded-lg p-4 ${
              step.isEmbedded ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {isExpanded ? `${index + 1}.` : `Step ${step.stepNumber}`}
                  </span>
                  {step.isEmbedded && (
                    <span className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      <CubeIcon className="w-3 h-3" />
                      <span>From Embedded SOP</span>
                    </span>
                  )}
                  {step.isOptional && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  )}
                </div>
                
                <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
                {step.description && (
                  <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                )}
                
                {step.type === 'list' && step.listItems && step.listItems.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-3 mb-2">
                    <div className="space-y-1">
                      {step.listItems.map((item, itemIndex) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{itemIndex + 1}.</span>
                          <span className={`text-sm ${item.isOptional ? 'text-gray-500 italic' : 'text-gray-700'}`}>
                            {item.text}
                            {item.isOptional && <span className="ml-1 text-xs">(optional)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>{step.estimatedDuration} min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Event Details">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Event Details">
      <div className="space-y-6">
        {/* Event Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
              {event.description && (
                <p className="text-gray-600">{event.description}</p>
              )}
            </div>
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: event.color }}
              title={`${event.type} event`}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
              <span>{formatDate(event.date)}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            
            {event.assignedTo && (
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span>Assigned to: {getMemberName(event.assignedTo)}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <TagIcon className="w-4 h-4 text-gray-400" />
              <span>Duration: {event.duration} minutes</span>
            </div>
          </div>
        </div>

        {/* SOP Information */}
        {sop && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Standard Operating Procedure</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(sop.difficulty)}`}>
                  {sop.difficulty}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 font-medium">{sop.category}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Steps:</span>
                  <span className="ml-2 font-medium">{sop.steps.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Estimated Duration:</span>
                  <span className="ml-2 font-medium">{sop.estimatedDuration} minutes</span>
                </div>
                <div>
                  <span className="text-gray-500">Version:</span>
                  <span className="ml-2 font-medium">v{sop.version}</span>
                </div>
              </div>
              
              {sop.tags.length > 0 && (
                <div className="mt-3">
                  <span className="text-gray-500 text-sm">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sop.tags.map(tag => (
                      <span key={tag} className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Steps View Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Procedure Steps</h3>
              {expandedSteps.length > sop.steps.length && (
                <button
                  onClick={() => setShowExpandedView(!showExpandedView)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <CubeIcon className="w-4 h-4" />
                  <span>{showExpandedView ? 'Show Collapsed' : 'Show Expanded'}</span>
                  <ArrowRightIcon className={`w-3 h-3 transition-transform ${showExpandedView ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>

            {/* Steps List */}
            {showExpandedView ? (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <CubeIcon className="w-4 h-4" />
                    <span>Expanded view showing all embedded SOP steps</span>
                  </div>
                </div>
                {renderStepsList(expandedSteps, true)}
              </div>
            ) : (
              renderStepsList(sop.steps)
            )}

            {/* Embedded SOPs Summary */}
            {sop.embeddedSOPs && sop.embeddedSOPs.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Contains Embedded SOPs</h4>
                <p className="text-sm text-blue-700">
                  This procedure includes {sop.embeddedSOPs.length} embedded SOP(s). 
                  Click "Show Expanded" above to see all individual steps.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {onExecuteEvent && (
              <button
                onClick={() => onExecuteEvent(event)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <PlayIcon className="w-4 h-4" />
                <span>Execute Now</span>
              </button>
            )}
            
            {onEditEvent && (
              <button
                onClick={() => onEditEvent(event)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Edit Event
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {onDeleteEvent && (
              <button
                onClick={() => onDeleteEvent(event)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete Event
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EventDetailModal;