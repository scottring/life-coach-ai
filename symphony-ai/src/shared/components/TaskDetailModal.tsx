import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { taskManager } from '../services/taskManagerService';
import { contextService } from '../services/contextService';
import { ContextMember } from '../types/context';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  contextId?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'event' | 'sop' | 'meal' | 'project' | 'note';
  context: 'work' | 'family' | 'personal';
  assignedTo?: string;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, event, contextId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isAddingSubStep, setIsAddingSubStep] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editedStartTime, setEditedStartTime] = useState('');
  const [editedEndTime, setEditedEndTime] = useState('');
  const [newSubStepTitle, setNewSubStepTitle] = useState('');
  const [newSubStepDescription, setNewSubStepDescription] = useState('');
  const [contextMembers, setContextMembers] = useState<ContextMember[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // Load context members when modal opens
  useEffect(() => {
    const loadContextMembers = async () => {
      if (contextId && isOpen) {
        try {
          const members = await contextService.getContextMembers(contextId);
          setContextMembers(members);
        } catch (error) {
          console.error('Error loading context members:', error);
        }
      }
    };

    loadContextMembers();
  }, [contextId, isOpen]);

  if (!isOpen || !event) return null;

  // Get the actual task from task manager for full data
  const task = taskManager.getTask(event.id);
  const currentNotes = task?.notes || '';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDuration = () => {
    const durationMs = event.end.getTime() - event.start.getTime();
    const minutes = Math.round(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return '✅';
      case 'event': return '📅';
      case 'meal': return '🍽️';
      case 'sop': return '📋';
      default: return '📝';
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'work': return 'bg-green-100 text-green-800 border-green-200';
      case 'family': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'personal': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleStartEdit = () => {
    setEditedTitle(event.title);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedTitle.trim() && editedTitle !== event.title) {
      taskManager.updateTask(event.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
    setEditedTitle('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle('');
  };

  const handleStartAddNote = () => {
    setNewNote(currentNotes);
    setIsAddingNote(true);
  };

  const handleSaveNote = () => {
    taskManager.updateTask(event.id, { notes: newNote });
    setIsAddingNote(false);
    setNewNote('');
  };

  const handleCancelNote = () => {
    setIsAddingNote(false);
    setNewNote('');
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      taskManager.deleteTask(event.id);
      onClose();
    }
  };

  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5); // HH:MM format
  };

  const handleStartEditTime = () => {
    setEditedStartTime(formatTimeForInput(event.start));
    setEditedEndTime(formatTimeForInput(event.end));
    setIsEditingTime(true);
  };

  const handleSaveTime = () => {
    const [startHours, startMinutes] = editedStartTime.split(':').map(Number);
    const [endHours, endMinutes] = editedEndTime.split(':').map(Number);
    
    const newStart = new Date(event.start);
    newStart.setHours(startHours, startMinutes, 0, 0);
    
    const newEnd = new Date(event.end);
    newEnd.setHours(endHours, endMinutes, 0, 0);
    
    // Update the task with new scheduling
    taskManager.scheduleTask(event.id, newStart, editedStartTime);
    setIsEditingTime(false);
  };

  const handleCancelEditTime = () => {
    setIsEditingTime(false);
    setEditedStartTime('');
    setEditedEndTime('');
  };

  const handleStartAddSubStep = () => {
    setNewSubStepTitle('');
    setNewSubStepDescription('');
    setIsAddingSubStep(true);
  };

  const handleSaveSubStep = async () => {
    if (newSubStepTitle.trim()) {
      await taskManager.addSubStep(event.id, {
        title: newSubStepTitle.trim(),
        description: newSubStepDescription.trim() || undefined
      });
      setIsAddingSubStep(false);
      setNewSubStepTitle('');
      setNewSubStepDescription('');
    }
  };

  const handleCancelSubStep = () => {
    setIsAddingSubStep(false);
    setNewSubStepTitle('');
    setNewSubStepDescription('');
  };

  const handleToggleSubStep = async (subStepId: string, isCompleted: boolean) => {
    await taskManager.updateSubStep(event.id, subStepId, { isCompleted });
  };

  const handleDeleteSubStep = async (subStepId: string) => {
    if (window.confirm('Are you sure you want to delete this sub-step?')) {
      await taskManager.deleteSubStep(event.id, subStepId);
    }
  };

  const handleStartSharing = () => {
    setSelectedAssignee(event.assignedTo || '');
    setIsSharing(true);
  };

  const handleSaveAssignment = async () => {
    if (selectedAssignee !== event.assignedTo) {
      await taskManager.updateTask(event.id, { assignedTo: selectedAssignee || undefined });
    }
    setIsSharing(false);
  };

  const handleCancelSharing = () => {
    setIsSharing(false);
    setSelectedAssignee('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTypeIcon(event.type)}</span>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-xl font-semibold text-gray-900 w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getContextColor(event.context)}`}>
                      {event.context}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">{event.type}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Scheduling Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Date</p>
                <p className="text-sm text-gray-600">{formatDate(event.start)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <ClockIcon className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Time</p>
                {isEditingTime ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex space-x-2 items-center">
                      <input
                        type="time"
                        value={editedStartTime}
                        onChange={(e) => setEditedStartTime(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <input
                        type="time"
                        value={editedEndTime}
                        onChange={(e) => setEditedEndTime(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveTime}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEditTime}
                        className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {formatTime(event.start)} - {formatTime(event.end)} ({getDuration()})
                    </p>
                    <button
                      onClick={handleStartEditTime}
                      className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Assignment & Sharing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Assignment</h3>
              {contextMembers.length > 0 && !isSharing && (
                <button 
                  onClick={handleStartSharing}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors flex items-center space-x-1"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Assign</span>
                </button>
              )}
            </div>

            {isSharing ? (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Assign to family member:
                  </label>
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {contextMembers.map(member => (
                      <option key={member.id} value={member.userId}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveAssignment}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Save Assignment
                    </button>
                    <button
                      onClick={handleCancelSharing}
                      className="border border-gray-300 bg-white text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {event.assignedTo ? 'Assigned To' : 'Assignment'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {event.assignedTo ? 
                      contextMembers.find(m => m.userId === event.assignedTo)?.displayName || event.assignedTo :
                      'Unassigned'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notes Section */}
          {(currentNotes || isAddingNote) && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Notes</h3>
              {isAddingNote ? (
                <div className="space-y-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add notes for this task..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveNote}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Note
                    </button>
                    <button
                      onClick={handleCancelNote}
                      className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* SOP Sub-steps (if applicable) */}
          {event.type === 'sop' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Sub-steps</h3>
                {!isAddingSubStep && (
                  <button 
                    onClick={handleStartAddSubStep}
                    className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    + Add Sub-step
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {/* Add Sub-step Form */}
                {isAddingSubStep && (
                  <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Sub-step title..."
                        value={newSubStepTitle}
                        onChange={(e) => setNewSubStepTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <textarea
                        placeholder="Description (optional)..."
                        value={newSubStepDescription}
                        onChange={(e) => setNewSubStepDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveSubStep}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={handleCancelSubStep}
                          className="border border-gray-300 bg-white text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Sub-steps */}
                {task?.subSteps && task.subSteps.length > 0 ? (
                  task.subSteps.map((subStep, index) => (
                    <div key={subStep.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={subStep.isCompleted}
                        onChange={(e) => handleToggleSubStep(subStep.id, e.target.checked)}
                        className="mt-1 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${subStep.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {subStep.title}
                        </p>
                        {subStep.description && (
                          <p className="text-xs text-gray-600 mt-1">{subStep.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSubStep(subStep.id)}
                        className="text-gray-400 hover:text-red-600 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : !isAddingSubStep ? (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No sub-steps added yet</p>
                    <p className="text-xs text-gray-400">Click "Add Sub-step" to break this task into smaller steps</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            {!isEditing && !isAddingNote && (
              <>
                <button 
                  onClick={handleStartEdit}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                
                <button 
                  onClick={handleStartAddNote}
                  className="flex items-center space-x-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4" />
                  <span>{currentNotes ? 'Edit Note' : 'Add Note'}</span>
                </button>
                
                <button className="flex items-center space-x-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <TagIcon className="w-4 h-4" />
                  <span>Add Tags</span>
                </button>
                
                <button 
                  onClick={handleDelete}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};