import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('Supabase Config:', {
    url: supabaseUrl,
    keyPrefix: supabaseKey?.substring(0, 20) + '...'
  });
}

export const supabase = createClient(supabaseUrl, supabaseKey);