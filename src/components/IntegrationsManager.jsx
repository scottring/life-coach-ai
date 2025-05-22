import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from '../hooks/useAuthState';
import { useGmailIntegration } from '../hooks/useGmailIntegration';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';

function IntegrationsManager() {
  const { user } = useAuthState();
  const [integrations, setIntegrations] = useState({
    gmail: { accounts: [], lastSync: null },
    calendar: { accounts: [], lastSync: null },
    notion: { connected: false, lastSync: null }
  });
  
  const [loading, setLoading] = useState(true);
  const { syncing: syncingGmail, lastSync: lastGmailSync, syncEmails } = useGmailIntegration();
  const { loading: loadingCalendar, lastSync: lastCalendarSync, fetchEvents } = useCalendarIntegration();

  useEffect(() => {
    if (!user?.id) return;
    fetchIntegrations();
  }, [user?.id]);
  
  // Update last sync times when they change
  useEffect(() => {
    if (lastGmailSync) {
      setIntegrations(prev => ({
        ...prev,
        gmail: { ...prev.gmail, lastSync: lastGmailSync }
      }));
    }
    
    if (lastCalendarSync) {
      setIntegrations(prev => ({
        ...prev,
        calendar: { ...prev.calendar, lastSync: lastCalendarSync }
      }));
    }
  }, [lastGmailSync, lastCalendarSync]);
  
  const connectService = async (service, accountLabel = 'Work') => {
    try {
      if (service === 'calendar') {
        // Connect to Google Calendar - dynamic import to avoid SSR issues
        const { startGoogleCalendarAuth } = await import('../lib/googleAuth');
        await startGoogleCalendarAuth(accountLabel);
        // Refresh integration status after connection
        setTimeout(() => {
          fetchIntegrations();
        }, 1000);
      } else if (service === 'gmail') {
        // Connect to Gmail - dynamic import to avoid SSR issues
        const { startGoogleGmailAuth } = await import('../lib/googleAuth');
        await startGoogleGmailAuth(accountLabel);
        // Refresh integration status after connection
        setTimeout(() => {
          fetchIntegrations();
        }, 1000);
      } else {
        // For other services, just toggle for now
        setIntegrations(prev => ({
          ...prev,
          [service]: { 
            ...prev[service],
            connected: !prev[service].connected
          }
        }));
      }
    } catch (error) {
      console.error(`Error connecting to ${service}:`, error);
      alert(`Failed to connect to ${service}. Please try again.`);
    }
  };

  const disconnectAccount = async (service, accountEmail) => {
    try {
      const { disconnectGoogleAccount } = await import('../lib/googleAuth');
      await disconnectGoogleAccount(service, accountEmail);
      fetchIntegrations();
    } catch (error) {
      console.error(`Error disconnecting account:`, error);
      alert(`Failed to disconnect account. Please try again.`);
    }
  };

  const setPrimaryAccount = async (service, accountEmail) => {
    try {
      const { setPrimaryAccount: setPrimary } = await import('../lib/googleAuth');
      await setPrimary(service, accountEmail);
      fetchIntegrations();
    } catch (error) {
      console.error(`Error setting primary account:`, error);
      alert(`Failed to set primary account. Please try again.`);
    }
  };

  const fetchIntegrations = async () => {
    try {
      // Fetch credentials for each service with account details
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('integration_credentials')
        .select('service, account_label, account_email, is_primary')
        .eq('user_id', user.id);
        
      if (credentialsError) throw credentialsError;
      
      // Fetch user preferences for sync settings
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_preferences')
        .select('last_email_sync, last_calendar_sync, last_notion_sync')
        .eq('user_id', user.id)
        .single();
        
      if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;
      
      // Group accounts by service
      const gmailAccounts = credentialsData?.filter(c => c.service === 'gmail') || [];
      const calendarAccounts = credentialsData?.filter(c => c.service === 'google_calendar') || [];
      
      const updatedIntegrations = {
        gmail: { 
          accounts: gmailAccounts,
          lastSync: prefsData?.last_email_sync ? new Date(prefsData.last_email_sync) : null
        },
        calendar: { 
          accounts: calendarAccounts,
          lastSync: prefsData?.last_calendar_sync ? new Date(prefsData.last_calendar_sync) : null
        },
        notion: { 
          connected: credentialsData?.some(c => c.service === 'notion') || false,
          lastSync: prefsData?.last_notion_sync ? new Date(prefsData.last_notion_sync) : null
        }
      };
      
      setIntegrations(updatedIntegrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatLastSync = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading integrations...</div>;
  }

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-medium text-gray-800">Manage Integrations</h2>
      
      <div className="space-y-4">
        {/* Gmail Integration */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Gmail</h3>
                <p className="text-sm text-gray-500">
                  {integrations.gmail.accounts.length > 0
                    ? `${integrations.gmail.accounts.length} account(s) connected • Last synced: ${formatLastSync(integrations.gmail.lastSync)}` 
                    : 'No accounts connected'}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {integrations.gmail.accounts.length > 0 && (
                <button 
                  onClick={syncEmails}
                  disabled={syncingGmail}
                  className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50"
                >
                  {syncingGmail ? 'Syncing...' : 'Sync All'}
                </button>
              )}
              
              <button 
                onClick={() => connectService('gmail', 'Work')}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add Work
              </button>
              
              <button 
                onClick={() => connectService('gmail', 'Personal')}
                className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
              >
                + Add Personal
              </button>
            </div>
          </div>
          
          {/* Connected Accounts */}
          {integrations.gmail.accounts.length > 0 && (
            <div className="space-y-2">
              {integrations.gmail.accounts.map((account, index) => (
                <div key={index} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center space-x-3">
                    <div className={`rounded px-2 py-1 text-xs font-medium ${
                      account.account_label === 'Work' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {account.account_label}
                    </div>
                    <span className="text-sm text-gray-600">{account.account_email}</span>
                    {account.is_primary && (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                        Primary
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {!account.is_primary && (
                      <button 
                        onClick={() => setPrimaryAccount('gmail', account.account_email)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Set Primary
                      </button>
                    )}
                    <button 
                      onClick={() => disconnectAccount('gmail', account.account_email)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Google Calendar Integration */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Google Calendar</h3>
                <p className="text-sm text-gray-500">
                  {integrations.calendar.accounts.length > 0
                    ? `${integrations.calendar.accounts.length} account(s) connected • Last synced: ${formatLastSync(integrations.calendar.lastSync)}` 
                    : 'No accounts connected'}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {integrations.calendar.accounts.length > 0 && (
                <button 
                  onClick={() => fetchEvents()}
                  disabled={loadingCalendar}
                  className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50"
                >
                  {loadingCalendar ? 'Syncing...' : 'Sync All'}
                </button>
              )}
              
              <button 
                onClick={() => connectService('calendar', 'Work')}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Add Work
              </button>
              
              <button 
                onClick={() => connectService('calendar', 'Personal')}
                className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
              >
                + Add Personal
              </button>
            </div>
          </div>
          
          {/* Connected Accounts */}
          {integrations.calendar.accounts.length > 0 && (
            <div className="space-y-2">
              {integrations.calendar.accounts.map((account, index) => (
                <div key={index} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center space-x-3">
                    <div className={`rounded px-2 py-1 text-xs font-medium ${
                      account.account_label === 'Work' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {account.account_label}
                    </div>
                    <span className="text-sm text-gray-600">{account.account_email}</span>
                    {account.is_primary && (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                        Primary
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {!account.is_primary && (
                      <button 
                        onClick={() => setPrimaryAccount('google_calendar', account.account_email)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Set Primary
                      </button>
                    )}
                    <button 
                      onClick={() => disconnectAccount('google_calendar', account.account_email)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Notion Integration */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
          <div>
            <div className="flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">Notion</h3>
                <p className="text-sm text-gray-500">
                  {integrations.notion.connected 
                    ? `Last synced: ${formatLastSync(integrations.notion.lastSync)}` 
                    : 'Not connected'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {integrations.notion.connected && (
              <button 
                className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 hover:bg-gray-200"
              >
                Sync Now
              </button>
            )}
            
            <button 
              onClick={() => connectService('notion')}
              className={`rounded px-3 py-1 text-sm font-medium ${
                integrations.notion.connected 
                  ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {integrations.notion.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0 text-blue-400">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 text-sm text-blue-700">
              <p>
                Connected integrations will sync automatically in the background based on your settings. 
                You can manually sync at any time using the "Sync Now" button.
              </p>
            </div>
          </div>
        </div>
        
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0 text-green-400">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 text-sm text-green-700">
              <p>
                <strong>Google Calendar Integration Ready!</strong> Click "Connect" on Google Calendar above to authorize 
                access to your real calendar events. Once connected, your calendar view will show actual events alongside task deadlines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsManager;