import React, { useState } from 'react';
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { taskManager } from '../services/taskManagerService';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
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

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, event }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [editedStartTime, setEditedStartTime] = useState('');
  const [editedEndTime, setEditedEndTime] = useState('');

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

          {/* Assignment */}
          {event.assignedTo && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <UserIcon className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Assigned To</p>
                <p className="text-sm text-gray-600">{event.assignedTo}</p>
              </div>
            </div>
          )}

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

          {/* SOP Steps (if applicable) */}
          {event.type === 'sop' && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900">Steps</h3>
              <div className="space-y-2">
                {/* Mock SOP steps - in real implementation, fetch from SOP service */}
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Prepare workspace</p>
                    <p className="text-xs text-gray-600">Clear desk and gather materials</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Review objectives</p>
                    <p className="text-xs text-gray-600">Check goals and requirements</p>
                  </div>
                </div>
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