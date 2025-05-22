import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from '../hooks/useAuthState';

function ContextBar() {
  const { user } = useAuthState();
  const [context, setContext] = useState({
    current_focus: 'Work',
    energy_level: 'Medium',
    available_time: 60
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchContext = async () => {
      try {
        const { data, error } = await supabase
          .from('user_contexts')
          .select('*')
          .eq('user_id', user.id)
          .order('active_from', { ascending: false })
          .limit(1)
          .single();
          
        if (!error && data) {
          setContext({
            current_focus: data.current_focus,
            energy_level: data.energy_level,
            available_time: data.available_time
          });
        }
      } catch (error) {
        console.error('Error fetching context:', error);
      }
    };
    
    fetchContext();
  }, [user?.id]);
  
  const updateContext = async (field, value) => {
    if (!user?.id) return;
    
    const newContext = {
      ...context,
      [field]: value
    };
    
    setContext(newContext);
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('user_contexts')
        .insert([
          {
            user_id: user.id,
            ...newContext,
            active_from: new Date(),
            updated_at: new Date()
          }
        ]);
        
      if (error) {
        console.error('Error updating context:', error);
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
    
    setSaving(false);
  };

  return (
    <div className="border-b bg-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div>
              <span className="mr-2 text-gray-500">Focus:</span>
              <select 
                value={context.current_focus} 
                onChange={(e) => updateContext('current_focus', e.target.value)}
                className="rounded border-gray-300 text-sm"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Family">Family</option>
                <option value="Learning">Learning</option>
              </select>
            </div>
            
            <div>
              <span className="mr-2 text-gray-500">Energy:</span>
              <select 
                value={context.energy_level} 
                onChange={(e) => updateContext('energy_level', e.target.value)}
                className="rounded border-gray-300 text-sm"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            
            <div>
              <span className="mr-2 text-gray-500">Available time:</span>
              <select 
                value={context.available_time} 
                onChange={(e) => updateContext('available_time', parseInt(e.target.value))}
                className="rounded border-gray-300 text-sm"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="240">4+ hours</option>
              </select>
            </div>
          </div>
          
          {saving && (
            <span className="text-xs text-gray-500">Saving your context...</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContextBar;