import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import GoalManager from '../components/GoalManager';

function GoalsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
      
      <div className="mt-6">
        <GoalManager />
      </div>
    </div>
  );
}

export default GoalsPage;