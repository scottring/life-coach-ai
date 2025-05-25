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

  // Process natural language commands
  const processCommand = async (command, context = {}) => {
    try {
      const { tasks = [], events = [], createTask, updateTask, deleteTask } = context;
      
      const taskContext = {
        currentTasks: tasks.filter(t => t.status === 'pending').slice(0, 10),
        todayEvents: events.filter(e => {
          const eventDate = new Date(e.start);
          const today = new Date();
          return eventDate.toDateString() === today.toDateString();
        })
      };

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping manage tasks and calendar events. You can:
            - View current tasks and events
            - Create new tasks with specific deadlines and priorities
            - Mark tasks as complete
            - Delete tasks
            - Provide summaries of the day's activities
            
            Current context:
            Tasks: ${JSON.stringify(taskContext.currentTasks)}
            Today's Events: ${JSON.stringify(taskContext.todayEvents)}
            
            Respond with JSON in this format:
            {
              "action": "view" | "create" | "update" | "delete" | "summary",
              "data": { ... },
              "message": "Human-friendly response"
            }`
          },
          {
            role: 'user',
            content: command
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content || '';
      const parsed = JSON.parse(response);

      // Execute the action if handlers are provided
      if (createTask || updateTask || deleteTask) {
        switch (parsed.action) {
          case 'create':
            if (parsed.data.title && createTask) {
              await createTask({
                title: parsed.data.title,
                description: parsed.data.description || '',
                deadline: parsed.data.deadline || null,
                priority: parsed.data.priority || 3,
                context: parsed.data.context || 'Personal',
                status: 'pending'
              });
            }
            break;

          case 'update':
            if (parsed.data.taskId && updateTask) {
              await updateTask(parsed.data.taskId, parsed.data.updates);
            }
            break;

          case 'delete':
            if (parsed.data.taskId && deleteTask) {
              await deleteTask(parsed.data.taskId);
            }
            break;
        }
      }

      return parsed.message;
    } catch (error) {
      console.error('Error processing command:', error);
      return 'I had trouble understanding that command. Try asking me to view tasks, create a new task, or mark a task as complete.';
    }
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
    generateWithAI,
    processCommand
  };
}