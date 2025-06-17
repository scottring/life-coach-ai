// src/services/dogBehaviorService.ts
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  limit, // Added limit import
} from 'firebase/firestore';
import { DogSOP, SOPLogEntry, SOPStep, LeaveSessionLog, DepartureParameterLog } from '../types/dogBehavior';
import { wyzeEventService } from './wyzeEventService';

const SOP_COLLECTION = 'dogSops';
const LOG_COLLECTION = 'dogSopLogs';
const SESSION_COLLECTION = 'dogLeaveSessions';

export const DogBehaviorService = {
  // Fetch all Standard Operating Procedures for a family, ordered by name
  async getSOPs(familyId: string): Promise<DogSOP[]> {
    try {
      // Remove orderBy for now to avoid index issues
      const q = query(
        collection(db, SOP_COLLECTION),
        where('familyId', '==', familyId)
      );
      const querySnapshot = await getDocs(q);
      const sops = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toDate(),
        updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
      })) as DogSOP[];

      // Sort by name in JavaScript instead of Firestore
      sops.sort((a, b) => a.name.localeCompare(b.name));

      // If no SOPs exist, create a default one
      if (sops.length === 0) {
        console.log('No SOPs found, creating default SOP...');
        await this.createDefaultSOP(familyId);
        // Retry the query
        const retryQuery = await getDocs(q);
        const retrySops = retryQuery.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
        })) as DogSOP[];
        
        // Sort the retry results too
        retrySops.sort((a, b) => a.name.localeCompare(b.name));
        return retrySops;
      }

      return sops;
    } catch (error) {
      console.error('Error in getSOPs:', error);
      if (error instanceof Error) {
        console.error('Error details:', (error as any).code, error.message);
      }
      throw error;
    }
  },

  // Create a default SOP for new families
  async createDefaultSOP(familyId: string): Promise<void> {
    const defaultSOP = {
      name: 'Leaving the House',
      description: 'Standard routine when leaving the dog home alone',
      steps: [
        { id: '1', description: 'Give Kong toy with treats' },
        { id: '2', description: 'Turn on white noise or calming music' },
        { id: '3', description: 'Take dog for bathroom break' },
        { id: '4', description: 'Ensure fresh water is available' },
        { id: '5', description: 'Say calm goodbye (no dramatic farewells)' }
      ]
    };

    await this.addSOP(familyId, defaultSOP);
  },

  // Add a new SOP
  async addSOP(familyId: string, sop: Omit<DogSOP, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newSopRef = await addDoc(collection(db, SOP_COLLECTION), {
      ...sop,
      familyId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return newSopRef.id;
  },

  // Log the execution of an SOP
  async logSOP(familyId: string, log: Omit<SOPLogEntry, 'id' | 'executedAt'>): Promise<string> {
    const newLogRef = await addDoc(collection(db, LOG_COLLECTION), {
      ...log,
      familyId,
      executedAt: Timestamp.now(),
    });
    return newLogRef.id;
  },

  // Fetch recent SOP log entries
  async getRecentLogs(familyId: string, count: number = 20): Promise<SOPLogEntry[]> {
    const q = query(
      collection(db, LOG_COLLECTION),
      where('familyId', '==', familyId),
      orderBy('executedAt', 'desc'),
      limit(count) // Correct usage of limit
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      executedAt: (doc.data().executedAt as Timestamp).toDate(),
    })) as SOPLogEntry[];
  },

  // Update an existing SOP
  async updateSOP(sopId: string, sopData: Partial<Omit<DogSOP, 'id' | 'createdAt' | 'familyId'>>): Promise<void> {
    const sopRef = doc(db, SOP_COLLECTION, sopId);
    await updateDoc(sopRef, {
      ...sopData,
      updatedAt: Timestamp.now(),
    });
  },

  // Session tracking methods
  async startLeaveSession(
    familyId: string, 
    userId: string, 
    userName: string, 
    departureParameters: DepartureParameterLog[] = [],
    departureSopLogId?: string
  ): Promise<string> {
    try {
      console.log('Creating session document with:', {
        familyId,
        userId,
        userName,
        departureParametersCount: departureParameters.length,
        departureSopLogId
      });

      if (!familyId || !userId) {
        throw new Error('Missing required parameters: familyId and userId are required');
      }

      if (!db) {
        throw new Error('Firebase database not initialized');
      }

      // Sanitize departure parameters to remove undefined values
      const sanitizedParameters = departureParameters.map(param => {
        const sanitized: any = {
          parameterId: param.parameterId,
          parameterName: param.parameterName,
          isSelected: param.isSelected
        };
        
        // Only add optional fields if they have valid values
        if (param.quantity !== undefined && param.quantity !== null) {
          sanitized.quantity = param.quantity;
        }
        if (param.notes !== undefined && param.notes !== null && param.notes.trim() !== '') {
          sanitized.notes = param.notes.trim();
        }
        
        return sanitized;
      });

      const sessionData: any = {
        familyId,
        departureTime: Timestamp.now(),
        isActive: true,
        departureParameters: sanitizedParameters,
        userId,
        userName,
        updatedAt: Timestamp.now(),
      };

      // Only add departureSopLogId if it has a valid value
      if (departureSopLogId && departureSopLogId.trim() !== '') {
        sessionData.departureSopLogId = departureSopLogId;
      }

      console.log('Adding document to collection:', SESSION_COLLECTION);
      const newSessionRef = await addDoc(collection(db, SESSION_COLLECTION), sessionData);
      console.log('Session document created with ID:', newSessionRef.id);
      
      // Start Wyze monitoring for the session
      await this.startWyzeMonitoring(newSessionRef.id, familyId);
      
      return newSessionRef.id;
    } catch (error) {
      console.error('Error in startLeaveSession:', error);
      throw error;
    }
  },

  async completeLeaveSession(sessionId: string, returnObservations: LeaveSessionLog['returnObservations']): Promise<void> {
    const sessionRef = doc(db, SESSION_COLLECTION, sessionId);
    await updateDoc(sessionRef, {
      returnTime: Timestamp.now(),
      isActive: false,
      returnObservations,
      updatedAt: Timestamp.now(),
    });
  },

  async getActiveSession(familyId: string): Promise<LeaveSessionLog | null> {
    try {
      const q = query(
        collection(db, SESSION_COLLECTION),
        where('familyId', '==', familyId),
        where('isActive', '==', true),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        departureTime: (doc.data().departureTime as Timestamp).toDate(),
        returnTime: doc.data().returnTime ? (doc.data().returnTime as Timestamp).toDate() : undefined,
        updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
      } as LeaveSessionLog;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null; // Return null instead of throwing error
    }
  },

  async getRecentSessions(familyId: string, count: number = 20): Promise<LeaveSessionLog[]> {
    const q = query(
      collection(db, SESSION_COLLECTION),
      where('familyId', '==', familyId),
      orderBy('departureTime', 'desc'),
      limit(count)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      departureTime: (doc.data().departureTime as Timestamp).toDate(),
      returnTime: doc.data().returnTime ? (doc.data().returnTime as Timestamp).toDate() : undefined,
      updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
    })) as LeaveSessionLog[];
  },

  // Wyze monitoring integration
  async startWyzeMonitoring(sessionId: string, familyId: string): Promise<void> {
    // Store session ID for Wyze monitoring correlation
    localStorage.setItem('active_monitoring_session', sessionId);
    
    try {
      // Start Wyze monitoring if configured
      if (wyzeEventService.isAuthenticated()) {
        console.log('Wyze service ready for monitoring');
      } else {
        console.log('Wyze not configured, monitoring will be skipped');
      }
    } catch (error) {
      console.error('Error starting Wyze monitoring:', error);
      // Continue without monitoring if Wyze fails
    }
  },

  async completeWyzeMonitoring(sessionId: string, familyId: string): Promise<void> {
    try {
      // Get the session to find departure time
      const sessionRef = doc(db, SESSION_COLLECTION, sessionId);
      const sessionDoc = await getDocs(query(collection(db, SESSION_COLLECTION), where('__name__', '==', sessionId)));
      
      if (sessionDoc.empty) {
        console.log('Session not found for Wyze monitoring completion');
        return;
      }
      
      const sessionData = sessionDoc.docs[0].data();
      const departureTime = (sessionData.departureTime as Timestamp).toDate();
      const returnTime = new Date();
      
      let wyzeAnalysis;
      
      if (wyzeEventService.isAuthenticated()) {
        // Get Wyze event history for the session period
        const storedDeviceMac = localStorage.getItem('wyze_device_mac');
        if (storedDeviceMac) {
          const eventHistory = await wyzeEventService.getEventHistory(
            storedDeviceMac,
            departureTime,
            returnTime
          );
          
          // Analyze the events for barking and motion
          wyzeAnalysis = await wyzeEventService.analyzeSessionEvents(
            eventHistory,
            sessionId,
            familyId,
            departureTime,
            returnTime
          );
        }
      }
      
      // If no Wyze data available, use empty analysis
      if (!wyzeAnalysis) {
        wyzeAnalysis = {
          barkEvents: [],
          motionEvents: [],
          totalBarkingMinutes: 0,
          averageLoudness: 0,
          totalMotionMinutes: 0,
          anxietyScore: 0,
          calmPeriods: [{ start: departureTime, end: returnTime }]
        };
      }
      
      // Update the session with monitoring data
      await updateDoc(sessionRef, {
        wyzeMonitoring: wyzeAnalysis,
        updatedAt: Timestamp.now(),
      });
      
      // Clear the active session
      localStorage.removeItem('active_monitoring_session');
    } catch (error) {
      console.error('Error completing Wyze monitoring:', error);
    }
  },

  // Helper methods for monitoring data processing
  calculateAnxietyScore(barkEvents: any[], motionEvents: any[]): number {
    let score = 0;
    
    // Barking contributes to anxiety (0-5 points)
    score += Math.min(barkEvents.length * 0.5, 5);
    
    // Motion intensity contributes (0-3 points)
    const totalMotionIntensity = motionEvents.reduce((sum, event) => sum + (event.intensity || 0.5), 0);
    score += Math.min(totalMotionIntensity * 0.1, 3);
    
    // Duration of events (0-2 points)
    const totalDuration = [...barkEvents, ...motionEvents].reduce((sum, event) => sum + (event.duration || 1), 0);
    score += Math.min(totalDuration * 0.01, 2);
    
    return Math.min(Math.round(score * 10) / 10, 10); // Cap at 10, round to 1 decimal
  },

  calculateCalmPeriods(barkEvents: any[], startTime: Date, endTime: Date): Array<{ start: Date; end: Date }> {
    if (barkEvents.length === 0) {
      return [{ start: startTime, end: endTime }];
    }

    const calmPeriods = [];
    const sortedEvents = barkEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let lastEventTime = startTime;
    
    sortedEvents.forEach(event => {
      const eventTime = new Date(event.timestamp);
      const gapMinutes = (eventTime.getTime() - lastEventTime.getTime()) / (1000 * 60);
      
      // Consider it a calm period if gap is 10+ minutes
      if (gapMinutes >= 10) {
        calmPeriods.push({
          start: lastEventTime,
          end: eventTime
        });
      }
      
      lastEventTime = eventTime;
    });
    
    // Check for calm period after last event
    const finalGapMinutes = (endTime.getTime() - lastEventTime.getTime()) / (1000 * 60);
    if (finalGapMinutes >= 10) {
      calmPeriods.push({
        start: lastEventTime,
        end: endTime
      });
    }
    
    return calmPeriods;
  },

  // Helper method to get session analytics
  async getSessionAnalytics(sessionId: string): Promise<{
    parameterEffectiveness: Record<string, number>;
    behaviorPatterns: any;
    recommendations: string[];
  }> {
    const sessionDoc = await getDocs(query(collection(db, SESSION_COLLECTION), where('__name__', '==', sessionId)));
    
    if (sessionDoc.empty) {
      return { parameterEffectiveness: {}, behaviorPatterns: {}, recommendations: [] };
    }

    const session = sessionDoc.docs[0].data() as LeaveSessionLog;
    const recommendations: string[] = [];

    // Analyze parameter effectiveness
    const parameterEffectiveness: Record<string, number> = {};
    
    if (session.wyzeMonitoring) {
      const { anxietyScore, totalBarkingMinutes, calmPeriods } = session.wyzeMonitoring;
      
      // Score parameters based on results (lower anxiety = better)
      const baseScore = Math.max(1, 11 - anxietyScore); // Invert anxiety score
      
      session.departureParameters.forEach(param => {
        if (param.isSelected) {
          parameterEffectiveness[param.parameterName] = baseScore;
        }
      });

      // Generate recommendations
      if (anxietyScore > 7) {
        recommendations.push('Consider additional comfort items like puzzle toys or calming music');
      }
      if (totalBarkingMinutes > 30) {
        recommendations.push('Try a longer pre-departure walk or additional exercise');
      }
      if (calmPeriods.length === 0) {
        recommendations.push('Consider anti-anxiety medication consultation with vet');
      }
    }

    return {
      parameterEffectiveness,
      behaviorPatterns: session.wyzeMonitoring || {},
      recommendations
    };
  },

  // Behavior index calculation
  calculateBehaviorIndex(session: LeaveSessionLog): number {
    if (!session.returnObservations) return 0;
    
    const observations = session.returnObservations;
    let score = 0;
    let maxScore = 3; // Three criteria: barking, staying still, no accidents
    
    // No barking = 1 point
    if (!observations.barkingOccurred) {
      score += 1;
    }
    
    // No accidents = 1 point  
    if (!observations.accidents?.occurred) {
      score += 1;
    }
    
    // No destructive behavior = 1 point (staying still/calm)
    if (!observations.destructiveBehavior?.occurred) {
      score += 1;
    }
    
    return Math.round((score / maxScore) * 100) / 100; // Return as decimal (0-1)
  },

  // Historical analytics for behavior trends
  async getHistoricalAnalytics(familyId: string, days: number = 30): Promise<{
    sessions: Array<{
      id: string;
      date: Date;
      behaviorIndex: number;
      duration?: number; // in minutes
      observations?: LeaveSessionLog['returnObservations'];
    }>;
    averageBehaviorIndex: number;
    totalSessions: number;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    try {
      // Get sessions from the last X days
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      
      const q = query(
        collection(db, SESSION_COLLECTION),
        where('familyId', '==', familyId),
        where('departureTime', '>=', Timestamp.fromDate(dateThreshold)),
        where('isActive', '==', false), // Only completed sessions
        orderBy('departureTime', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs
        .map(doc => {
          const data = doc.data() as any;
          const session: LeaveSessionLog = {
            id: doc.id,
            ...data,
            departureTime: (data.departureTime as Timestamp).toDate(),
            returnTime: data.returnTime ? (data.returnTime as Timestamp).toDate() : undefined,
            updatedAt: (data.updatedAt as Timestamp).toDate(),
          };
          
          const behaviorIndex = this.calculateBehaviorIndex(session);
          const duration = session.returnTime && session.departureTime 
            ? Math.round((session.returnTime.getTime() - session.departureTime.getTime()) / (1000 * 60))
            : undefined;
          
          return {
            id: session.id,
            date: session.departureTime,
            behaviorIndex,
            duration,
            observations: session.returnObservations
          };
        })
        .filter(session => session.behaviorIndex !== null); // Only sessions with completed observations
      
      const averageBehaviorIndex = sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + s.behaviorIndex, 0) / sessions.length
        : 0;
      
      // Calculate trend (comparing first half vs second half)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (sessions.length >= 4) {
        const midpoint = Math.floor(sessions.length / 2);
        const firstHalfAvg = sessions.slice(0, midpoint).reduce((sum, s) => sum + s.behaviorIndex, 0) / midpoint;
        const secondHalfAvg = sessions.slice(midpoint).reduce((sum, s) => sum + s.behaviorIndex, 0) / (sessions.length - midpoint);
        
        if (secondHalfAvg > firstHalfAvg + 0.1) {
          trend = 'improving';
        } else if (secondHalfAvg < firstHalfAvg - 0.1) {
          trend = 'declining';
        }
      }
      
      return {
        sessions,
        averageBehaviorIndex: Math.round(averageBehaviorIndex * 100) / 100,
        totalSessions: sessions.length,
        trend
      };
    } catch (error) {
      console.error('Error getting historical analytics:', error);
      return {
        sessions: [],
        averageBehaviorIndex: 0,
        totalSessions: 0,
        trend: 'stable'
      };
    }
  },

  async getSessionHistory(familyId: string, maxResults: number = 50): Promise<LeaveSessionLog[]> {
    try {
      const q = query(
        collection(db, SESSION_COLLECTION),
        where('familyId', '==', familyId),
        where('isActive', '==', false), // Only completed sessions
        orderBy('departureTime', 'desc'),
        limit(maxResults)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          departureTime: (data.departureTime as Timestamp).toDate(),
          returnTime: data.returnTime ? (data.returnTime as Timestamp).toDate() : undefined,
          updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as LeaveSessionLog;
      });
    } catch (error) {
      console.error('Error getting session history:', error);
      return [];
    }
  }
};
