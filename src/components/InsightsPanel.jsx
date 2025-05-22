import React, { useState, useEffect } from 'react';
import { useLearningSystem } from '../hooks/useLearningSystem';
import { supabase } from '../lib/supabaseClient';

function InsightsPanel({ userContext }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getSuggestions } = useLearningSystem();
  
  // Fetch insights when userContext changes
  useEffect(() => {
    const fetchInsights = async () => {
      if (!userContext) return;
      
      setLoading(true);
      
      try {
        // Fetch stored insights from Supabase
        const user = (await supabase.auth.getUser()).data.user;
        
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const { data: storedInsights, error } = await supabase
          .from('insights')
          .select('*')
          .eq('user_id', user.id)
          .eq('applied', false)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) throw error;
        
        // Generate personalized suggestions based on current context
        const suggestions = await getSuggestions(userContext);
        
        // Process suggestions
        let suggestionsArray = [];
        
        if (typeof suggestions === 'string') {
          // Split by numbered points, common for OpenAI responses
          suggestionsArray = suggestions
            .split(/\d+\./)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        } else if (Array.isArray(suggestions)) {
          suggestionsArray = suggestions;
        }
        
        const contextInsights = suggestionsArray.map((suggestion, index) => ({
          id: `suggestion-${index}`,
          type: 'suggestion',
          content: suggestion,
          created_at: new Date().toISOString(),
          applied: false
        }));
        
        // Combine stored insights with context-based suggestions
        const combinedInsights = [...(storedInsights || []), ...contextInsights];
        setInsights(combinedInsights);
      } catch (error) {
        console.error('Error fetching insights:', error);
        
        // Fallback mock insights if there's an error
        setInsights([
          {
            id: '1',
            type: 'productivity',
            content: 'You complete 85% more tasks when you work in 25-minute focused intervals.',
            created_at: new Date().toISOString(),
            applied: false
          },
          {
            id: '2',
            type: 'pattern',
            content: 'Tasks tagged as "Work" are more likely to be completed in the morning.',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            applied: false
          },
          {
            id: '3',
            type: 'suggestion',
            content: 'Consider batching your email-related tasks for a single time block after lunch.',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            applied: false
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [userContext, getSuggestions]);
  
  const markInsightAsApplied = async (insightId) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Check if it's a database insight (has a numeric ID or UUID)
      if (insightId.toString().match(/^[0-9]+$/) || insightId.toString().match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Update in database
        const { error } = await supabase
          .from('insights')
          .update({ applied: true, updated_at: new Date().toISOString() })
          .eq('id', insightId)
          .eq('user_id', user.id);
          
        if (error) throw error;
      }
      
      // Update in local state
      setInsights(prev => prev.filter(i => i.id !== insightId));
    } catch (error) {
      console.error('Error marking insight as applied:', error);
      // Still attempt to update local state
      setInsights(prev => prev.filter(i => i.id !== insightId));
    }
  };
  
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-800">Insights & Suggestions</h2>
        </div>
        <div className="mt-4 text-center text-gray-500">
          Loading insights...
        </div>
      </div>
    );
  }
  
  if (insights.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-800">Insights & Suggestions</h2>
        </div>
        <div className="mt-4 text-center text-gray-500">
          Complete more tasks to generate personalized insights.
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Insights & Suggestions</h2>
      </div>
      
      <div className="mt-4 space-y-3">
        {insights.map(insight => (
          <div 
            key={insight.id} 
            className={`relative rounded-lg p-3 ${
              insight.type === 'productivity' ? 'bg-blue-50' :
              insight.type === 'pattern' ? 'bg-purple-50' :
              'bg-green-50'
            }`}
          >
            <div className="flex justify-between">
              <div className={`${
                insight.type === 'productivity' ? 'text-blue-700' :
                insight.type === 'pattern' ? 'text-purple-700' :
                'text-green-700'
              }`}>
                {insight.content}
              </div>
              
              <button
                onClick={() => markInsightAsApplied(insight.id)}
                className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
                title="Dismiss"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mt-1 text-xs text-gray-500">
              {formatTimeSince(insight.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function to format time since an event
function formatTimeSince(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

export default InsightsPanel;