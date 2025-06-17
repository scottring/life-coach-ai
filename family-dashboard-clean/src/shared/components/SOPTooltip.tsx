import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline';

interface SOPTooltipProps {
  sopData: SOPData;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface SOPData {
  id: string;
  name: string;
  steps: SOPStep[];
  estimatedDuration: number;
  assignedTo?: string;
}

interface SOPStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  estimatedDuration: number;
  isOptional: boolean;
  type: 'standard' | 'embedded_sop' | 'list';
  listItems?: {
    id: string;
    text: string;
    isOptional: boolean;
  }[];
}

export const SOPTooltip: React.FC<SOPTooltipProps> = ({ 
  sopData, 
  children, 
  placement = 'top' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + 8;
          break;
      }

      // Ensure tooltip stays within viewport
      left = Math.max(8, Math.min(left, viewport.width - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, viewport.height - tooltipRect.height - 8));

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 1000
      });
    }
  }, [isVisible, placement]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          style={tooltipStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="mb-3">
            <h4 className="font-medium text-gray-900 text-sm">{sopData.name}</h4>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-xs text-gray-500 flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                {formatDuration(sopData.estimatedDuration)}
              </span>
              {sopData.assignedTo && (
                <span className="text-xs text-gray-500 flex items-center">
                  <UserIcon className="w-3 h-3 mr-1" />
                  {sopData.assignedTo}
                </span>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sopData.steps.slice(0, 5).map((step, index) => (
              <div key={step.id} className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 flex-shrink-0">
                  {step.stepNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900">
                    {step.title}
                    {step.isOptional && (
                      <span className="text-gray-400 font-normal"> (optional)</span>
                    )}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>
                  )}
                  {step.type === 'list' && step.listItems && (
                    <ul className="mt-1 space-y-0.5">
                      {step.listItems.slice(0, 3).map((item) => (
                        <li key={item.id} className="text-xs text-gray-600 flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></span>
                          {item.text}
                          {item.isOptional && <span className="text-gray-400"> (optional)</span>}
                        </li>
                      ))}
                      {step.listItems.length > 3 && (
                        <li className="text-xs text-gray-400">
                          +{step.listItems.length - 3} more items
                        </li>
                      )}
                    </ul>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDuration(step.estimatedDuration)}
                  </span>
                </div>
              </div>
            ))}
            
            {sopData.steps.length > 5 && (
              <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                +{sopData.steps.length - 5} more steps
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">Click to view full SOP details</p>
          </div>
        </div>
      )}
    </>
  );
};