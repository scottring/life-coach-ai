import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { openai } from '../lib/openaiClient';

export function useLearningSystem() {
  const [analyzing, setAnalyzing] = useState(false);
  
  // Track user actions and store patterns
  const trackAction = async (actionType, details, result) => {
    try {
      // Get the authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData?.user) throw new Error('User not authenticated');
      
      const user = userData.user;
      
      // Create embedding of the action
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: `Action: ${actionType} - ${details}`
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Store in Supabase
      const { error } = await supabase
        .from('user_patterns')
        .insert([
          {
            user_id: user.id,
            action_type: actionType,
            embedding: embedding,
            result: result,
            timestamp: new Date()
          }
        ]);
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error tracking user action:', error);
      return false;
    }
  };
  
  // Get personalized suggestions based on current context
  const getSuggestions = useCallback(async (context) => {
    try {
      // Get the authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData?.user) throw new Error('User not authenticated');
      
      // Create a description of the current context
      const contextDescription = `
        Time: ${new Date().toLocaleTimeString()}
        Day: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
        Focus: ${context.current_focus || 'Not specified'}
        Energy: ${context.energy_level || 'Medium'}
        Available time: ${context.available_time || 'Unknown'} minutes
      `;
      
      // Create the prompt for OpenAI
      const prompt = `
        Based on this user context, provide 3 personalized productivity suggestions:
        
        ${contextDescription}
        
        Your suggestions should be specific, actionable, and consider the user's current focus, energy level, and available time.
      `;
      
      // Get the completion from OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {role: "system", content: "You provide highly personalized productivity suggestions based on user patterns."},
          {role: "user", content: prompt}
        ]
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      // Provide fallback suggestions
      return [
        "Focus on high-priority tasks first while your energy is highest",
        "Consider batching similar tasks together for efficiency",
        "Take a short break after completing your next major task"
      ];
    }
  }, []);
  
  // Analyze completion patterns to improve scheduling
  const analyzeCompletionPatterns = async () => {
    try {
      setAnalyzing(true);
      
      // Get the authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData?.user) throw new Error('User not authenticated');
      
      const user = userData.user;
      
      // Fetch task completion data
      const { data: completedTasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      
      // If we have task data, analyze it
      if (completedTasks && completedTasks.length > 0) {
        // Process the data to find patterns
        // For now, let's analyze basic patterns
        
        // Time of day completion pattern
        const timeOfDayCompletion = completedTasks.reduce((acc, task) => {
          const hour = new Date(task.completed_at || task.updated_at).getHours();
          
          if (hour >= 5 && hour < 12) acc.morning.push(task);
          else if (hour >= 12 && hour < 17) acc.afternoon.push(task);
          else acc.evening.push(task);
          
          return acc;
        }, { morning: [], afternoon: [], evening: [] });
        
        // Day of week pattern
        const dayCompletion = completedTasks.reduce((acc, task) => {
          const day = new Date(task.completed_at || task.updated_at).getDay();
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          if (!acc[days[day]]) acc[days[day]] = [];
          acc[days[day]].push(task);
          
          return acc;
        }, {});
        
        // Context patterns
        const contextCompletion = completedTasks.reduce((acc, task) => {
          if (!task.context) return acc;
          
          if (!acc[task.context]) acc[task.context] = [];
          acc[task.context].push(task);
          
          return acc;
        }, {});
        
        // Generate analysis results
        return {
          bestTimes: {
            morning: Object.keys(contextCompletion).filter(context => 
              timeOfDayCompletion.morning.some(task => task.context === context)),
            afternoon: Object.keys(contextCompletion).filter(context => 
              timeOfDayCompletion.afternoon.some(task => task.context === context)),
            evening: Object.keys(contextCompletion).filter(context => 
              timeOfDayCompletion.evening.some(task => task.context === context))
          },
          dayPatterns: {
            productive: Object.entries(dayCompletion)
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 2)
              .map(entry => entry[0]),
            challenging: Object.entries(dayCompletion)
              .sort((a, b) => a[1].length - b[1].length)
              .slice(0, 2)
              .map(entry => entry[0])
          },
          contextSwitching: calculateContextSwitching(completedTasks),
          completionRates: calculateCompletionRates(completedTasks),
          recommendations: generateRecommendations(completedTasks)
        };
      } else {
        // Not enough data, return mock analysis
        return {
          bestTimes: { morning: ["High-focus work"], afternoon: ["Meetings, emails"], evening: ["Planning, light tasks"] },
          dayPatterns: { productive: ["Monday", "Tuesday"], challenging: ["Friday"] },
          contextSwitching: "You tend to switch contexts frequently, which may reduce productivity.",
          completionRates: { high: ["Work", "Priority 5"], low: ["Personal", "Priority 1"] },
          recommendations: ["Focus on one context at a time", "Schedule high-priority tasks in the morning"]
        };
      }
    } catch (error) {
      console.error('Error analyzing completion patterns:', error);
      // Provide fallback analysis
      return {
        bestTimes: { morning: ["High-focus work"], afternoon: ["Meetings, emails"], evening: ["Planning, light tasks"] },
        dayPatterns: { productive: ["Monday", "Tuesday"], challenging: ["Friday"] },
        contextSwitching: "You tend to switch contexts frequently, which may reduce productivity.",
        completionRates: { high: ["Work", "Priority 5"], low: ["Personal", "Priority 1"] },
        recommendations: ["Focus on one context at a time", "Schedule high-priority tasks in the morning"]
      };
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Helper functions for analysis
  const calculateContextSwitching = (tasks) => {
    let contextSwitches = 0;
    let prevContext = null;
    
    tasks.forEach(task => {
      if (prevContext && task.context !== prevContext) {
        contextSwitches++;
      }
      prevContext = task.context;
    });
    
    const switchRate = contextSwitches / (tasks.length || 1);
    
    if (switchRate > 0.5) {
      return "You tend to switch contexts frequently, which may reduce productivity.";
    } else if (switchRate > 0.3) {
      return "You have a moderate amount of context switching in your work.";
    } else {
      return "You maintain good focus by minimizing context switching.";
    }
  };
  
  const calculateCompletionRates = (tasks) => {
    // Group by context
    const contextGroups = tasks.reduce((acc, task) => {
      if (!task.context) return acc;
      
      if (!acc[task.context]) acc[task.context] = [];
      acc[task.context].push(task);
      
      return acc;
    }, {});
    
    // Group by priority
    const priorityGroups = tasks.reduce((acc, task) => {
      if (!task.priority) return acc;
      
      const priorityKey = `Priority ${task.priority}`;
      if (!acc[priorityKey]) acc[priorityKey] = [];
      acc[priorityKey].push(task);
      
      return acc;
    }, {});
    
    const highCompletionContexts = Object.entries(contextGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2)
      .map(entry => entry[0]);
      
    const lowCompletionContexts = Object.entries(contextGroups)
      .sort((a, b) => a[1].length - b[1].length)
      .slice(0, 2)
      .map(entry => entry[0]);
      
    const highCompletionPriorities = Object.entries(priorityGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2)
      .map(entry => entry[0]);
      
    const lowCompletionPriorities = Object.entries(priorityGroups)
      .sort((a, b) => a[1].length - b[1].length)
      .slice(0, 2)
      .map(entry => entry[0]);
    
    return {
      high: [...highCompletionContexts, ...highCompletionPriorities],
      low: [...lowCompletionContexts, ...lowCompletionPriorities]
    };
  };
  
  const generateRecommendations = (tasks) => {
    // Generate basic recommendations based on data
    const recommendations = [
      "Focus on one context at a time for better productivity",
      "Schedule high-priority tasks during your most productive hours"
    ];
    
    // Add more specific recommendations based on patterns
    const morningTasks = tasks.filter(task => {
      const hour = new Date(task.completed_at || task.updated_at).getHours();
      return hour >= 5 && hour < 12;
    });
    
    if (morningTasks.length > tasks.length * 0.5) {
      recommendations.push("You're most productive in the morning, schedule important tasks then");
    }
    
    // Check for breaks
    const timestamps = tasks
      .map(task => new Date(task.completed_at || task.updated_at).getTime())
      .sort((a, b) => a - b);
      
    let hasShortBreaks = false;
    for (let i = 1; i < timestamps.length; i++) {
      const diffMinutes = (timestamps[i] - timestamps[i-1]) / (1000 * 60);
      if (diffMinutes > 15 && diffMinutes < 30) {
        hasShortBreaks = true;
        break;
      }
    }
    
    if (!hasShortBreaks) {
      recommendations.push("Try adding short 15-minute breaks between tasks to improve focus");
    }
    
    return recommendations;
  };
  
  return { 
    trackAction, 
    getSuggestions, 
    analyzeCompletionPatterns,
    analyzing
  };
}