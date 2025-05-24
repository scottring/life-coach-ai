import { useState } from 'react';
import { openai } from '../lib/openaiClient';

export function useAIAssistant() {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState(null);

  const openAssistant = (context = null) => {
    setAssistantContext(context);
    setIsAssistantOpen(true);
  };

  const closeAssistant = () => {
    setIsAssistantOpen(false);
    setAssistantContext(null);
  };

  const openTaskAssistant = () => {
    openAssistant('task-creation');
  };

  const openGoalAssistant = () => {
    openAssistant('goal-setting');
  };

  // Generate text using OpenAI
  const generateWithAI = async (prompt, options = {}) => {
    try {
      const completion = await openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: options.systemPrompt || 'You are a helpful AI assistant. Provide clear, concise, and accurate responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating with AI:', error);
      throw error;
    }
  };

  return {
    isAssistantOpen,
    assistantContext,
    openAssistant,
    closeAssistant,
    openTaskAssistant,
    openGoalAssistant,
    generateWithAI
  };
}