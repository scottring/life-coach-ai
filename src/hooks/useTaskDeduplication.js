/**
 * Hook for task deduplication and duplicate management
 */
import { useState, useEffect } from 'react';
import { DeduplicationService } from '../lib/deduplicationService';
import { supabase } from '../lib/supabaseClient';

export function useTaskDeduplication(tasks, userId) {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tasks && tasks.length > 0 && userId) {
      analyzeDuplicates();
    }
  }, [tasks, userId]);

  const analyzeDuplicates = async () => {
    setLoading(true);
    try {
      // Group tasks by potential duplicates
      const groups = await findDuplicateGroups(tasks);
      setDuplicateGroups(groups);

      // Get deduplication stats
      const stats = await DeduplicationService.getDeduplicationStats(userId);
      setStats(stats);
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const findDuplicateGroups = async (tasks) => {
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < tasks.length; i++) {
      if (processed.has(tasks[i].id)) continue;

      const task = tasks[i];
      const duplicates = [];

      // Find similar tasks
      for (let j = i + 1; j < tasks.length; j++) {
        if (processed.has(tasks[j].id)) continue;

        const other = tasks[j];
        
        // Check if tasks are potential duplicates
        if (arePotentialDuplicates(task, other)) {
          duplicates.push(other);
          processed.add(other.id);
        }
      }

      if (duplicates.length > 0) {
        groups.push({
          id: `group-${task.id}`,
          original: task,
          duplicates: duplicates,
          totalCount: duplicates.length + 1,
          sources: [...new Set([task.source, ...duplicates.map(d => d.source)].filter(Boolean))],
          confidence: calculateDuplicateConfidence(task, duplicates)
        });
        processed.add(task.id);
      }
    }

    return groups;
  };

  const arePotentialDuplicates = (task1, task2) => {
    // Skip if different sources but not from integrations
    const integrationSources = ['calendar', 'email'];
    if (task1.source && task2.source && 
        task1.source !== task2.source &&
        (!integrationSources.includes(task1.source) || !integrationSources.includes(task2.source))) {
      return false;
    }

    // Same source_id = definite duplicate
    if (task1.source_id && task2.source_id && task1.source_id === task2.source_id) {
      return true;
    }

    // Similar titles
    const similarity = DeduplicationService.calculateSimilarity(
      task1.title.toLowerCase(),
      task2.title.toLowerCase()
    );

    return similarity > 0.7; // 70% similarity threshold
  };

  const calculateDuplicateConfidence = (original, duplicates) => {
    let totalSimilarity = 0;
    let count = 0;

    duplicates.forEach(dup => {
      const titleSim = DeduplicationService.calculateSimilarity(
        original.title.toLowerCase(),
        dup.title.toLowerCase()
      );
      
      const descSim = DeduplicationService.calculateSimilarity(
        (original.description || '').toLowerCase(),
        (dup.description || '').toLowerCase()
      );

      totalSimilarity += (titleSim + descSim) / 2;
      count++;
    });

    return count > 0 ? Math.round((totalSimilarity / count) * 100) : 0;
  };

  const mergeDuplicates = async (groupId, keepTaskId) => {
    try {
      const group = duplicateGroups.find(g => g.id === groupId);
      if (!group) return;

      const tasksToDelete = [group.original, ...group.duplicates]
        .filter(task => task.id !== keepTaskId)
        .map(task => task.id);

      // Delete duplicate tasks
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', tasksToDelete);

      if (error) throw error;

      // Remove group from duplicate groups
      setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));

      return true;
    } catch (error) {
      console.error('Error merging duplicates:', error);
      return false;
    }
  };

  const dismissDuplicateGroup = (groupId) => {
    setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
  };

  return {
    duplicateGroups,
    stats,
    loading,
    mergeDuplicates,
    dismissDuplicateGroup,
    analyzeDuplicates
  };
}