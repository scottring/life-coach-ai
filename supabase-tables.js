// Script to create the tables in Supabase
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://gnhayemgydgoerbdxjty.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaGF5ZW1neWRnb2VyYmR4anR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODgwMTcsImV4cCI6MjA1OTg2NDAxN30.RuTS4LXEd2FekZGpt9WrcdSC4LfSSdg-jk--ZTD9pkY'
);

async function createTables() {
  console.log('Creating tables...');
  
  // Tasks table
  const { error: tasksError } = await supabase.from('tasks').select('id').limit(1);
  
  if (tasksError && tasksError.code === 'PGRST301') {
    console.log('Creating tasks table...');
    
    // Use REST API to make raw query
    await fetch('https://gnhayemgydgoerbdxjty.supabase.co/rest/v1/rpc/create_tasks_table', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaGF5ZW1neWRnb2VyYmR4anR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODgwMTcsImV4cCI6MjA1OTg2NDAxN30.RuTS4LXEd2FekZGpt9WrcdSC4LfSSdg-jk--ZTD9pkY`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaGF5ZW1neWRnb2VyYmR4anR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODgwMTcsImV4cCI6MjA1OTg2NDAxN30.RuTS4LXEd2FekZGpt9WrcdSC4LfSSdg-jk--ZTD9pkY'
      }
    });
  } else {
    console.log('Tasks table already exists');
  }
  
  // Goals table
  const { error: goalsError } = await supabase.from('goals').select('id').limit(1);
  
  if (goalsError && goalsError.code === 'PGRST301') {
    console.log('Creating goals table...');
    
    // Use REST API to make raw query
    await fetch('https://gnhayemgydgoerbdxjty.supabase.co/rest/v1/rpc/create_goals_table', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaGF5ZW1neWRnb2VyYmR4anR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODgwMTcsImV4cCI6MjA1OTg2NDAxN30.RuTS4LXEd2FekZGpt9WrcdSC4LfSSdg-jk--ZTD9pkY`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaGF5ZW1neWRnb2VyYmR4anR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODgwMTcsImV4cCI6MjA1OTg2NDAxN30.RuTS4LXEd2FekZGpt9WrcdSC4LfSSdg-jk--ZTD9pkY'
      }
    });
  } else {
    console.log('Goals table already exists');
  }
  
  // Check tables
  try {
    const { data: tasksCheck, error: tasksCheckError } = await supabase.from('tasks').select('id').limit(1);
    console.log('Tasks table check:', tasksCheckError ? 'Error' : 'Success');
    
    const { data: goalsCheck, error: goalsCheckError } = await supabase.from('goals').select('id').limit(1);
    console.log('Goals table check:', goalsCheckError ? 'Error' : 'Success');
    
    console.log('Table creation process complete');
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

// Run the function
createTables().catch(error => {
  console.error('Error:', error);
});