// src/services/dogBehaviorService.ts
import { db } from '../lib/firebase';
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
import { DogSOP, SOPLogEntry, SOPStep, LeaveSessionLog } from '../types/dogBehavior';

const SOP_COLLECTION = 'dogSops';
const LOG_COLLECTION = 'dogSopLogs';
const SESSION_COLLECTION = 'dogLeaveSessions';

export const DogBehaviorService = {
  // Fetch all Standard Operating Procedures for a family, ordered by name
  async getSOPs(familyId: string): Promise<DogSOP[]> {
    const q = query(
      collection(db, SOP_COLLECTION),
      where('familyId', '==', familyId),
      orderBy('name') // Order by name for consistent display
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
    })) as DogSOP[];
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
  async startLeaveSession(familyId: string, userId: string, userName: string, departureSopLogId?: string): Promise<string> {
    const newSessionRef = await addDoc(collection(db, SESSION_COLLECTION), {
      familyId,
      departureTime: Timestamp.now(),
      isActive: true,
      departureSopLogId,
      userId,
      userName,
      updatedAt: Timestamp.now(),
    });
    return newSessionRef.id;
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
    const q = query(
      collection(db, SESSION_COLLECTION),
      where('familyId', '==', familyId),
      where('isActive', '==', true),
      orderBy('departureTime', 'desc'),
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
  }
};
