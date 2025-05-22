import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthState } from '../hooks/useAuthState';

function Header() {
  const location = useLocation();
  const { signOut } = useAuthState();
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold text-blue-600">Life Coach AI</Link>
        </div>
        
        <nav className="flex items-center space-x-6">
          <Link 
            to="/" 
            className={`text-sm ${isActive('/') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/tasks" 
            className={`text-sm ${isActive('/tasks') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Tasks
          </Link>
          <Link 
            to="/goals" 
            className={`text-sm ${isActive('/goals') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Goals
          </Link>
          <Link 
            to="/analytics" 
            className={`text-sm ${isActive('/analytics') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Analytics
          </Link>
          <Link 
            to="/settings" 
            className={`text-sm ${isActive('/settings') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Settings
          </Link>
          <button 
            onClick={handleSignOut}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Header;