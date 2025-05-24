import React, { useState, useEffect } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { 
  DocumentArrowUpIcon, 
  LinkIcon, 
  TrashIcon, 
  PlusIcon, 
  CalendarIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  GiftIcon, 
  ShoppingBagIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';
import { useTravelAI } from '../hooks/useTravelAI';
import { useTasks } from '../providers/TaskProvider';

function TravelEvent({ event, onUpdate, onGenerateTasks }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [preparationTasks, setPreparationTasks] = useState([]);
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('link');
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [eventDetails, setEventDetails] = useState(event || {});
  const { generateEventPreparation, isProcessing } = useTravelAI();
  const { createTask } = useTasks();
  
  useEffect(() => {
    if (event?.id) {
      loadEventDocuments();
      loadPreparationTasks();
    }
  }, [event?.id]);

  const loadEventDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('event_documents')
        .select('*')
        .eq('event_id', event.id);
      
      if (error) {
        if (error.code === '42P01') {
          console.log('Event documents table not yet created');
          setDocuments([]);
          return;
        }
        throw error;
      }
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };
  
  const loadPreparationTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('event_prep_tasks')
        .select('*')
        .eq('event_id', event.id)
        .order('due_date', { ascending: true });
      
      if (error) {
        if (error.code === '42P01') {
          console.log('Event prep tasks table not yet created');
          setPreparationTasks([]);
          return;
        }
        throw error;
      }
      setPreparationTasks(data || []);
    } catch (error) {
      console.error('Error loading prep tasks:', error);
      setPreparationTasks([]);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocUrl || !newDocName) return;

    const newDoc = {
      event_id: event.id,
      user_id: event.user_id,
      document_type: newDocType,
      document_name: newDocName,
      external_link: newDocType === 'link' ? newDocUrl : null,
      file_url: newDocType === 'file' ? newDocUrl : null
    };

    try {
      const { data, error } = await supabase
        .from('event_documents')
        .insert(newDoc)
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          alert('Database tables not yet created. Please contact support.');
          return;
        }
        throw error;
      }

      setDocuments([...documents, data]);
      setNewDocUrl('');
      setNewDocName('');
      setNewDocType('link');
      setShowAddDoc(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      const { error } = await supabase
        .from('event_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== docId));
      onUpdate();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const generateWeddingTasks = async () => {
    const daysUntilEvent = differenceInDays(new Date(event.event_date), new Date());
    
    const weddingTasks = [
      {
        title: 'Purchase or rent tuxedo',
        description: 'Get fitted for formal attire - allow time for alterations',
        priority: 4,
        deadline: addDays(new Date(), Math.max(1, daysUntilEvent - 30)),
        context: 'Travel',
        tags: ['wedding', 'attire']
      },
      {
        title: 'Select wedding gift',
        description: 'Choose and purchase appropriate wedding gift from registry',
        priority: 3,
        deadline: addDays(new Date(), Math.max(1, daysUntilEvent - 14)),
        context: 'Travel',
        tags: ['wedding', 'gift']
      },
      {
        title: 'Schedule grooming appointments',
        description: 'Book haircut, any other grooming needs before the wedding',
        priority: 2,
        deadline: addDays(new Date(), Math.max(1, daysUntilEvent - 7)),
        context: 'Personal',
        tags: ['wedding', 'grooming']
      },
      {
        title: 'Plan transportation to venue',
        description: 'Arrange transportation from hotel to wedding venue',
        priority: 4,
        deadline: addDays(new Date(), Math.max(1, daysUntilEvent - 3)),
        context: 'Travel',
        tags: ['wedding', 'logistics']
      },
      {
        title: "Research local customs and etiquette",
        description: 'Learn about French wedding traditions and appropriate behavior',
        priority: 2,
        deadline: addDays(new Date(), Math.max(1, daysUntilEvent - 10)),
        context: 'Personal',
        tags: ['wedding', 'culture']
      },
      {
        title: "Wife's formal dress selection",
        description: 'Choose and prepare formal dress, shoes, and accessories',
        priority: 4,
        deadline: addDays(new Date(), Math.max(1, daysUntilEvent - 21)),
        context: 'Travel',
        tags: ['wedding', 'attire']
      }
    ];
    
    // Create tasks in the system
    for (const taskData of weddingTasks) {
      await createTask(taskData);
      
      // Also create event-specific prep tasks
      await supabase.from('event_prep_tasks').insert({
        event_id: event.id,
        task_category: taskData.tags[1],
        task_description: taskData.title,
        due_date: taskData.deadline,
        ai_generated: true
      });
    }
    
    loadPreparationTasks();
  };

  const generateAIPreparationTasks = async () => {
    try {
      const attendees = event.attendees || ['You', 'Your wife'];
      const result = await generateEventPreparation({
        name: event.event_name,
        type: event.event_type,
        date: event.event_date,
        venue: event.venue_name,
        dressCode: event.dress_code,
        specialRequirements: event.event_details?.requirements
      }, attendees.map(name => ({ name, role: 'guest' })));
      
      // Convert AI suggestions to tasks
      if (result.categories) {
        for (const [category, tasks] of Object.entries(result.categories)) {
          for (const task of tasks) {
            await createTask({
              title: task.title,
              description: task.description,
              priority: task.priority || 3,
              deadline: addDays(new Date(event.event_date), -(task.daysBefore || 7)),
              context: 'Travel',
              tags: [event.event_type, category]
            });
          }
        }
      }
    } catch (error) {
      console.error('Error generating AI tasks:', error);
      // Fallback to predefined tasks for wedding
      if (event.event_type === 'wedding') {
        await generateWeddingTasks();
      }
    }
  };

  const toggleTaskCompletion = async (taskId, isCompleted) => {
    try {
      const { error } = await supabase
        .from('event_prep_tasks')
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      loadPreparationTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getEventTypeIcon = (type) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case 'wedding': return <GiftIcon className={iconClass} />;
      case 'conference': return <DocumentArrowUpIcon className={iconClass} />;
      case 'dinner': return <UserGroupIcon className={iconClass} />;
      default: return <CalendarIcon className={iconClass} />;
    }
  };

  const getDocumentIcon = (docType) => {
    const iconClass = "h-4 w-4";
    switch (docType) {
      case 'invitation': return <GiftIcon className={iconClass} />;
      case 'boarding_pass': return <DocumentArrowUpIcon className={iconClass} />;
      case 'itinerary': return <ClockIcon className={iconClass} />;
      default: return <DocumentArrowUpIcon className={iconClass} />;
    }
  };

  const daysUntilEvent = differenceInDays(new Date(event.event_date), new Date());
  const urgencyLevel = daysUntilEvent <= 7 ? 'urgent' : daysUntilEvent <= 30 ? 'moderate' : 'normal';

  return (
    <div className={`rounded-lg border bg-white p-6 shadow-sm transition-all ${
      urgencyLevel === 'urgent' ? 'border-red-300 bg-red-50' :
      urgencyLevel === 'moderate' ? 'border-yellow-300 bg-yellow-50' :
      'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 mb-2">
            {getEventTypeIcon(event.event_type)}
            <h3 className="text-lg font-semibold text-gray-900">{event.event_name}</h3>
            {urgencyLevel === 'urgent' && (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {format(new Date(event.event_date), 'MMM d, yyyy')}
            </span>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
              urgencyLevel === 'urgent' ? 'bg-red-100 text-red-800' :
              urgencyLevel === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {daysUntilEvent} days away
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {event.event_type.replace('_', ' ')}
            </span>
            {event.dress_code && (
              <span className="text-xs">Dress: {event.dress_code}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={event.event_type === 'wedding' ? generateWeddingTasks : generateAIPreparationTasks}
            disabled={isProcessing}
            className="flex items-center gap-1 rounded bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4" />
            {isProcessing ? 'Generating...' : 'AI Prep Tasks'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Event Details */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="mb-3 font-medium text-gray-900">Event Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {event.venue_name && (
                <div>
                  <span className="font-medium">Venue:</span> {event.venue_name}
                </div>
              )}
              {event.venue_address && (
                <div>
                  <span className="font-medium">Address:</span> {event.venue_address}
                </div>
              )}
              {event.dress_code && (
                <div>
                  <span className="font-medium">Dress Code:</span> {event.dress_code}
                </div>
              )}
              {event.website_url && (
                <div>
                  <a
                    href={event.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Event Website
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Preparation Timeline */}
          {preparationTasks.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 font-medium text-gray-900">Preparation Timeline</h4>
              <div className="space-y-2">
                {preparationTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 rounded bg-white p-3">
                    <button
                      onClick={() => toggleTaskCompletion(task.id, !task.is_completed)}
                      className={`rounded-full p-1 ${
                        task.is_completed 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </button>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        task.is_completed ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}>
                        {task.task_description}
                      </div>
                      {task.due_date && (
                        <div className="text-xs text-gray-500">
                          Due: {format(new Date(task.due_date), 'MMM d')}
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      task.task_category === 'attire' ? 'bg-purple-100 text-purple-800' :
                      task.task_category === 'gift' ? 'bg-green-100 text-green-800' :
                      task.task_category === 'logistics' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.task_category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents & Links */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Documents & Links</h4>
              <button
                onClick={() => setShowAddDoc(!showAddDoc)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {showAddDoc && (
              <div className="mb-4 space-y-3 rounded bg-white p-3">
                <div className="flex gap-2">
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="rounded-md border-gray-300 text-sm"
                  >
                    <option value="link">Link</option>
                    <option value="invitation">Invitation</option>
                    <option value="boarding_pass">Boarding Pass</option>
                    <option value="itinerary">Itinerary</option>
                    <option value="confirmation">Confirmation</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Document name"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="URL or file path"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 text-sm"
                  />
                  <button
                    onClick={handleAddDocument}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between rounded bg-white p-3">
                  <a
                    href={doc.external_link || doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    {getDocumentIcon(doc.document_type)}
                    {doc.document_name}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      {doc.document_type.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-sm text-gray-500">No documents added yet</p>
              )}
            </div>
          </div>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 font-medium text-gray-900">Who's Going</h4>
              <div className="flex flex-wrap gap-2">
                {event.attendees.map((attendee, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800"
                  >
                    <UserGroupIcon className="h-3 w-3" />
                    {attendee}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TravelEvent;