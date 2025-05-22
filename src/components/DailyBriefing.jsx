import React from 'react';

function DailyBriefing({ briefing }) {
  if (!briefing) {
    return (
      <div className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
        <h2 className="text-xl font-semibold">Daily Briefing</h2>
        <p className="mt-2">Your personalized briefing is being prepared...</p>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
      <h2 className="text-xl font-semibold">Daily Briefing</h2>
      <div className="mt-4 space-y-4">
        {briefing.summary && (
          <div>
            <p className="text-sm text-blue-100">SUMMARY</p>
            <p>{briefing.summary}</p>
          </div>
        )}
        
        {briefing.focusAreas && (
          <div>
            <p className="text-sm text-blue-100">FOCUS AREAS</p>
            <ul className="ml-4 list-disc">
              {briefing.focusAreas.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </ul>
          </div>
        )}
        
        {briefing.insights && (
          <div>
            <p className="text-sm text-blue-100">INSIGHTS</p>
            <p>{briefing.insights}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyBriefing;