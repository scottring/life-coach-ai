import { supabase } from './supabaseClient';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export class DocumentPrepService {
  constructor() {
    this.preparedDocuments = new Map();
    this.preparationTimers = new Map();
  }

  // Main preparation method
  async prepareDocumentsForTask(task, prepTimeHours = 2) {
    const taskType = this.detectTaskType(task);
    const prepTime = new Date();
    prepTime.setHours(prepTime.getHours() + prepTimeHours);

    // Schedule document preparation
    if (new Date(task.deadline) > prepTime) {
      this.schedulePreparation(task, prepTime);
      return null;
    }

    // Prepare documents immediately
    return await this.prepareDocumentsByType(task, taskType);
  }

  // Detect task type based on title and description
  detectTaskType(task) {
    const text = `${task.title} ${task.description || ''}`.toLowerCase();
    
    if (text.includes('flight') || text.includes('airport') || text.includes('fly')) {
      return 'flight';
    } else if (text.includes('hotel') || text.includes('check-in') || text.includes('accommodation')) {
      return 'hotel';
    } else if (text.includes('meeting') || text.includes('conference') || text.includes('call')) {
      return 'meeting';
    } else if (text.includes('doctor') || text.includes('appointment') || text.includes('medical')) {
      return 'medical';
    } else if (text.includes('restaurant') || text.includes('dinner') || text.includes('lunch')) {
      return 'dining';
    }
    
    return 'general';
  }

  // Prepare documents based on task type
  async prepareDocumentsByType(task, taskType) {
    const documents = {
      taskId: task.id,
      taskType,
      preparedAt: new Date().toISOString(),
      documents: []
    };

    switch (taskType) {
      case 'flight':
        documents.documents = await this.prepareFlightDocuments(task);
        break;
      case 'hotel':
        documents.documents = await this.prepareHotelDocuments(task);
        break;
      case 'meeting':
        documents.documents = await this.prepareMeetingDocuments(task);
        break;
      case 'medical':
        documents.documents = await this.prepareMedicalDocuments(task);
        break;
      case 'dining':
        documents.documents = await this.prepareDiningDocuments(task);
        break;
      default:
        documents.documents = await this.prepareGeneralDocuments(task);
    }

    // Store prepared documents
    this.preparedDocuments.set(task.id, documents);
    await this.saveToDatabase(documents);

    return documents;
  }

  // Flight-specific document preparation
  async prepareFlightDocuments(task) {
    const docs = [];

    // Extract flight details from task
    const flightInfo = await this.extractFlightInfo(task);
    
    docs.push({
      type: 'boarding_pass',
      title: 'Boarding Pass',
      content: flightInfo.boardingPass || 'Check email for boarding pass',
      icon: '🎫'
    });

    docs.push({
      type: 'flight_status',
      title: 'Flight Status',
      content: flightInfo.status || 'On time',
      icon: '✈️'
    });

    // Weather at destination
    if (flightInfo.destination) {
      docs.push({
        type: 'weather',
        title: 'Destination Weather',
        content: await this.getWeatherInfo(flightInfo.destination),
        icon: '🌤️'
      });
    }

    // Transportation options
    docs.push({
      type: 'transport',
      title: 'Airport Transportation',
      content: 'Uber/Lyft available at terminal',
      icon: '🚗'
    });

    // Packing checklist
    docs.push({
      type: 'checklist',
      title: 'Travel Checklist',
      content: await this.generatePackingList(task),
      icon: '📋'
    });

    return docs;
  }

  // Meeting-specific document preparation
  async prepareMeetingDocuments(task) {
    const docs = [];

    // Meeting agenda
    docs.push({
      type: 'agenda',
      title: 'Meeting Agenda',
      content: await this.generateMeetingAgenda(task),
      icon: '📄'
    });

    // Previous meeting notes
    const previousNotes = await this.fetchPreviousMeetingNotes(task);
    if (previousNotes) {
      docs.push({
        type: 'notes',
        title: 'Previous Meeting Notes',
        content: previousNotes,
        icon: '📝'
      });
    }

    // Relevant files
    docs.push({
      type: 'files',
      title: 'Related Documents',
      content: 'View in cloud storage',
      icon: '📁'
    });

    return docs;
  }

  // Extract flight information using AI
  async extractFlightInfo(task) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract flight information from the task. Return JSON with: flightNumber, airline, departure, arrival, destination'
          },
          {
            role: 'user',
            content: `Task: ${task.title}\nDescription: ${task.description || ''}`
          }
        ],
        temperature: 0.1
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error extracting flight info:', error);
      return {};
    }
  }

  // Generate meeting agenda using AI
  async generateMeetingAgenda(task) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate a brief meeting agenda based on the task information. Keep it concise and professional.'
          },
          {
            role: 'user',
            content: `Task: ${task.title}\nDescription: ${task.description || ''}\nContext: ${task.context}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating agenda:', error);
      return 'Standard meeting agenda';
    }
  }

  // Generate packing list based on trip duration and destination
  async generatePackingList(task) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise packing checklist for travel. Include only essentials.'
          },
          {
            role: 'user',
            content: `Trip: ${task.title}\nDetails: ${task.description || ''}`
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating packing list:', error);
      return '• Passport/ID\n• Phone charger\n• Medications\n• Change of clothes\n• Toiletries';
    }
  }

  // Fetch weather information (placeholder)
  async getWeatherInfo(location) {
    // In production, this would call a weather API
    return `Partly cloudy, 72°F in ${location}`;
  }

  // Fetch previous meeting notes
  async fetchPreviousMeetingNotes(task) {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('content')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data?.content;
    } catch (error) {
      console.error('Error fetching previous notes:', error);
      return null;
    }
  }

  // Save prepared documents to database
  async saveToDatabase(documents) {
    try {
      const { error } = await supabase
        .from('prepared_documents')
        .upsert({
          task_id: documents.taskId,
          task_type: documents.taskType,
          documents: documents.documents,
          prepared_at: documents.preparedAt
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  }

  // Schedule document preparation
  schedulePreparation(task, prepTime) {
    const delay = prepTime.getTime() - Date.now();
    
    if (delay > 0) {
      const timerId = setTimeout(() => {
        this.prepareDocumentsByType(task, this.detectTaskType(task));
        this.preparationTimers.delete(task.id);
      }, delay);

      this.preparationTimers.set(task.id, timerId);
    }
  }

  // Get prepared documents for a task
  getPreparedDocuments(taskId) {
    return this.preparedDocuments.get(taskId);
  }

  // Clear all timers (cleanup)
  clearAllTimers() {
    for (const timerId of this.preparationTimers.values()) {
      clearTimeout(timerId);
    }
    this.preparationTimers.clear();
  }
}

// Create singleton instance
export const documentPrepService = new DocumentPrepService();