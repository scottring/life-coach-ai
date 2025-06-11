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
import { DogSOP, SOPLogEntry, SOPStep } from '../types/dogBehavior';

const SOP_COLLECTION = 'dogSops';
const LOG_COLLECTION = 'dogSopLogs';

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
  }
};
