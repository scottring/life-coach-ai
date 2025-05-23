/**
 * Deduplication service for emails and calendar events
 * Handles duplicates from shared calendars and multiple accounts
 */

import { supabase } from './supabaseClient.js';

export class DeduplicationService {
  /**
   * Check if a task already exists by source ID
   */
  static async taskExistsBySourceId(userId, source, sourceId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('source', source)
      .eq('source_id', sourceId)
      .limit(1);

    if (error) {
      console.error('Error checking task by source ID:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Check if similar task exists by content similarity
   */
  static async findSimilarTask(userId, title, description, source) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, source')
      .eq('user_id', userId)
      .eq('source', source);

    if (error) {
      console.error('Error finding similar tasks:', error);
      return null;
    }

    // Simple similarity check - could be enhanced with fuzzy matching
    const titleLower = title.toLowerCase().trim();
    const descLower = (description || '').toLowerCase().trim();

    for (const task of data) {
      const existingTitleLower = task.title.toLowerCase().trim();
      const existingDescLower = (task.description || '').toLowerCase().trim();

      // Check for exact title match
      if (titleLower === existingTitleLower) {
        return task;
      }

      // Check for high similarity in title and description
      if (this.calculateSimilarity(titleLower, existingTitleLower) > 0.8 &&
          this.calculateSimilarity(descLower, existingDescLower) > 0.7) {
        return task;
      }
    }

    return null;
  }

  /**
   * Simple string similarity calculation (Jaccard similarity)
   */
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Deduplicate calendar events by event ID and title
   */
  static deduplicateCalendarEvents(events) {
    const seen = new Map();
    const uniqueEvents = [];

    for (const event of events) {
      // Primary deduplication by event ID
      if (event.id && seen.has(event.id)) {
        console.log(`Skipping duplicate event by ID: ${event.summary || 'No title'}`);
        continue;
      }

      // Secondary deduplication by title + start time for shared calendar cases
      const titleKey = (event.summary || '').toLowerCase().trim();
      const startTime = event.start?.dateTime || event.start?.date || '';
      const duplicateKey = `${titleKey}|${startTime}`;

      if (seen.has(duplicateKey)) {
        console.log(`Skipping duplicate event by content: ${event.summary || 'No title'}`);
        continue;
      }

      // Mark as seen
      if (event.id) seen.set(event.id, true);
      seen.set(duplicateKey, true);
      
      uniqueEvents.push(event);
    }

    console.log(`Deduplicated ${events.length} events to ${uniqueEvents.length} unique events`);
    return uniqueEvents;
  }

  /**
   * Deduplicate emails by message ID and subject
   */
  static deduplicateEmails(emails) {
    const seen = new Map();
    const uniqueEmails = [];

    for (const email of emails) {
      // Primary deduplication by message ID
      if (email.id && seen.has(email.id)) {
        console.log(`Skipping duplicate email by ID: ${email.snippet || 'No subject'}`);
        continue;
      }

      // Secondary deduplication by subject + sender for forwarded/shared cases
      const subject = (email.snippet || '').toLowerCase().trim();
      const from = (email.payload?.headers?.find(h => h.name === 'From')?.value || '').toLowerCase();
      const duplicateKey = `${subject}|${from}`;

      if (seen.has(duplicateKey)) {
        console.log(`Skipping duplicate email by content: ${email.snippet || 'No subject'}`);
        continue;
      }

      // Mark as seen
      if (email.id) seen.set(email.id, true);
      seen.set(duplicateKey, true);
      
      uniqueEmails.push(email);
    }

    console.log(`Deduplicated ${emails.length} emails to ${uniqueEmails.length} unique emails`);
    return uniqueEmails;
  }

  /**
   * Check if task should be saved (not a duplicate)
   */
  static async shouldSaveTask(userId, taskData, source, sourceId) {
    // Check by source ID first (most reliable)
    if (sourceId && await this.taskExistsBySourceId(userId, source, sourceId)) {
      console.log(`Task with source ID ${sourceId} already exists, skipping`);
      return false;
    }

    // Check by content similarity
    const similarTask = await this.findSimilarTask(userId, taskData.title, taskData.description, source);
    if (similarTask) {
      console.log(`Similar task found: "${similarTask.title}", skipping new task: "${taskData.title}"`);
      return false;
    }

    return true;
  }

  /**
   * Safe task creation with duplicate checking
   */
  static async createTaskIfUnique(userId, taskData, source, sourceId) {
    try {
      // Check if we should save this task
      const shouldSave = await this.shouldSaveTask(userId, taskData, source, sourceId);
      if (!shouldSave) {
        return null; // Task is a duplicate
      }

      // Create the task
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          source: source,
          source_id: sourceId,
          ...taskData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return null;
      }

      console.log(`Created unique task: "${taskData.title}"`);
      return data;
    } catch (error) {
      console.error('Error in createTaskIfUnique:', error);
      return null;
    }
  }

  /**
   * Get deduplication statistics for reporting
   */
  static async getDeduplicationStats(userId, timeframe = '7 days') {
    const { data, error } = await supabase
      .from('tasks')
      .select('source, source_id, title, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error getting deduplication stats:', error);
      return { totalTasks: 0, duplicatesAvoided: 0, sources: {} };
    }

    const sources = {};
    const sourceIds = new Set();
    let duplicatesAvoided = 0;

    for (const task of data) {
      if (!sources[task.source]) {
        sources[task.source] = { count: 0, duplicates: 0 };
      }
      sources[task.source].count++;

      if (task.source_id) {
        if (sourceIds.has(task.source_id)) {
          sources[task.source].duplicates++;
          duplicatesAvoided++;
        }
        sourceIds.add(task.source_id);
      }
    }

    return {
      totalTasks: data.length,
      duplicatesAvoided,
      sources,
      deduplicationRate: data.length > 0 ? (duplicatesAvoided / data.length * 100).toFixed(1) : 0
    };
  }
}