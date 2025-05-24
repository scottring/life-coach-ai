import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from '../hooks/useAuthState';
import TaskAnalytics from '../components/TaskAnalytics';
import InsightsPanel from '../components/InsightsPanel';

function AnalyticsPage() {
  const { user } = useAuthState();
  const [userContext, setUserContext] = useState({
    current_focus: 'Work',
    energy_level: 'Medium',
    available_time: 60
  });
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch user's current context when component mounts
    const fetchContext = async () => {
      const { data, error } = await supabase
        .from('user_contexts')
        .select('*')
        .eq('user_id', user.id)
        .order('active_from', { ascending: false })
        .limit(1)
        .single();
        
      if (!error && data) {
        setUserContext({
          current_focus: data.current_focus,
          energy_level: data.energy_level,
          available_time: data.available_time
        });
      }
    };
    
    fetchContext();
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>
      
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TaskAnalytics />
        </div>
        
        <div className="space-y-6">
          <InsightsPanel userContext={userContext} />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;