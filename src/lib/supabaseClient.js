import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - these would be env variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example';

// Debug logging
console.log('Supabase Config Debug:', {
  url: supabaseUrl,
  keyPrefix: supabaseKey?.substring(0, 20) + '...',
  allEnvVars: import.meta.env
});

export const supabase = createClient(supabaseUrl, supabaseKey);