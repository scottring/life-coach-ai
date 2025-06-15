import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  CalendarEvent, 
  WeeklySchedule, 
  SOPSchedulingRequest, 
  SchedulingConflict,
  CalendarDay,
  CalendarWeek,
  TimeSlot,
  DragOperation 
} from '../types/calendar';
import { SOP } from '../types/sop';
import { sopService } from './sopService';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date();
};

// Time utilities
const generateTimeSlots = (startTime: string, endTime: string, duration: number = 15): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  let current = new Date(start);
  while (current < end) {
    const timeString = current.toTimeString().slice(0, 5);
    slots.push({ time: timeString, duration });
    current.setMinutes(current.getMinutes() + duration);
  }
  
  return slots;
};

const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, mins + minutes);
  return date.toTimeString().slice(0, 5);
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const getWeekDates = (weekStart: string): string[] => {
  const dates: string[] = [];
  const startDate = new Date(weekStart);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
};

export const calendarService = {
  // Create a calendar event
  async createEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    // Filter out undefined values for Firestore
    const cleanedEventData = Object.fromEntries(
      Object.entries(eventData).filter(([_, value]) => value !== undefined)
    );
    
    const docData = {
      ...cleanedEventData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const eventRef = await addDoc(collection(db, 'calendar_events'), docData);
    
    return {
      id: eventRef.id,
      ...eventData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  // Get events for a date range
  async getEventsForDateRange(
    contextId: string, 
    startDate: string, 
    endDate: string
  ): Promise<CalendarEvent[]> {
    const eventsQuery = query(
      collection(db, 'calendar_events'),
      where('contextId', '==', contextId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const snapshot = await getDocs(eventsQuery);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        contextId: data.contextId,
        type: data.type,
        title: data.title,
        description: data.description,
        color: data.color,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        assignedTo: data.assignedTo,
        assignedBy: data.assignedBy,
        status: data.status,
        sopId: data.sopId,
        googleEventId: data.googleEventId,
        mealId: data.mealId,
        taskId: data.taskId,
        isDraggable: data.isDraggable ?? true,
        isResizable: data.isResizable ?? true,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        createdBy: data.createdBy
      };
    });

    // Sort in JavaScript instead of database
    return events.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  },

  // Get events for a specific week
  async getWeeklyEvents(contextId: string, weekStart: string): Promise<CalendarEvent[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    
    return this.getEventsForDateRange(contextId, weekStart, weekEndStr);
  },

  // Schedule an SOP
  async scheduleSOPEvent(
    contextId: string,
    sop: SOP,
    request: SOPSchedulingRequest,
    createdBy: string
  ): Promise<CalendarEvent> {
    // Calculate end time
    const endTime = addMinutesToTime(request.preferredTime || '09:00', sop.estimatedDuration);
    
    const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      contextId,
      type: 'sop',
      title: sop.name,
      description: sop.description,
      color: sopService.getCategoryColor(sop.category),
      date: request.preferredDate || new Date().toISOString().split('T')[0],
      startTime: request.preferredTime || '09:00',
      endTime,
      duration: sop.estimatedDuration,
      ...(request.assignedTo && { assignedTo: request.assignedTo }),
      ...(sop.defaultAssignee && !request.assignedTo && { assignedTo: sop.defaultAssignee }),
      assignedBy: createdBy,
      status: 'scheduled',
      sopId: sop.id,
      isDraggable: true,
      isResizable: true,
      createdBy
    };
    
    return this.createEvent(eventData);
  },

  // Check for scheduling conflicts
  async checkConflicts(
    contextId: string,
    date: string,
    startTime: string,
    duration: number,
    assignedTo?: string,
    excludeEventId?: string
  ): Promise<SchedulingConflict | null> {
    const events = await this.getEventsForDateRange(contextId, date, date);
    const endTime = addMinutesToTime(startTime, duration);
    
    const conflictingEvents = events.filter(event => {
      if (excludeEventId && event.id === excludeEventId) return false;
      if (assignedTo && event.assignedTo && event.assignedTo !== assignedTo) return false;
      
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      const requestStart = timeToMinutes(startTime);
      const requestEnd = timeToMinutes(endTime);
      
      // Check for overlap
      return (requestStart < eventEnd && requestEnd > eventStart);
    });
    
    if (conflictingEvents.length === 0) return null;
    
    // Generate suggestions
    const suggestions = [];
    
    // Try different times on the same day
    const timeSlots = generateTimeSlots('05:00', '22:00', 15);
    for (const slot of timeSlots) {
      const slotEnd = addMinutesToTime(slot.time, duration);
      const slotConflicts = events.filter(event => {
        if (assignedTo && event.assignedTo && event.assignedTo !== assignedTo) return false;
        
        const eventStart = timeToMinutes(event.startTime);
        const eventEnd = timeToMinutes(event.endTime);
        const slotStart = timeToMinutes(slot.time);
        const slotEndMins = timeToMinutes(slotEnd);
        
        return (slotStart < eventEnd && slotEndMins > eventStart);
      });
      
      if (slotConflicts.length === 0) {
        suggestions.push({
          alternativeTime: slot.time,
          alternativeDate: date
        });
        if (suggestions.length >= 3) break;
      }
    }
    
    // Try next day if no time slots available
    if (suggestions.length === 0) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      
      suggestions.push({
        alternativeTime: startTime,
        alternativeDate: nextDayStr
      });
    }
    
    return {
      targetSlot: { date, time: startTime },
      conflictingEvents,
      suggestions
    };
  },

  // Handle drag and drop operation
  async handleDragOperation(operation: DragOperation): Promise<CalendarEvent> {
    const event = await this.getEventById(operation.eventId);
    if (!event) throw new Error('Event not found');
    
    // Check for conflicts at new location
    const conflicts = await this.checkConflicts(
      event.contextId,
      operation.targetDate,
      operation.targetTime,
      operation.newDuration || event.duration,
      event.assignedTo,
      event.id
    );
    
    if (conflicts) {
      throw new Error(`Scheduling conflict detected with ${conflicts.conflictingEvents.length} events`);
    }
    
    // Calculate new end time
    const newEndTime = addMinutesToTime(
      operation.targetTime, 
      operation.newDuration || event.duration
    );
    
    // Update the event
    const updates: Partial<CalendarEvent> = {
      date: operation.targetDate,
      startTime: operation.targetTime,
      endTime: newEndTime,
      duration: operation.newDuration || event.duration
    };
    
    await this.updateEvent(event.id, updates);
    
    return { ...event, ...updates };
  },

  // Get event by ID
  async getEventById(eventId: string): Promise<CalendarEvent | null> {
    const eventDoc = await getDoc(doc(db, 'calendar_events', eventId));
    
    if (!eventDoc.exists()) return null;
    
    const data = eventDoc.data();
    return {
      id: eventDoc.id,
      contextId: data.contextId,
      type: data.type,
      title: data.title,
      description: data.description,
      color: data.color,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      assignedTo: data.assignedTo,
      assignedBy: data.assignedBy,
      status: data.status,
      sopId: data.sopId,
      googleEventId: data.googleEventId,
      mealId: data.mealId,
      taskId: data.taskId,
      isDraggable: data.isDraggable ?? true,
      isResizable: data.isResizable ?? true,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      createdBy: data.createdBy
    };
  },

  // Update an event
  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    // Filter out undefined values for Firestore
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    const eventRef = doc(db, 'calendar_events', eventId);
    await updateDoc(eventRef, {
      ...cleanedUpdates,
      updatedAt: serverTimestamp()
    });
  },

  // Delete an event
  async deleteEvent(eventId: string): Promise<void> {
    await deleteDoc(doc(db, 'calendar_events', eventId));
  },

  // Generate calendar week view
  generateCalendarWeek(
    weekStart: string,
    events: CalendarEvent[],
    workingHours: { start: string; end: string } = { start: '05:00', end: '22:00' }
  ): CalendarWeek {
    const weekDates = getWeekDates(weekStart);
    const today = new Date().toISOString().split('T')[0];
    
    const days: CalendarDay[] = weekDates.map(date => {
      const dayEvents = events.filter(event => event.date === date);
      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        date,
        dayName: dayNames[dayOfWeek],
        isToday: date === today,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        events: dayEvents,
        timeSlots: generateTimeSlots(workingHours.start, workingHours.end, 15)
      };
    });
    
    const totalEvents = events.length;
    const totalDuration = events.reduce((sum, event) => sum + event.duration, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    return {
      weekStart,
      weekEnd: weekEnd.toISOString().split('T')[0],
      days,
      totalEvents,
      totalDuration
    };
  },

  // Utilities
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  generateTimeSlots
};