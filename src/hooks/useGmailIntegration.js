iimport { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from './useAuthState';
import { processEmails } from '../lib/emailProcessor';
import { checkGmailApiStatus } from '../lib/gmailApiChecker';

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
      
      console.log('Gmail sync - Using account:', {
        email: primaryAccount.credentials.account_email,
        hasToken: !!accessToken,
        tokenLength: accessToken?.length,
        expiresAt: primaryAccount.credentials.expires_at
      });
      
      // First check if Gmail API is enabled
      const apiStatus = await checkGmailApiStatus(accessToken);
      if (!apiStatus.enabled) {
        console.error('Gmail API check failed:', apiStatus);
        setError(`${apiStatus.error}\n\n${apiStatus.action}`);
        setSyncing(false);
        return;
      }
      
      console.log('Gmail API is enabled for:', apiStatus.emailAddress);
      
      // Check if token might be expired
      const expiresAt = primaryAccount.credentials.expires_at;
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        setError('Gmail authentication expired. Please reconnect your Gmail account.');
        setSyncing(false);
        return;
      }
      
      // Process emails with enhanced options
      const extractedTasks = await processEmails(accessToken, {
        includeRead: false,    // Only unread emails from inbox
        includeSent: true,     // Include sent emails (key for commitments!)
        maxResults: 25,        // Get more emails per query
        daysBack: 7           // Look back 7 days
      });
      
      console.log(`Email sync completed. Extracted ${extractedTasks?.length || 0} tasks.`);
      
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
      // Check if it's a 403 error (authentication issue)
      if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
        setError('Gmail access denied. This usually means:\n1. The Gmail API is not enabled in Google Cloud Console\n2. The access token has expired\n3. Missing proper scopes\n\nPlease reconnect your Gmail account.');
      } else {
        setError('Failed to sync emails: ' + (err.message || 'Unknown error'));
      }
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
  
  return { syncing, lastSync, error, syncEmails, clearError: () => setError(null) };
}