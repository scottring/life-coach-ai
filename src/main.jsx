import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// For debugging
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Temporarily disable StrictMode for debugging
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);