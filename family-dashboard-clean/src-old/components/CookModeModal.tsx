import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Check, Minimize2 } from 'lucide-react';
import { Recipe } from '../types/recipe';

interface CookModeModalProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export const CookModeModal: React.FC<CookModeModalProps> = ({ recipe, isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timer !== null && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev === null || prev <= 1) {
            setTimerActive(false);
            // Could add notification sound here
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (minutes: number) => {
    setTimer(minutes * 60);
    setTimerActive(true);
  };

  const toggleStepComplete = (step: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(step)) {
      newCompleted.delete(step);
    } else {
      newCompleted.add(step);
    }
    setCompletedSteps(newCompleted);
  };

  const nextStep = () => {
    if (currentStep < recipe.instructions.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-white border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{recipe.name}</h1>
            <p className="text-gray-600">Cook Mode</p>
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-4">
            {timer !== null && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                timerActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timer)}</span>
                {timerActive && (
                  <button
                    onClick={() => setTimerActive(false)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Pause
                  </button>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <button className="text-xs bg-blue-100 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-200">
                5 min
              </button>
              <button className="text-xs bg-blue-100 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-200">
                10 min
              </button>
              <button className="text-xs bg-blue-100 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-200">
                15 min
              </button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <Minimize2 className="w-4 h-4" />
            Exit Cook Mode
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-20">
        {/* Ingredients Sidebar */}
        <div className="w-1/3 bg-white p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Ingredients</h2>
          <div className="space-y-3">
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{ingredient.item}</div>
                  <div className="text-sm text-gray-600">{ingredient.quantity}</div>
                </div>
                <div className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  {ingredient.category}
                </div>
              </div>
            ))}
          </div>
          
          {/* Quick Timer Buttons */}
          <div className="mt-8">
            <h3 className="text-md font-semibold mb-3">Quick Timers</h3>
            <div className="grid grid-cols-2 gap-2">
              {[5, 10, 15, 20, 30, 45].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => startTimer(minutes)}
                  className="p-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions Main Area */}
        <div className="flex-1 bg-gray-50 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Step {currentStep} of {recipe.instructions.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="p-2 rounded-lg bg-white border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextStep}
                disabled={currentStep === recipe.instructions.length}
                className="p-2 rounded-lg bg-white border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Current Step */}
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-2xl text-center">
              <div className="flex items-center justify-center mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  completedSteps.has(currentStep) 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {completedSteps.has(currentStep) ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    currentStep
                  )}
                </div>
              </div>
              
              <p className="text-2xl leading-relaxed mb-8">
                {recipe.instructions.find(inst => inst.step === currentStep)?.instruction}
              </p>
              
              <button
                onClick={() => toggleStepComplete(currentStep)}
                className={`px-8 py-4 rounded-lg text-lg font-medium transition-colors ${
                  completedSteps.has(currentStep)
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {completedSteps.has(currentStep) ? 'Step Complete' : 'Mark Complete'}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm text-gray-600">
                {completedSteps.size}/{recipe.instructions.length} steps completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps.size / recipe.instructions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* All Steps Overview */}
          <div className="mt-6">
            <div className="grid grid-cols-6 gap-2">
              {recipe.instructions.map((instruction) => (
                <button
                  key={instruction.step}
                  onClick={() => setCurrentStep(instruction.step)}
                  className={`p-2 rounded text-xs transition-colors ${
                    instruction.step === currentStep
                      ? 'bg-blue-500 text-white'
                      : completedSteps.has(instruction.step)
                      ? 'bg-green-500 text-white'
                      : 'bg-white border text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {instruction.step}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};