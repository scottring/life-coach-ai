import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from './useAuthState';
import { processEmails } from '../lib/emailProcessor';

export function useGmailIntegration() {
  const { user } = useAuthState();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  
  // Sync emails and extract tasks
  const syncEmails = async () => {
    setSyncing(true);
    setError(null);
    
    try {
      // In a real implementation, get Gmail token from stored credentials
      // For now, use a mock approach
      if (!user?.id) return;
      
      const { data: credentials } = await supabase
        .from('integration_credentials')
        .select('credentials')
        .eq('user_id', user.id)
        .eq('service', 'gmail');
      
      if (!credentials || credentials.length === 0) {
        console.log('Gmail not connected - using mock data');
        // Use mock data for development
        setTimeout(() => {
          setLastSync(new Date());
          setSyncing(false);
        }, 1500);
        return;
      }
      
      // Use primary account or first available
      const primaryAccount = credentials.find(item => item.credentials?.is_primary) || credentials[0];
      const accessToken = primaryAccount.credentials.access_token;
      
      // Process emails
      await processEmails(accessToken);
      
      // Update last sync time
      const now = new Date();
      setLastSync(now);
      
      // Store sync info in Supabase
      await supabase
        .from('user_preferences')
        .update({ 
          last_email_sync: now.toISOString(),
        })
        .eq('user_id', user.id);
        
    } catch (err) {
      console.error('Error syncing emails:', err);
      setError('Failed to sync emails: ' + (err.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };
  
  // Auto-sync on component mount if enabled
  useEffect(() => {
    const checkAutoSync = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('email_sync_enabled, last_email_sync')
          .eq('user_id', user.id)
          .single();
          
        if (data?.email_sync_enabled) {
          // Only sync if last sync was more than 30 minutes ago
          const lastSyncTime = data?.last_email_sync ? new Date(data.last_email_sync) : null;
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          
          if (!lastSyncTime || lastSyncTime < thirtyMinutesAgo) {
            syncEmails();
          } else {
            setLastSync(lastSyncTime);
          }
        }
      } catch (err) {
        console.error('Error checking auto-sync settings:', err);
      }
    };
    
    if (user?.id) {
      checkAutoSync();
    }
  }, [user?.id]);
  
  return { syncing, lastSync, error, syncEmails };
}