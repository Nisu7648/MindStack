/**
 * WEB ENTRY POINT
 * Main entry for web/desktop version
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppWeb from './AppWeb';
import './styles/global.css';

// Initialize services
import integrationService from './services/integration/integrationService';

const initializeApp = async () => {
  try {
    console.log('Initializing MindStack Web...');
    
    // Initialize all services
    const result = await integrationService.initialize();
    
    if (result.success) {
      console.log('✓ MindStack Web initialized successfully');
    } else {
      console.error('✗ Initialization failed:', result.error);
    }
  } catch (error) {
    console.error('✗ Initialization error:', error);
  }
};

// Initialize app
initializeApp();

// Render app
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWeb />
    </BrowserRouter>
  </React.StrictMode>
);
