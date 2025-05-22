// Script to run SQL against Supabase
import fs from 'fs';
import https from 'https';
import { URL } from 'url';

// Read SQL
const sql = fs.readFileSync('./supabase/schema.sql', 'utf8');

// Supabase credentials from env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials not set in environment variables');
  process.exit(1);
}

// Prepare the data
const data = JSON.stringify({
  query: sql
});

// Prepare the request options
const options = {
  hostname: new URL(SUPABASE_URL).hostname,
  path: '/rest/v1/sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Length': data.length
  }
};

// Make the request
const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log(`Status code: ${res.statusCode}`);
    try {
      const parsedData = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();