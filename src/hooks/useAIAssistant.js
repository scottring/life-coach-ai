import { useState } from 'react';

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

  return {
    isAssistantOpen,
    assistantContext,
    openAssistant,
    closeAssistant,
    openTaskAssistant,
    openGoalAssistant
  };
}