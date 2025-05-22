import OpenAI from 'openai';

// Initialize OpenAI client - this would be an env variable in production
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || 'sk-mock-key-for-development';

export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Only use this for client-side development
});