// Script to initialize Supabase tables
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load SQL file
const sql = fs.readFileSync('./supabase/schema.sql', 'utf8');

// Split SQL into separate statements
const statements = sql
  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
  .replace(/--.*$/gm, '') // Remove line comments
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0);

// Initialize Supabase client
const supabase = createClient(
  'https://gnhayemgydgoerbdxjty.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaGF5ZW1neWRnb2VyYmR4anR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODgwMTcsImV4cCI6MjA1OTg2NDAxN30.RuTS4LXEd2FekZGpt9WrcdSC4LfSSdg-jk--ZTD9pkY'
);

// Execute each statement
async function executeStatements() {
  console.log(`Found ${statements.length} SQL statements to execute`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`Exception executing statement ${i + 1}:`, err.message);
    }
  }
  
  console.log('All statements processed');
}

executeStatements().catch(error => {
  console.error('Error:', error);
});