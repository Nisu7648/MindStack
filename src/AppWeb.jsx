/**
 * WEB APP COMPONENT
 * Main app for web/desktop with routing
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './AppWeb.css';

// Import web screens
import SignInScreenWeb from './screens/web/SignInScreenWeb';
import DashboardScreenWeb from './screens/web/DashboardScreenWeb';
import AuditTrailScreenWeb from './screens/web/AuditTrailScreenWeb';
import ComplianceReportScreenWeb from './screens/web/ComplianceReportScreenWeb';
import InventoryScreenWeb from './screens/web/InventoryScreenWeb';
import POSScreenWeb from './screens/web/POSScreenWeb';
import DayCloseScreenWeb from './screens/web/DayCloseScreenWeb';

// Import services
import { AuthService } from './services/AuthService';

const AppWeb = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading MindStack...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/signin"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <SignInScreenWeb />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <DashboardScreenWeb /> : <Navigate to="/signin" />
          }
        />
        <Route
          path="/pos"
          element={
            isAuthenticated ? <POSScreenWeb /> : <Navigate to="/signin" />
          }
        />
        <Route
          path="/inventory"
          element={
            isAuthenticated ? <InventoryScreenWeb /> : <Navigate to="/signin" />
          }
        />
        <Route
          path="/audit-trail"
          element={
            isAuthenticated ? <AuditTrailScreenWeb /> : <Navigate to="/signin" />
          }
        />
        <Route
          path="/compliance"
          element={
            isAuthenticated ? <ComplianceReportScreenWeb /> : <Navigate to="/signin" />
          }
        />
        <Route
          path="/day-close"
          element={
            isAuthenticated ? <DayCloseScreenWeb /> : <Navigate to="/signin" />
          }
        />

        {/* Default Route */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/signin"} />
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="not-found">
              <h1>404</h1>
              <p>Page not found</p>
              <a href="/dashboard">Go to Dashboard</a>
            </div>
          }
        />
      </Routes>
    </div>
  );
};

export default AppWeb;
