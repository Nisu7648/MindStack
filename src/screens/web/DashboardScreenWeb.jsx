/**
 * DASHBOARD SCREEN - WEB VERSION
 * Main dashboard with overview and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardScreenWeb.css';
import integrationService from '../../services/integration/integrationService';

const DashboardScreenWeb = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const result = await integrationService.getDashboardData();
      
      if (result.success) {
        setDashboardData(result.dashboard);
      }
    } catch (error) {
      console.error('Load dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Dashboard</h1>
          <p className="subtitle">Welcome back! Here's your business overview</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={loadDashboardData}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="fas fa-rupee-sign"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              ₹{dashboardData?.todaySales?.toLocaleString('en-IN') || 0}
            </div>
            <div className="stat-label">Today's Sales</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <i className="fas fa-receipt"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{dashboardData?.billCount || 0}</div>
            <div className="stat-label">Bills Today</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {dashboardData?.lowStockItems?.length || 0}
            </div>
            <div className="stat-label">Low Stock Items</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {dashboardData?.recentEvents?.length || 0}
            </div>
            <div className="stat-label">Recent Activities</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="action-card" onClick={() => navigate('/pos')}>
            <i className="fas fa-cash-register"></i>
            <span>New Bill</span>
          </button>
          <button className="action-card" onClick={() => navigate('/inventory')}>
            <i className="fas fa-boxes"></i>
            <span>Inventory</span>
          </button>
          <button className="action-card" onClick={() => navigate('/day-close')}>
            <i className="fas fa-moon"></i>
            <span>Day Close</span>
          </button>
          <button className="action-card" onClick={() => navigate('/audit-trail')}>
            <i className="fas fa-history"></i>
            <span>Audit Trail</span>
          </button>
          <button className="action-card" onClick={() => navigate('/compliance')}>
            <i className="fas fa-check-circle"></i>
            <span>Compliance</span>
          </button>
          <button className="action-card" onClick={() => navigate('/reports')}>
            <i className="fas fa-chart-bar"></i>
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Low Stock Items */}
        <div className="content-card">
          <div className="card-header">
            <h3>Low Stock Alert</h3>
            <button className="btn-link" onClick={() => navigate('/inventory')}>
              View All
            </button>
          </div>
          <div className="card-body">
            {dashboardData?.lowStockItems?.length > 0 ? (
              <div className="low-stock-list">
                {dashboardData.lowStockItems.map((item, index) => (
                  <div key={index} className="low-stock-item">
                    <div className="item-info">
                      <div className="item-name">{item.item_name}</div>
                      <div className="item-stock">
                        Stock: {item.current_stock} {item.unit}
                      </div>
                    </div>
                    <div className="item-status danger">
                      <i className="fas fa-exclamation-circle"></i>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-check-circle"></i>
                <p>All items have sufficient stock</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="content-card">
          <div className="card-header">
            <h3>Recent Activities</h3>
            <button className="btn-link" onClick={() => navigate('/audit-trail')}>
              View All
            </button>
          </div>
          <div className="card-body">
            {dashboardData?.recentEvents?.length > 0 ? (
              <div className="activity-list">
                {dashboardData.recentEvents.map((event, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-circle"></i>
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">
                        {event.description}
                      </div>
                      <div className="activity-time">
                        {new Date(event.timestamp).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreenWeb;
