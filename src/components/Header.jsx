import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthState } from '../hooks/useAuthState';

function Header() {
  const location = useLocation();
  const { signOut } = useAuthState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
          <Link to="/" className="text-lg font-bold text-blue-600 sm:text-xl">Life Coach AI</Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden items-center space-x-6 md:flex">
          <Link 
            to="/today" 
            className={`text-sm ${isActive('/today') || isActive('/') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Today
          </Link>
          <Link 
            to="/dashboard" 
            className={`text-sm ${isActive('/dashboard') ? 'font-medium text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
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

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 px-4 py-2 md:hidden">
          <Link
            to="/settings"
            className="block py-2 text-gray-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full py-2 text-left text-gray-600"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;